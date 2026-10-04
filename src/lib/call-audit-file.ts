import ExcelJS from "exceljs";
import { agentLabel, formatDuration, languageLabel } from "@/lib/format";
import { scoreBand } from "@/lib/brand";
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

/** Call properties shown at the top of exports. */
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

export async function callAuditExcel(pack: AuditedCallExport): Promise<Buffer> {
  const { call, score, utterances } = pack;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Zetro QA";
  wb.created = new Date(auditedAt(pack));

  const complianceRate = complianceFollowRateFromScore(score);
  const sub = `Agent: ${agentId(call)}  ·  Call: ${call.file_name || call.title}  ·  Duration: ${formatDuration(call.duration_seconds)}  ·  Audited: ${formatReportDate(auditedAt(pack))}`;

  // =========================================================================
  // 1. CALL AUDIT & SCORECARD SHEET
  // =========================================================================
  const sheet = createWorksheet(wb, "Audit & Scorecard", "landscape");
  const bannerEnd = addBrandBanner(
    sheet,
    `CALL AUDIT EVALUATION · AGENT ${agentId(call)}`,
    sub,
    7
  );

  // Executive KPI Strip
  const nextRow = addKpiCards(sheet, bannerEnd, [
    {
      label: "Overall Score",
      value: score.overall_score,
      note: `Performance: ${scoreBand(score.overall_score).label}`,
    },
    {
      label: "Verdict",
      value: verdictCell(score.verdict),
      note: `Audit Path: ${auditModeLabel(score.audit_mode)}`,
    },
    {
      label: "Compliance Followed",
      value: complianceRate.followed_pct != null ? `${complianceRate.followed_pct}%` : "—",
      note: complianceRate.not_followed_pct != null ? `${complianceRate.not_followed_pct}% not followed` : "No company rules checked",
    },
    {
      label: "Customer Sentiment",
      value: score.customer_sentiment || "Neutral",
      note: `Duration: ${formatDuration(call.duration_seconds)}`,
    },
  ]);

  let curRow = nextRow;

  // Executive Call Summary
  curRow = addSectionHeader(sheet, curRow, "Executive Summary & Key Findings", 7);
  const summaryRow = sheet.getRow(curRow);
  summaryRow.height = 28;
  sheet.mergeCells(`A${curRow}:G${curRow}`);
  const sumCell = summaryRow.getCell(1);
  sumCell.value = score.summary || "No summary recorded for this audit.";
  sumCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
  sumCell.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
  curRow += 2;

  // Strengths & Recommendations Table
  const strengths = list(score.strengths);
  const improvements = list(score.improvements);
  if (strengths.length || improvements.length) {
    curRow = addSectionHeader(sheet, curRow, "Strengths & Coaching Recommendations", 7);
    const feedbackCols: ColumnDef[] = [
      { header: "Type", width: 18, align: "center" },
      { header: "Key Coaching Observation & Feedback", width: 85, align: "left", wrapText: true },
    ];
    addTableHeader(sheet, curRow, feedbackCols);
    sheet.mergeCells(`B${curRow}:G${curRow}`);
    const startFeed = curRow + 1;
    curRow++;

    strengths.forEach((item) => {
      const r = sheet.addRow(["Strength", item]);
      sheet.mergeCells(`B${curRow}:G${curRow}`);
      styleTableRow(r, feedbackCols, curRow, startFeed);
      r.getCell(1).font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF15803D" } };
      curRow++;
    });

    improvements.forEach((item) => {
      const r = sheet.addRow(["Recommendation", item]);
      sheet.mergeCells(`B${curRow}:G${curRow}`);
      styleTableRow(r, feedbackCols, curRow, startFeed);
      r.getCell(1).font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFB45309" } };
      curRow++;
    });
    curRow++; // Spacing
  }

  // Full Scorecard Breakdown
  curRow = addSectionHeader(sheet, curRow, "Detailed Scorecard Evaluation", 7);
  const scoreCols: ColumnDef[] = [
    { header: "Scorecard Parameter", width: 26, align: "left" },
    { header: "Score", width: 12, align: "center", isScore: true },
    { header: "Performance Band", width: 18, align: "center" },
    { header: "Weight %", width: 12, align: "center", isPct: true },
    { header: "Evaluation Rationale", width: 45, align: "left", wrapText: true },
    { header: "Transcript Evidence / Quote", width: 45, align: "left", wrapText: true },
    { header: "Source Document / Rule", width: 25, align: "left" },
  ];

  addTableHeader(sheet, curRow, scoreCols);
  const scoreHeaderRow = curRow;
  const startScoreData = curRow + 1;
  curRow++;

  const rows = scorecardRows(score);
  for (const row of rows) {
    const match = score.metric_evidence?.parameters?.find((item) => item.name === row.name);
    const weightVal = match?.weight_pct != null ? match.weight_pct / 100 : "";
    const r = sheet.addRow([
      row.name,
      row.score,
      scoreBand(row.score).label,
      weightVal,
      row.note || match?.note || "—",
      row.quote || match?.quote || "—",
      match?.source_file || "—",
    ]);
    styleTableRow(r, scoreCols, curRow, startScoreData);
    curRow++;
  }

  // Summary Row with Native Formula
  if (rows.length > 0) {
    const endScoreData = curRow - 1;
    addTableSummaryRow(sheet, curRow, [
      { col: 1, value: "SCORECARD AVERAGE" },
      { col: 2, formula: `=AVERAGE(B${startScoreData}:B${endScoreData})`, isScore: true },
      { col: 4, formula: `=SUM(D${startScoreData}:D${endScoreData})`, isPct: true },
    ]);
    curRow++;
  }

  // Standards / Compliance References if available
  const references = score.metric_evidence?.document_references || [];
  if (references.length > 0) {
    curRow += 2;
    curRow = addSectionHeader(sheet, curRow, "Verified Standards & Document References", 7);
    const refCols: ColumnDef[] = [
      { header: "Source Standard File", width: 28, align: "left" },
      { header: "Checked Criterion / Requirement", width: 60, align: "left", wrapText: true },
      { header: "Result", width: 20, align: "center" },
    ];
    addTableHeader(sheet, curRow, refCols);
    sheet.mergeCells(`C${curRow}:G${curRow}`);
    const startRef = curRow + 1;
    curRow++;

    references.forEach((ref) => {
      const r = sheet.addRow([ref.file_name, ref.criterion, ref.result]);
      sheet.mergeCells(`C${curRow}:G${curRow}`);
      styleTableRow(r, refCols, curRow, startRef);
      curRow++;
    });
  }

  finalizeWorksheet(sheet, scoreHeaderRow, 7, false);

  // =========================================================================
  // 2. FULL CALL TRANSCRIPT & UTTERANCES SHEET
  // =========================================================================
  if (utterances && utterances.length > 0) {
    const txSheet = createWorksheet(wb, "Transcript & Dialogue", "landscape");
    const txBannerEnd = addBrandBanner(
      txSheet,
      `CALL TRANSCRIPT · ${call.file_name || call.title}`,
      `Total Utterances: ${utterances.length}  ·  Detected Language: ${languageLabel(call.detected_language)}  ·  Duration: ${formatDuration(call.duration_seconds)}`,
      4
    );

    const txCols: ColumnDef[] = [
      { header: "Time Offset", width: 16, align: "center" },
      { header: "Speaker", width: 16, align: "center" },
      { header: "Language", width: 16, align: "center" },
      { header: "Verbatim Dialogue", width: 85, align: "left", wrapText: true },
    ];

    addTableHeader(txSheet, txBannerEnd, txCols);
    const startTx = txBannerEnd + 1;
    let txRowIdx = startTx;

    utterances.forEach((u) => {
      const startSec = u.start_ms != null ? Math.round(u.start_ms / 1000) : null;
      const endSec = u.end_ms != null ? Math.round(u.end_ms / 1000) : null;
      const timeStr =
        startSec != null && endSec != null
          ? `${formatDuration(startSec)} - ${formatDuration(endSec)}`
          : startSec != null
            ? formatDuration(startSec)
            : `#${u.sequence}`;

      const speakerName = u.speaker_label || (u.role === "agent" ? "Agent" : u.role === "customer" ? "Customer" : u.role);
      const isAgent = u.role === "agent" || /agent/i.test(speakerName);

      const r = txSheet.addRow([
        timeStr,
        speakerName,
        languageLabel(call.detected_language),
        u.text,
      ]);
      styleTableRow(r, txCols, txRowIdx, startTx);

      // Highlight Agent vs Customer speaker tags
      const spkCell = r.getCell(2);
      if (isAgent) {
        spkCell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF0F275A" } };
      } else {
        spkCell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF2563EB" } };
      }

      txRowIdx++;
    });

    finalizeWorksheet(txSheet, txBannerEnd, 4, true);
  }

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
