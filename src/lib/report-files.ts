import ExcelJS from "exceljs";
import { formatAht } from "@/lib/format";
import { BRAND, hex, scoreBand } from "@/lib/brand";
import { brandBanner, headerRow, paintScoreCell, styleBody } from "@/lib/xlsx-brand";
import { PdfDoc, type Column } from "@/lib/pdf-doc";
import {
  auditModeLabel,
  formatReportDate,
  reportFileStem,
  scoreLabel,
  verdictCell,
  type QaReport,
} from "@/lib/reports";

function dash(value: number | string | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

// ---------------------------------------------------------------------- Excel

/** Banner shared by every sheet in the QA workbook. */
function titleBlock(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  report: QaReport,
  caption: string,
  lastColumn: number,
) {
  brandBanner(
    workbook,
    sheet,
    `${caption} · ${report.period_label}`,
    `${report.agent_label} · ${report.range_start} to ${report.range_end} (Africa/Nairobi)` +
      ` · Generated ${formatReportDate(report.generated_at)}`,
    lastColumn,
  );
}

export async function excelBuffer(report: QaReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Zetro";
  wb.created = new Date(report.generated_at);

  const s = report.summary;

  // ---- Summary -------------------------------------------------------------
  const summary = wb.addWorksheet("Summary", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1 },
  });
  summary.columns = [{ width: 42 }, { width: 26 }, { width: 26 }, { width: 26 }];
  titleBlock(wb, summary, report, "Quality operations report", 4);

  const kpis: [string, string | number][] = [
    ["Calls audited", s.calls_audited],
    ["Average overall score", s.avg_overall ?? "—"],
    ["Average handle time", formatAht(s.aht_seconds)],
    ["Total talk time", formatAht(s.total_handling_seconds)],
  ];
  const kpiLabels = summary.getRow(5);
  const kpiValues = summary.getRow(6);
  kpiLabels.height = 16;
  kpiValues.height = 26;
  kpis.forEach(([label, value], index) => {
    const labelCell = kpiLabels.getCell(index + 1);
    labelCell.value = label.toUpperCase();
    labelCell.font = { name: "Segoe UI", size: 8, bold: true, color: { argb: `FF${hex(BRAND.slate)}` } };
    const valueCell = kpiValues.getCell(index + 1);
    valueCell.value = value;
    valueCell.font = { name: "Segoe UI", size: 18, bold: true, color: { argb: `FF${hex(BRAND.ink)}` } };
    valueCell.border = { bottom: { style: "thin", color: { argb: `FF${hex(BRAND.blue)}` } } };
  });
  summary.getRow(7).height = 8;

  headerRow(summary, ["Metric", "Value"], 8);
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
    ["Calls with compliance issues", s.calls_with_compliance_issue],
    ["Compliance findings", s.total_compliance_findings],
    ["Documents audits", s.documents_audits],
    ["Satisfied customers %", s.customer_satisfied_pct ?? "—"],
    ["Frustrated customers %", s.customer_frustrated_pct ?? "—"],
    ["Customer reactions analyzed", s.customer_analyzed],
  ];
  metrics.forEach((row) => summary.addRow(row));
  styleBody(summary, 9);
  summary.getColumn(2).alignment = { horizontal: "right", vertical: "top" };
  for (let i = 9; i <= 14; i++) {
    paintScoreCell(summary.getRow(i).getCell(2));
  }

  // ---- Scores --------------------------------------------------------------
  const scores = wb.addWorksheet("Scores", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 6 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });
  scores.columns = [
    { width: 20 },
    { width: 14 },
    { width: 10 },
    { width: 10 },
    { width: 11 },
    { width: 11 },
    { width: 15 },
    { width: 12 },
    { width: 15 },
    { width: 14 },
    { width: 18 },
    { width: 14 },
    { width: 13 },
    { width: 42 },
    { width: 60 },
  ];
  titleBlock(wb, scores, report, "Evaluated call scores", 15);
  headerRow(
    scores,
    [
      "Audited at",
      "Agent ID",
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
      "Compliance findings",
      "Summary",
    ],
    6,
  );
  for (const row of report.calls) {
    scores.addRow([
      formatReportDate(row.audited_at),
      row.title,
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
      row.compliance_findings.join(" • ") || "None identified",
      dash(row.summary),
    ]);
  }
  styleBody(scores, 7);
  for (let i = 7; i <= scores.rowCount; i++) {
    paintScoreCell(scores.getRow(i).getCell(4));
  }
  if (report.calls.length) {
    scores.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: 15 } };
  }

  // ---- Compliance ----------------------------------------------------------
  const compliance = wb.addWorksheet("Compliance", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 6 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });
  compliance.columns = [{ width: 20 }, { width: 14 }, { width: 96 }];
  titleBlock(wb, compliance, report, "Compliance findings", 3);
  headerRow(compliance, ["Audited at", "Agent ID", "Compliance finding"], 6);
  if (report.compliance.length) {
    for (const row of report.compliance) {
      compliance.addRow([formatReportDate(row.audited_at), row.title, row.finding]);
    }
  } else {
    compliance.addRow(["—", "—", "No compliance findings in this period."]);
  }
  styleBody(compliance, 7);

  // ---- Customers -----------------------------------------------------------
  const customers = wb.addWorksheet("Customers", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 6 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });
  customers.columns = [
    { width: 14 },
    { width: 20 },
    { width: 14 },
    { width: 12 },
    { width: 48 },
    { width: 42 },
    { width: 48 },
  ];
  titleBlock(wb, customers, report, "Customer satisfaction & frustration", 7);
  headerRow(
    customers,
    ["Type", "Audited at", "Agent ID", "Stance", "Themes", "Note", "Quote"],
    6,
  );
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
      customers.addRow([
        row.type,
        formatReportDate(row.audited_at),
        row.title,
        row.stance,
        row.themes.join("; "),
        row.note || "—",
        row.quote || "—",
      ]);
    }
  } else {
    customers.addRow(["—", "—", "—", "—", "No customer voice themes in this period.", "—", "—"]);
  }
  styleBody(customers, 7);

  // ---- Agent IDs -----------------------------------------------------------
  const agents = wb.addWorksheet("Agent IDs", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 6 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });
  agents.columns = [
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 12 },
    { width: 10 },
    { width: 20 },
    { width: 10 },
    { width: 26 },
    { width: 20 },
  ];
  titleBlock(wb, agents, report, "Performance by agent ID", 11);
  headerRow(
    agents,
    [
      "Agent ID",
      "Calls audited",
      "Average score",
      "AHT",
      "Talk time",
      "Excellent",
      "Good",
      "Needs improvement",
      "Poor",
      "Calls with compliance issues",
      "Compliance findings",
    ],
    6,
  );
  for (const row of report.agents) {
    agents.addRow([
      row.agent_name,
      row.call_count,
      row.avg_score ?? "—",
      formatAht(row.aht_seconds),
      formatAht(row.total_handling_seconds),
      row.excellent,
      row.good,
      row.needs_improvement,
      row.poor,
      row.compliance_calls,
      row.compliance_findings,
    ]);
  }
  styleBody(agents, 7);
  for (let i = 7; i <= agents.rowCount; i++) {
    paintScoreCell(agents.getRow(i).getCell(3));
  }

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

// ------------------------------------------------------------------------ PDF

const scoreColor = (raw: string) => scoreBand(Number.parseInt(raw, 10) || null).color;

export function pdfBuffer(report: QaReport): Buffer {
  const doc = new PdfDoc({
    title: "Quality operations report",
    subtitle: report.period_label,
    footerNote: `Zetro · ${report.agent_label} · ${report.range_start} to ${report.range_end}`,
  });
  const s = report.summary;

  doc.line("Scope", report.agent_label);
  doc.line("Range", `${report.range_start} to ${report.range_end} (Africa/Nairobi)`);
  doc.line("Generated", formatReportDate(report.generated_at));
  doc.gap(14);

  doc.cards([
    { label: "Calls audited", value: String(s.calls_audited), hint: "Completed evaluations" },
    { label: "Average score", value: scoreLabel(s.avg_overall), hint: scoreBand(s.avg_overall).label },
    { label: "Avg handle time", value: formatAht(s.aht_seconds), hint: "Per audited call" },
    {
      label: "Compliance",
      value: String(s.total_compliance_findings),
      hint: `${s.calls_with_compliance_issue} calls flagged`,
    },
  ]);
  doc.gap(6);

  doc.heading("Quality breakdown");
  doc.grid(
    [
      { header: "Parameter", width: 300 },
      { header: "Average", width: 110, align: "right", bold: true, color: scoreColor },
      { header: "Band", width: 105, align: "right" },
    ],
    [
      ["Greeting & identity", scoreLabel(s.avg_greeting), scoreBand(s.avg_greeting).label],
      ["Empathy & active listening", scoreLabel(s.avg_empathy), scoreBand(s.avg_empathy).label],
      ["Professional demeanor", scoreLabel(s.avg_professionalism), scoreBand(s.avg_professionalism).label],
      ["Issue resolution", scoreLabel(s.avg_resolution), scoreBand(s.avg_resolution).label],
      ["Communication clarity", scoreLabel(s.avg_communication), scoreBand(s.avg_communication).label],
      ["Language mix handling", scoreLabel(s.avg_language_handling), scoreBand(s.avg_language_handling).label],
    ],
  );
  doc.gap(16);

  doc.heading("Verdict mix");
  doc.grid(
    [
      { header: "Verdict", width: 300 },
      { header: "Calls", width: 110, align: "right", bold: true },
      { header: "Share", width: 105, align: "right" },
    ],
    (
      [
        ["Excellent", s.excellent],
        ["Good", s.good],
        ["Needs improvement", s.needs_improvement],
        ["Poor", s.poor],
      ] as [string, number][]
    ).map(([label, count]) => [
      label,
      String(count),
      s.calls_audited ? `${Math.round((count / s.calls_audited) * 100)}%` : "—",
    ]),
  );
  doc.gap(16);

  if (report.agents.length) {
    doc.heading("Performance by agent ID");
    doc.grid(
      [
        { header: "Agent ID", width: 90, bold: true },
        { header: "Calls", width: 55, align: "right" },
        { header: "Avg", width: 55, align: "right", bold: true, color: scoreColor },
        { header: "AHT", width: 70, align: "right" },
        { header: "Excellent", width: 70, align: "right" },
        { header: "Poor", width: 55, align: "right" },
        { header: "Compliance", width: 120, align: "right" },
      ],
      report.agents.map((row) => [
        row.agent_name,
        String(row.call_count),
        scoreLabel(row.avg_score),
        formatAht(row.aht_seconds),
        String(row.excellent),
        String(row.poor),
        `${row.compliance_findings} / ${row.compliance_calls} calls`,
      ]),
      "No agent activity in this period.",
    );
    doc.gap(16);
  }

  doc.heading("Evaluated call scores");
  doc.grid(
    [
      { header: "Audited at", width: 105 },
      { header: "Agent ID", width: 75, bold: true },
      { header: "AHT", width: 55, align: "right" },
      { header: "Score", width: 55, align: "right", bold: true, color: scoreColor },
      { header: "Verdict", width: 110 },
      { header: "Compliance", width: 115, align: "right" },
    ],
    report.calls.map((row) => [
      formatReportDate(row.audited_at),
      row.title,
      formatAht(row.duration_seconds),
      String(row.overall_score),
      verdictCell(String(row.verdict)),
      row.compliance_findings.length ? `${row.compliance_findings.length} flagged` : "Clean",
    ]),
    "No audited calls in this period.",
  );
  doc.gap(16);

  doc.heading("Compliance findings");
  doc.grid(
    [
      { header: "Audited at", width: 105 },
      { header: "Agent ID", width: 75, bold: true },
      { header: "Finding", width: 335 },
    ] satisfies Column[],
    report.compliance.map((row) => [formatReportDate(row.audited_at), row.title, row.finding]),
    "Zero compliance findings recorded for this period.",
  );

  return doc.build();
}

export function exportFilename(report: QaReport, ext: "xlsx" | "pdf") {
  return `${reportFileStem(report)}.${ext}`;
}
