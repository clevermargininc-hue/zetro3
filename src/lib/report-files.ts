import ExcelJS from "exceljs";
import { formatAht } from "@/lib/format";
import { BRAND, hex } from "@/lib/brand";
import {
  addTableRow,
  brandBanner,
  finishSheet,
  headerRow,
  paintScoreCell,
  setTableColumns,
  styleBody,
  tableCol,
  XLSX_DATA_ROW,
  XLSX_HEADER_ROW,
} from "@/lib/xlsx-brand";
import {
  auditModeLabel,
  formatReportDate,
  reportFileStem,
  verdictCell,
  type QaReport,
} from "@/lib/reports";

function dash(value: number | string | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

function pct(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value}%`;
}

function titleBlock(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  report: QaReport,
  caption: string,
  lastColumn: number,
  freezeHeader = true,
) {
  return brandBanner(
    workbook,
    sheet,
    `${caption}  ·  ${report.period_label}`,
    `${report.agent_label}  ·  ${report.range_start} – ${report.range_end}  ·  Africa/Nairobi  ·  ${formatReportDate(report.generated_at)}`,
    lastColumn,
    freezeHeader,
  );
}

export async function excelBuffer(report: QaReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Zetro";
  wb.created = new Date(report.generated_at);

  const s = report.summary;
  const briefing = report.briefing;

  if (briefing) {
    const brief = wb.addWorksheet("Briefing", {
      views: [{ showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1 },
    });
    setTableColumns(brief, [28, 56]);
    const headerAt = titleBlock(wb, brief, report, "QA briefing", 2);
    headerRow(brief, ["Item", "Detail"], headerAt);
    addTableRow(brief, ["Headline", briefing.headline]);
    addTableRow(brief, ["Do this", briefing.attention]);
    if (briefing.previous_period_label) {
      addTableRow(brief, ["Compared with", briefing.previous_period_label]);
    }
    addTableRow(brief, [
      "Average score",
      `${dash(briefing.deltas.avg_overall.current)} (was ${dash(briefing.deltas.avg_overall.previous)})`,
    ]);
    addTableRow(brief, [
      "Calls audited",
      `${dash(briefing.deltas.calls_audited.current)} (was ${dash(briefing.deltas.calls_audited.previous)})`,
    ]);
    addTableRow(brief, [
      "Compliance followed",
      `${pct(s.compliance_followed_pct)} (was ${pct(briefing.deltas.compliance_followed.previous)})`,
    ]);
    addTableRow(brief, [
      "Compliance not followed",
      pct(s.compliance_not_followed_pct),
    ]);
    addTableRow(brief, [
      "Coach now",
      briefing.coach_now.map((row) => `${row.agent_name}: ${row.reason}`).join(" • ") || "—",
    ]);
    addTableRow(brief, [
      "Review queue",
      briefing.review_queue.map((row) => `${row.title} (${row.overall_score}%): ${row.reason}`).join(" • ") || "—",
    ]);
    addTableRow(brief, [
      "Customer themes",
      briefing.customer_themes.map((row) => `${row.theme} ×${row.count}`).join(" • ") || "—",
    ]);
    styleBody(brief, headerAt + 1, 2);
    finishSheet(brief, 2);
  }

  const summary = wb.addWorksheet("Summary", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1 },
  });
  setTableColumns(summary, [28, 22, 22, 22]);
  const summaryStart = titleBlock(wb, summary, report, "Quality operations", 4, false);

  const kpis: [string, string | number][] = [
    ["Calls audited", s.calls_audited],
    ["Average overall score", s.avg_overall ?? "—"],
    ["Average handle time", formatAht(s.aht_seconds)],
    ["Total talk time", formatAht(s.total_handling_seconds)],
  ];
  const kpiLabels = summary.getRow(summaryStart);
  const kpiValues = summary.getRow(summaryStart + 1);
  kpiLabels.height = 20;
  kpiValues.height = 32;
  kpis.forEach(([label, value], index) => {
    const labelCell = kpiLabels.getCell(tableCol(index));
    labelCell.value = label;
    labelCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: `FF${hex(BRAND.blue)}` } };
    labelCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    const valueCell = kpiValues.getCell(tableCol(index));
    valueCell.value = value;
    valueCell.font = { name: "Calibri", size: 20, bold: true, color: { argb: `FF${hex(BRAND.ink)}` } };
    valueCell.alignment = { vertical: "middle", horizontal: "center" };
    valueCell.border = { bottom: { style: "medium", color: { argb: `FF${hex(BRAND.blue)}` } } };
  });
  summary.getRow(summaryStart + 2).height = 14;

  headerRow(summary, ["Metric", "Value", "Metric", "Value"], summaryStart + 3);
  const metrics: [string, string | number][] = [
    ["Average greeting", s.avg_greeting ?? "—"],
    ["Average empathy", s.avg_empathy ?? "—"],
    ["Average professionalism", s.avg_professionalism ?? "—"],
    ["Average resolution", s.avg_resolution ?? "—"],
    ["Average communication", s.avg_communication ?? "—"],
    ["Average language mix", s.avg_language_handling ?? "—"],
    ["Excellent", s.excellent],
    ["Good", s.good],
    ["Needs improvement", s.needs_improvement],
    ["Poor", s.poor],
    ["Compliance followed %", s.compliance_followed_pct ?? "—"],
    ["Compliance not followed %", s.compliance_not_followed_pct ?? "—"],
    ["Documents audits", s.documents_audits],
    ["Satisfied customers %", s.customer_satisfied_pct ?? "—"],
    ["Frustrated customers %", s.customer_frustrated_pct ?? "—"],
    ["Customer reactions analyzed", s.customer_analyzed],
  ];
  const metricMid = Math.ceil(metrics.length / 2);
  for (let i = 0; i < metricMid; i++) {
    addTableRow(summary, [...metrics[i], ...(metrics[i + metricMid] || ["", ""])]);
  }
  const summaryData = summaryStart + 4;
  styleBody(summary, summaryData, 4);
  for (let i = summaryData; i <= summaryData + 5; i++) {
    paintScoreCell(summary.getRow(i).getCell(tableCol(1)));
  }
  finishSheet(summary, 4, false);

  const scores = wb.addWorksheet("Scores", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });
  setTableColumns(scores, [20, 16, 10, 10, 11, 11, 15, 12, 15, 14, 18, 14, 13, 12, 14, 36]);
  titleBlock(wb, scores, report, "Call scores", 16);
  headerRow(scores, [
    "Audited at",
    "Agent",
    "AHT",
    "Overall",
    "Greeting",
    "Empathy",
    "Professionalism",
    "Resolution",
    "Communication",
    "Language mix",
    "Verdict",
    "Sentiment",
    "Audit path",
    "Followed %",
    "Not followed %",
    "Summary",
  ]);
  for (const row of report.calls) {
    addTableRow(scores, [
      formatReportDate(row.audited_at),
      row.agent_name,
      formatAht(row.duration_seconds),
      row.overall_score,
      row.greeting ?? "—",
      row.empathy ?? "—",
      row.professionalism ?? "—",
      row.resolution ?? "—",
      row.communication ?? "—",
      row.language_handling ?? "—",
      verdictCell(String(row.verdict)),
      dash(row.customer_sentiment),
      auditModeLabel(row.audit_mode),
      pct(row.compliance_followed_pct),
      pct(row.compliance_not_followed_pct),
      dash(row.summary),
    ]);
  }
  styleBody(scores, XLSX_DATA_ROW, 16);
  for (let i = XLSX_DATA_ROW; i <= scores.rowCount; i++) {
    paintScoreCell(scores.getRow(i).getCell(tableCol(3)));
  }
  if (report.calls.length) {
    scores.autoFilter = {
      from: { row: XLSX_HEADER_ROW, column: tableCol(0) },
      to: { row: XLSX_HEADER_ROW, column: tableCol(15) },
    };
  }
  finishSheet(scores, 16);

  const customers = wb.addWorksheet("Customers", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });
  setTableColumns(customers, [14, 22, 18, 14, 40, 36, 40]);
  titleBlock(wb, customers, report, "Customer voice", 7);
  headerRow(customers, ["Type", "Audited at", "Agent", "Stance", "Themes", "Note", "Quote"]);
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
      addTableRow(customers, [
        row.type,
        formatReportDate(row.audited_at),
        row.agent_name,
        row.stance,
        row.themes.join("; "),
        row.note || "—",
        row.quote || "—",
      ]);
    }
  } else {
    addTableRow(customers, ["—", "—", "—", "—", "No customer voice themes in this period.", "—", "—"]);
  }
  styleBody(customers, XLSX_DATA_ROW, 7);
  finishSheet(customers, 7);

  const agents = wb.addWorksheet("Agents", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });
  setTableColumns(agents, [18, 14, 14, 12, 14, 12, 10, 20, 10, 18, 18]);
  titleBlock(wb, agents, report, "Performance by agent", 11);
  headerRow(agents, [
    "Agent",
    "Calls audited",
    "Average score",
    "AHT",
    "Talk time",
    "Excellent",
    "Good",
    "Needs improvement",
    "Poor",
    "Followed %",
    "Not followed %",
  ]);
  for (const row of report.agents) {
    addTableRow(agents, [
      row.agent_name,
      row.call_count,
      row.avg_score ?? "—",
      formatAht(row.aht_seconds),
      formatAht(row.total_handling_seconds),
      row.excellent,
      row.good,
      row.needs_improvement,
      row.poor,
      pct(row.compliance_followed_pct),
      pct(row.compliance_not_followed_pct),
    ]);
  }
  styleBody(agents, XLSX_DATA_ROW, 11);
  for (let i = XLSX_DATA_ROW; i <= agents.rowCount; i++) {
    paintScoreCell(agents.getRow(i).getCell(tableCol(2)));
  }
  finishSheet(agents, 11);

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

export function exportFilename(report: QaReport, ext: "xlsx") {
  return `${reportFileStem(report)}.${ext}`;
}
