import ExcelJS from "exceljs";
import { agentLabel, formatDuration, languageLabel } from "@/lib/format";
import { scoreBand } from "@/lib/brand";
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
} from "@/lib/xlsx-brand";
import { complianceFollowRateFromScore } from "@/lib/compliance-engine";
import { PdfDoc } from "@/lib/pdf-doc";
import { auditModeLabel, formatReportDate, scoreLabel, verdictCell } from "@/lib/reports";
import { scorecardRows } from "@/lib/scorecard-rows";
import type { Call, CallScore, Utterance } from "@/lib/types";

export type AuditedCallExport = {
  call: Call & { agents?: { name: string } | null };
  score: CallScore;
  utterances: Utterance[];
};

function dash(value: number | string | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

function list(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function agentId(call: AuditedCallExport["call"]) {
  return agentLabel(call);
}

function callSlug(call: AuditedCallExport["call"]) {
  const day = (call.completed_at || call.created_at).slice(0, 10);
  return `zetro-audit-${agentId(call)}-${day}`.toLowerCase().slice(0, 80);
}

function auditedAt(pack: AuditedCallExport) {
  const { call, score } = pack;
  return score.created_at || call.completed_at || call.created_at;
}

/** Call properties shown at the top of both exports. */
function details(pack: AuditedCallExport): Array<[string, string]> {
  const { call, score } = pack;
  return [
    ["Agent ID", agentId(call)],
    ["Recording", dash(call.file_name || call.title)],
    ["Duration", formatDuration(call.duration_seconds)],
    ["Language mode", languageLabel(call.language_mode)],
    ["Detected language", languageLabel(call.detected_language)],
    ["Uploaded", formatReportDate(call.created_at)],
    ["Audited", formatReportDate(auditedAt(pack))],
    ["Audit path", auditModeLabel(score.audit_mode)],
    ["Overall score", String(score.overall_score)],
    ["Verdict", verdictCell(score.verdict)],
    ["Customer sentiment", dash(score.customer_sentiment)],
  ];
}

function banner(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, pack: AuditedCallExport, caption: string, lastColumn: number) {
  return brandBanner(
    workbook,
    sheet,
    caption,
    `Call audit  ·  Agent ${agentId(pack.call)}  ·  Overall ${pack.score.overall_score} (${scoreBand(pack.score.overall_score).label})  ·  ${formatReportDate(auditedAt(pack))}`,
    lastColumn,
  );
}

export async function callAuditExcel(pack: AuditedCallExport): Promise<Buffer> {
  const { score } = pack;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Zetro";
  wb.created = new Date(auditedAt(pack));

  const landscape: Partial<ExcelJS.PageSetup> = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
  };

  // ---- Call details --------------------------------------------------------
  const overview = wb.addWorksheet("Call details", {
    views: [{ showGridLines: false }],
    pageSetup: { ...landscape, orientation: "portrait" },
  });
  setTableColumns(overview, [26, 56]);
  banner(wb, overview, pack, "Call details", 2);
  headerRow(overview, ["Field", "Value"]);
  details(pack).forEach((row) => addTableRow(overview, row));
  addTableRow(overview, ["Summary", dash(score.summary)]);
  styleBody(overview, XLSX_DATA_ROW, 2);
  finishSheet(overview, 2);

  // ---- Scorecard -----------------------------------------------------------
  const scores = wb.addWorksheet("Scorecard", {
    views: [{ showGridLines: false }],
    pageSetup: landscape,
  });
  setTableColumns(scores, [34, 10, 12, 10, 52, 52, 28]);
  banner(wb, scores, pack, "Scorecard", 7);
  headerRow(scores, ["Parameter", "Score", "Band", "Weight %", "Why", "Transcript evidence", "Source file"]);

  addTableRow(scores, [
    "Overall",
    score.overall_score,
    scoreBand(score.overall_score).label,
    "",
    verdictCell(score.verdict),
    "",
    "",
  ]);
  for (const row of scorecardRows(score)) {
    const match = score.metric_evidence?.parameters?.find((item) => item.name === row.name);
    addTableRow(scores, [
      row.name,
      row.score,
      scoreBand(row.score).label,
      match?.weight_pct ?? "",
      dash(row.note || match?.note),
      dash(row.quote || match?.quote),
      dash(match?.source_file),
    ]);
  }
  styleBody(scores, XLSX_DATA_ROW, 7);
  for (let i = XLSX_DATA_ROW; i <= scores.rowCount; i++) {
    paintScoreCell(scores.getRow(i).getCell(tableCol(1)));
  }
  scores.getRow(XLSX_DATA_ROW).font = { name: "Calibri", size: 10, bold: true };
  finishSheet(scores, 7);

  // ---- Findings ------------------------------------------------------------
  const findings = wb.addWorksheet("Findings", {
    views: [{ showGridLines: false }],
    pageSetup: landscape,
  });
  setTableColumns(findings, [22, 104]);
  banner(wb, findings, pack, "Strengths and recommendations", 2);
  headerRow(findings, ["Type", "Detail"]);
  const groups: [string, string[]][] = [
    ["Strength", list(score.strengths)],
    ["Recommendation", list(score.improvements)],
  ];
  for (const [label, items] of groups) {
    if (!items.length) {
      addTableRow(findings, [label, "None identified"]);
      continue;
    }
    items.forEach((item) => addTableRow(findings, [label, item]));
  }
  styleBody(findings, XLSX_DATA_ROW, 2);
  finishSheet(findings, 2);

  const complianceRate = complianceFollowRateFromScore(score);
  const compliance = wb.addWorksheet("Compliance", {
    views: [{ showGridLines: false }],
    pageSetup: landscape,
  });
  setTableColumns(compliance, [28, 22]);
  banner(wb, compliance, pack, "Company compliance", 2);
  headerRow(compliance, ["Metric", "Value"]);
  addTableRow(compliance, [
    "Followed",
    complianceRate.followed_pct == null ? "—" : `${complianceRate.followed_pct}%`,
  ]);
  addTableRow(compliance, [
    "Not followed",
    complianceRate.not_followed_pct == null ? "—" : `${complianceRate.not_followed_pct}%`,
  ]);
  styleBody(compliance, XLSX_DATA_ROW, 2);
  finishSheet(compliance, 2);

  // ---- Standards and references -------------------------------------------
  const sources = wb.addWorksheet("Standards", {
    views: [{ showGridLines: false }],
    pageSetup: landscape,
  });
  setTableColumns(sources, [20, 34, 62, 16]);
  banner(wb, sources, pack, "Standards and document references", 4);
  headerRow(sources, ["Kind", "Title", "Criterion / file", "Result"]);
  const standards = score.standards_used || [];
  const references = score.metric_evidence?.document_references || [];
  if (!standards.length && !references.length) {
    addTableRow(sources, ["—", "No standards used", "", ""]);
  }
  standards.forEach((doc) => addTableRow(sources, ["Standard", doc.title, doc.file_name, ""]));
  references.forEach((row) => addTableRow(sources, ["Reference", row.file_name, row.criterion, row.result]));
  styleBody(sources, XLSX_DATA_ROW, 4);
  finishSheet(sources, 4);

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

const scoreColor = (raw: string) => scoreBand(Number.parseInt(raw, 10) || null).color;

export function callAuditPdf(pack: AuditedCallExport): Buffer {
  const { call, score } = pack;
  const complianceRate = complianceFollowRateFromScore(score);
  const doc = new PdfDoc({
    title: "Call audit report",
    subtitle: `Agent ${agentId(call)}`,
    footerNote: `Zetro · Agent ${agentId(call)} · ${formatReportDate(auditedAt(pack))}`,
  });

  doc.cards([
    {
      label: "Overall score",
      value: String(score.overall_score),
      hint: scoreBand(score.overall_score).label,
    },
    { label: "Verdict", value: verdictCell(score.verdict), hint: "Audit outcome" },
    { label: "Handle time", value: formatDuration(call.duration_seconds), hint: "Recording length" },
    {
      label: "Compliance followed",
      value: complianceRate.followed_pct == null ? "—" : `${complianceRate.followed_pct}%`,
      hint:
        complianceRate.not_followed_pct == null
          ? "No company rules checked"
          : `${complianceRate.not_followed_pct}% not followed`,
    },
  ]);
  doc.gap(6);

  doc.heading("Call properties");
  doc.grid(
    [
      { header: "Field", width: 150 },
      { header: "Value", width: 365 },
    ],
    details(pack).map(([field, value]) => [field, value]),
    "No call details.",
  );
  doc.gap(16);

  doc.heading("Scorecard");
  doc.grid(
    [
      { header: "Parameter", width: 235 },
      { header: "Score", width: 60, align: "right", bold: true, color: scoreColor },
      { header: "Band", width: 100, align: "right" },
      { header: "Weight", width: 120, align: "right" },
    ],
    scorecardRows(score).map((row) => [
      row.name,
      scoreLabel(row.score),
      scoreBand(row.score).label,
      row.weight_pct == null ? "—" : `${row.weight_pct}%`,
    ]),
    "No scorecard parameters.",
  );
  doc.gap(16);

  doc.heading("Summary");
  doc.para(score.summary || "No summary.");
  doc.gap(14);

  const notes: [string, string[], string][] = [
    ["Strengths", list(score.strengths), "None identified."],
    ["Recommendations", list(score.improvements), "None identified."],
  ];
  for (const [title, items, empty] of notes) {
    doc.heading(title);
    doc.grid(
      [
        { header: "#", width: 30, align: "right" },
        { header: "Detail", width: 485 },
      ],
      items.map((item, index) => [String(index + 1), item]),
      empty,
    );
    doc.gap(14);
  }

  const references = score.metric_evidence?.document_references || [];
  if (references.length) {
    doc.heading("Document references");
    doc.grid(
      [
        { header: "File", width: 140 },
        { header: "Criterion", width: 285 },
        { header: "Result", width: 90, align: "right" },
      ],
      references.map((row) => [row.file_name, row.criterion, row.result]),
    );
    doc.gap(14);
  }

  const standards = score.standards_used || [];
  if (standards.length) {
    doc.heading("Standards this audit read");
    doc.grid(
      [
        { header: "Kind", width: 110 },
        { header: "Title", width: 220 },
        { header: "File", width: 185 },
      ],
      standards.map((row) => [row.kind, row.title, row.file_name]),
    );
  }

  return doc.build();
}

export function callAuditFilename(pack: AuditedCallExport, ext: "xlsx" | "pdf") {
  return `${callSlug(pack.call)}.${ext}`;
}
