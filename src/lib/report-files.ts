import ExcelJS from "exceljs";
import { formatAht } from "@/lib/format";
import {
  addBrandBanner,
  addKpiCards,
  addSectionHeader,
  addTableHeader,
  addTableSummaryRow,
  createWorksheet,
  finalizeWorksheet,
  styleTableRow,
  type ColumnDef,
} from "@/lib/xlsx-brand";
import {
  auditModeLabel,
  formatReportDate,
  reportFileStem,
  verdictCell,
  type QaReport,
} from "@/lib/reports";

function signed(delta: number) {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

export async function excelBuffer(report: QaReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Zetro QA";
  wb.created = new Date(report.generated_at);

  const s = report.summary;
  const briefing = report.briefing;
  const sub = `${report.agent_label}  ·  ${report.range_start} – ${report.range_end}  ·  Timezone: Africa/Nairobi  ·  Generated: ${formatReportDate(report.generated_at)}`;

  // =========================================================================
  // 1. EXECUTIVE BRIEFING SHEET
  // =========================================================================
  if (briefing) {
    const briefSheet = createWorksheet(wb, "Executive Briefing", "portrait");
    const briefBannerEnd = addBrandBanner(
      briefSheet,
      `QA BRIEFING · ${report.period_label}`,
      sub,
      4
    );

    // KPI Summary Cards
    const d = briefing.deltas;
    const nextRow = addKpiCards(briefSheet, briefBannerEnd, [
      {
        label: "Average Score",
        value: d.avg_overall.current != null ? `${d.avg_overall.current}%` : "—",
        note: d.avg_overall.delta != null ? `${signed(d.avg_overall.delta)} pts vs prior` : "First period",
      },
      {
        label: "Calls Audited",
        value: d.calls_audited.current ?? 0,
        note: d.calls_audited.delta != null ? `${signed(d.calls_audited.delta)} vs prior` : "First period",
      },
      {
        label: "Compliance Followed",
        value: s.compliance_followed_pct != null ? `${s.compliance_followed_pct}%` : "—",
        note: d.compliance_followed.delta != null ? `${signed(d.compliance_followed.delta)} pts vs prior` : "",
      },
      {
        label: "Avg Handle Time",
        value: formatAht(s.aht_seconds),
        note: `Total: ${formatAht(s.total_handling_seconds)}`,
      },
    ]);

    // Headline & Key Finding
    let curRow = nextRow;
    curRow = addSectionHeader(briefSheet, curRow, "Key Operational Findings", 4);
    const headlineRow = briefSheet.getRow(curRow);
    headlineRow.height = 24;
    briefSheet.mergeCells(`A${curRow}:D${curRow}`);
    const hCell = headlineRow.getCell(1);
    hCell.value = briefing.headline;
    hCell.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FF0F172A" } };
    hCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    curRow++;

    if (briefing.attention) {
      const attnRow = briefSheet.getRow(curRow);
      attnRow.height = 22;
      briefSheet.mergeCells(`A${curRow}:D${curRow}`);
      const aCell = attnRow.getCell(1);
      aCell.value = `Recommended Action: ${briefing.attention}`;
      aCell.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF475569" } };
      aCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      curRow++;
    }
    curRow++; // Spacing

    // Coaching Priority Queue
    curRow = addSectionHeader(briefSheet, curRow, "Immediate Coaching Queue", 4);
    const coachCols: ColumnDef[] = [
      { header: "Agent Name", width: 22, align: "left" },
      { header: "Avg Score", width: 14, align: "center", isScore: true },
      { header: "Priority Coaching Focus", width: 55, align: "left", wrapText: true },
      { header: "Recommended Step", width: 35, align: "left", wrapText: true },
    ];
    addTableHeader(briefSheet, curRow, coachCols);
    const coachHeaderRow = curRow;
    curRow++;

    if (briefing.coach_now.length) {
      const startData = curRow;
      briefing.coach_now.forEach((coach) => {
        const row = briefSheet.addRow([
          coach.agent_name,
          coach.avg_score != null ? coach.avg_score : "",
          coach.reason,
          "Conduct 1-on-1 scorecard review",
        ]);
        styleTableRow(row, coachCols, curRow, startData);
        curRow++;
      });
    } else {
      const row = briefSheet.addRow(["No immediate coaching flags in this window.", "", "", ""]);
      briefSheet.mergeCells(`A${curRow}:D${curRow}`);
      row.getCell(1).font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF64748B" } };
      curRow++;
    }
    curRow++; // Spacing

    // Weakest Skills Table
    if (briefing.weakest_parameters.length) {
      curRow = addSectionHeader(briefSheet, curRow, "Lowest Scorecard Skill Areas", 4);
      const skillCols: ColumnDef[] = [
        { header: "Scorecard Parameter", width: 28, align: "left" },
        { header: "Average Score", width: 16, align: "center", isScore: true },
        { header: "Status", width: 20, align: "center" },
        { header: "Suggested Focus", width: 55, align: "left" },
      ];
      addTableHeader(briefSheet, curRow, skillCols);
      const startData = curRow + 1;
      curRow++;
      briefing.weakest_parameters.forEach((param) => {
        const status = param.avg >= 85 ? "On Target" : param.avg >= 70 ? "Needs Review" : "Critical Focus";
        const row = briefSheet.addRow([
          param.name,
          param.avg,
          status,
          `Review policy guidelines and training samples for ${param.name}`,
        ]);
        styleTableRow(row, skillCols, curRow, startData);
        curRow++;
      });
    }

    finalizeWorksheet(briefSheet, coachHeaderRow, 4, false);
  }

  // =========================================================================
  // 2. SCORES & CALL LOGS SHEET (THE DATA ENGINE)
  // =========================================================================
  const scoresSheet = createWorksheet(wb, "Call Scores Log", "landscape");
  const scoresBannerEnd = addBrandBanner(
    scoresSheet,
    `CALL AUDIT SCORES · ${report.period_label}`,
    sub,
    16
  );

  const scoreColumns: ColumnDef[] = [
    { header: "Audited Date", width: 18, align: "center" },
    { header: "Agent Name", width: 20, align: "left" },
    { header: "Duration", width: 12, align: "center" },
    { header: "Overall Score", width: 14, align: "center", isScore: true },
    { header: "Greeting", width: 12, align: "center", isScore: true },
    { header: "Empathy", width: 12, align: "center", isScore: true },
    { header: "Professionalism", width: 15, align: "center", isScore: true },
    { header: "Resolution", width: 13, align: "center", isScore: true },
    { header: "Communication", width: 15, align: "center", isScore: true },
    { header: "Language Mix", width: 14, align: "center", isScore: true },
    { header: "Verdict", width: 14, align: "center" },
    { header: "Sentiment", width: 14, align: "center" },
    { header: "Audit Path", width: 15, align: "center" },
    { header: "Followed %", width: 14, align: "center", isPct: true },
    { header: "Not Followed %", width: 16, align: "center", isPct: true },
    { header: "Executive Summary", width: 45, align: "left", wrapText: true },
  ];

  addTableHeader(scoresSheet, scoresBannerEnd, scoreColumns);
  const startScoresData = scoresBannerEnd + 1;
  let scoreRowIdx = startScoresData;

  for (const row of report.calls) {
    const r = scoresSheet.addRow([
      formatReportDate(row.audited_at),
      row.agent_name,
      formatAht(row.duration_seconds),
      row.overall_score,
      row.greeting != null ? row.greeting : "",
      row.empathy != null ? row.empathy : "",
      row.professionalism != null ? row.professionalism : "",
      row.resolution != null ? row.resolution : "",
      row.communication != null ? row.communication : "",
      row.language_handling != null ? row.language_handling : "",
      verdictCell(String(row.verdict)),
      row.customer_sentiment || "—",
      auditModeLabel(row.audit_mode),
      row.compliance_followed_pct != null ? row.compliance_followed_pct / 100 : "",
      row.compliance_not_followed_pct != null ? row.compliance_not_followed_pct / 100 : "",
      row.summary || "—",
    ]);
    styleTableRow(r, scoreColumns, scoreRowIdx, startScoresData);
    scoreRowIdx++;
  }

  // Summary row with native formulas
  if (report.calls.length > 0) {
    const endRow = scoreRowIdx - 1;
    addTableSummaryRow(scoresSheet, scoreRowIdx, [
      { col: 1, value: "SUMMARY AVERAGE" },
      { col: 2, formula: `=COUNTA(B${startScoresData}:B${endRow}) & " Calls"` },
      { col: 4, formula: `=AVERAGE(D${startScoresData}:D${endRow})`, isScore: true },
      { col: 5, formula: `=AVERAGE(E${startScoresData}:E${endRow})`, isScore: true },
      { col: 6, formula: `=AVERAGE(F${startScoresData}:F${endRow})`, isScore: true },
      { col: 7, formula: `=AVERAGE(G${startScoresData}:G${endRow})`, isScore: true },
      { col: 8, formula: `=AVERAGE(H${startScoresData}:H${endRow})`, isScore: true },
      { col: 9, formula: `=AVERAGE(I${startScoresData}:I${endRow})`, isScore: true },
      { col: 10, formula: `=AVERAGE(J${startScoresData}:J${endRow})`, isScore: true },
      { col: 14, formula: `=AVERAGE(N${startScoresData}:N${endRow})`, isPct: true },
      { col: 15, formula: `=AVERAGE(O${startScoresData}:O${endRow})`, isPct: true },
    ]);
  }

  finalizeWorksheet(scoresSheet, scoresBannerEnd, scoreColumns.length, true);

  // =========================================================================
  // 3. AGENT PERFORMANCE SHEET
  // =========================================================================
  const agentsSheet = createWorksheet(wb, "Agent Performance", "landscape");
  const agentsBannerEnd = addBrandBanner(
    agentsSheet,
    `AGENT PERFORMANCE BREAKDOWN · ${report.period_label}`,
    sub,
    11
  );

  const agentColumns: ColumnDef[] = [
    { header: "Agent Name", width: 22, align: "left" },
    { header: "Calls Audited", width: 14, align: "center" },
    { header: "Average Score", width: 15, align: "center", isScore: true },
    { header: "Avg Handle Time", width: 15, align: "center" },
    { header: "Total Talk Time", width: 16, align: "center" },
    { header: "Excellent (≥85)", width: 15, align: "center" },
    { header: "Good (70-84)", width: 14, align: "center" },
    { header: "Needs Imp (50-69)", width: 16, align: "center" },
    { header: "Poor (<50)", width: 12, align: "center" },
    { header: "Followed %", width: 14, align: "center", isPct: true },
    { header: "Not Followed %", width: 16, align: "center", isPct: true },
  ];

  addTableHeader(agentsSheet, agentsBannerEnd, agentColumns);
  const startAgentsData = agentsBannerEnd + 1;
  let agentRowIdx = startAgentsData;

  for (const row of report.agents) {
    const r = agentsSheet.addRow([
      row.agent_name,
      row.call_count,
      row.avg_score != null ? row.avg_score : "",
      formatAht(row.aht_seconds),
      formatAht(row.total_handling_seconds),
      row.excellent,
      row.good,
      row.needs_improvement,
      row.poor,
      row.compliance_followed_pct != null ? row.compliance_followed_pct / 100 : "",
      row.compliance_not_followed_pct != null ? row.compliance_not_followed_pct / 100 : "",
    ]);
    styleTableRow(r, agentColumns, agentRowIdx, startAgentsData);
    agentRowIdx++;
  }

  if (report.agents.length > 0) {
    const endRow = agentRowIdx - 1;
    addTableSummaryRow(agentsSheet, agentRowIdx, [
      { col: 1, value: "TOTALS / AVERAGE" },
      { col: 2, formula: `=SUM(B${startAgentsData}:B${endRow})` },
      { col: 3, formula: `=AVERAGE(C${startAgentsData}:C${endRow})`, isScore: true },
      { col: 6, formula: `=SUM(F${startAgentsData}:F${endRow})` },
      { col: 7, formula: `=SUM(G${startAgentsData}:G${endRow})` },
      { col: 8, formula: `=SUM(H${startAgentsData}:H${endRow})` },
      { col: 9, formula: `=SUM(I${startAgentsData}:I${endRow})` },
      { col: 10, formula: `=AVERAGE(J${startAgentsData}:J${endRow})`, isPct: true },
      { col: 11, formula: `=AVERAGE(K${startAgentsData}:K${endRow})`, isPct: true },
    ]);
  }

  finalizeWorksheet(agentsSheet, agentsBannerEnd, agentColumns.length, true);

  // =========================================================================
  // 4. CUSTOMER VOICE & THEMES SHEET
  // =========================================================================
  const customerSheet = createWorksheet(wb, "Customer Voice", "landscape");
  const custBannerEnd = addBrandBanner(
    customerSheet,
    `CUSTOMER VOICE & THEMES · ${report.period_label}`,
    sub,
    7
  );

  const customerColumns: ColumnDef[] = [
    { header: "Type", width: 14, align: "center" },
    { header: "Audited Date", width: 18, align: "center" },
    { header: "Agent Name", width: 20, align: "left" },
    { header: "Customer Stance", width: 16, align: "center" },
    { header: "Customer Themes", width: 32, align: "left" },
    { header: "QA Observation Note", width: 42, align: "left", wrapText: true },
    { header: "Verbatim Customer Quote", width: 45, align: "left", wrapText: true },
  ];

  addTableHeader(customerSheet, custBannerEnd, customerColumns);
  const startCustData = custBannerEnd + 1;
  let custRowIdx = startCustData;

  const voiceRows = [
    ...(report.customer_voice?.satisfactions || []).map((row) => ({
      type: "Satisfied",
      ...row,
    })),
    ...(report.customer_voice?.frustrations || []).map((row) => ({
      type: "Frustrated",
      ...row,
    })),
  ];

  if (voiceRows.length) {
    for (const row of voiceRows) {
      const r = customerSheet.addRow([
        row.type,
        formatReportDate(row.audited_at),
        row.agent_name,
        row.stance,
        row.themes.join("; "),
        row.note || "—",
        row.quote || "—",
      ]);
      styleTableRow(r, customerColumns, custRowIdx, startCustData);
      custRowIdx++;
    }
  } else {
    const r = customerSheet.addRow([
      "—",
      "—",
      "—",
      "—",
      "No customer voice themes recorded for this window.",
      "—",
      "—",
    ]);
    styleTableRow(r, customerColumns, custRowIdx, startCustData);
  }

  finalizeWorksheet(customerSheet, custBannerEnd, customerColumns.length, true);

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

export function exportFilename(report: QaReport, ext: "xlsx") {
  return `${reportFileStem(report)}.${ext}`;
}

