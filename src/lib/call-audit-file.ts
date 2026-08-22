import * as XLSX from "xlsx";
import { formatDuration, languageLabel } from "@/lib/format";
import { PdfDoc } from "@/lib/report-files";
import { auditModeLabel, formatReportDate, scoreLabel, verdictCell } from "@/lib/reports";
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

function agentName(call: AuditedCallExport["call"]) {
  return call.agents?.name || "Unassigned";
}

function callSlug(call: AuditedCallExport["call"]) {
  const title = (call.title || "call").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
  const agent = agentName(call).replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
  const day = (call.completed_at || call.created_at).slice(0, 10);
  return `zetro-audit-${agent}-${title}-${day}`.toLowerCase().slice(0, 80);
}

function details(pack: AuditedCallExport): Array<[string, string]> {
  const { call, score } = pack;
  return [
    ["Call", call.title || "Untitled call"],
    ["Agent", agentName(call)],
    ["File", dash(call.file_name)],
    ["Duration", formatDuration(call.duration_seconds)],
    ["Language mode", languageLabel(call.language_mode)],
    ["Detected language", languageLabel(call.detected_language)],
    ["Uploaded", formatReportDate(call.created_at)],
    ["Audited", formatReportDate(score.created_at || call.completed_at || call.created_at)],
    ["Audit path", auditModeLabel(score.audit_mode)],
    ["Overall score", String(score.overall_score)],
    ["Greeting", scoreLabel(score.greeting)],
    ["Empathy", scoreLabel(score.empathy)],
    ["Professionalism", scoreLabel(score.professionalism)],
    ["Resolution", scoreLabel(score.resolution)],
    ["Communication", scoreLabel(score.communication)],
    ["Language mix", scoreLabel(score.language_handling)],
    ["Verdict", verdictCell(score.verdict)],
    ["Customer sentiment", dash(score.customer_sentiment)],
    ["Summary", dash(score.summary)],
  ];
}

export function callAuditExcel(pack: AuditedCallExport): Buffer {
  const { score } = pack;
  const wb = XLSX.utils.book_new();

  const detailSheet = XLSX.utils.aoa_to_sheet([
    ["Zetro audited call"],
    [],
    ["Field", "Value"],
    ...details(pack),
  ]);
  detailSheet["!cols"] = [{ wch: 24 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, detailSheet, "Call details");

  const scoreSheet = XLSX.utils.aoa_to_sheet([
    ["Dimension", "Score"],
    ["Overall", score.overall_score],
    ["Greeting", dash(score.greeting)],
    ["Empathy", dash(score.empathy)],
    ["Professionalism", dash(score.professionalism)],
    ["Resolution", dash(score.resolution)],
    ["Communication", dash(score.communication)],
    ["Language mix", dash(score.language_handling)],
    ["Verdict", verdictCell(score.verdict)],
    ["Customer sentiment", dash(score.customer_sentiment)],
    ["Audit path", auditModeLabel(score.audit_mode)],
  ]);
  scoreSheet["!cols"] = [{ wch: 22 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, scoreSheet, "Scores");

  const noteSheet = (title: string, items: string[]) => {
    const sheet = XLSX.utils.aoa_to_sheet([
      [title],
      [],
      ...((items.length ? items : ["None identified"]).map((item) => [item])),
    ]);
    sheet["!cols"] = [{ wch: 90 }];
    return sheet;
  };

  XLSX.utils.book_append_sheet(wb, noteSheet("Strengths", list(score.strengths)), "Strengths");
  XLSX.utils.book_append_sheet(
    wb,
    noteSheet("Recommendations", list(score.improvements)),
    "Recommendations",
  );
  XLSX.utils.book_append_sheet(
    wb,
    noteSheet("Compliance findings", list(score.compliance_findings)),
    "Compliance",
  );

  const standards = score.standards_used || [];
  const standardsSheet = XLSX.utils.aoa_to_sheet([
    ["Kind", "Title", "File"],
    ...(standards.length
      ? standards.map((doc) => [doc.kind, doc.title, doc.file_name])
      : [["—", "No standards used", ""]]),
  ]);
  standardsSheet["!cols"] = [{ wch: 14 }, { wch: 32 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, standardsSheet, "Standards");

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
  return Buffer.from(out);
}

export function callAuditPdf(pack: AuditedCallExport): Buffer {
  const { score } = pack;
  const doc = new PdfDoc();
  doc.fillBar(806, 28, 0.102, 0.337, 0.859);
  doc.text(40, 816, 12, "ZETRO  ·  AUDITED CALL", "1 1 1");
  doc.y = 780;
  doc.heading(pack.call.title || "Untitled call");
  doc.line("Agent", agentName(pack.call));
  doc.line("Generated", formatReportDate(new Date().toISOString()));
  doc.gap(6);

  doc.heading("Call properties");
  doc.table(
    ["Field", "Value"],
    details(pack).map(([k, v]) => [k, v]),
    [150, 360],
    "No call details.",
  );
  doc.gap(10);

  doc.heading("Scores");
  doc.table(
    ["Dimension", "Score"],
    [
      ["Overall", String(score.overall_score)],
      ["Greeting", scoreLabel(score.greeting)],
      ["Empathy", scoreLabel(score.empathy)],
      ["Professionalism", scoreLabel(score.professionalism)],
      ["Resolution", scoreLabel(score.resolution)],
      ["Communication", scoreLabel(score.communication)],
      ["Language mix", scoreLabel(score.language_handling)],
      ["Verdict", verdictCell(score.verdict)],
      ["Customer sentiment", dash(score.customer_sentiment)],
      ["Audit path", auditModeLabel(score.audit_mode)],
    ],
    [200, 310],
  );
  doc.gap(10);

  doc.heading("Summary");
  doc.para(score.summary || "No summary.");
  doc.gap(10);

  doc.heading("Strengths");
  const strengths = list(score.strengths);
  doc.table(
    ["Note"],
    (strengths.length ? strengths : ["None identified"]).map((item) => [item]),
    [510],
    "None identified.",
  );
  doc.gap(10);

  doc.heading("Recommendations");
  const improvements = list(score.improvements);
  doc.table(
    ["Note"],
    (improvements.length ? improvements : ["None identified"]).map((item) => [item]),
    [510],
    "None identified.",
  );
  doc.gap(10);

  doc.heading("Compliance findings");
  const findings = list(score.compliance_findings);
  doc.table(
    ["Finding"],
    (findings.length ? findings : ["None identified"]).map((item) => [item]),
    [510],
    "None identified.",
  );
  doc.gap(10);

  if (score.standards_used?.length) {
    doc.heading("Standards this audit read");
    doc.table(
      ["Kind", "Title"],
      score.standards_used.map((row) => [row.kind, row.title]),
      [120, 390],
    );
  }

  return doc.build();
}

export function callAuditFilename(pack: AuditedCallExport, ext: "xlsx" | "pdf") {
  return `${callSlug(pack.call)}.${ext}`;
}
