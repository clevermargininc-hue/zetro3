import * as XLSX from "xlsx";
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

export function excelBuffer(report: QaReport): Buffer {
  const wb = XLSX.utils.book_new();
  const summary = report.summary;

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["ZETRO QUALITY OPERATIONS REPORT"],
    ["Period", report.period_label],
    ["From", report.range_start],
    ["To", report.range_end],
    ["Scope", report.agent_label],
    ["Generated", formatReportDate(report.generated_at)],
    [],
    [],
    ["Metric", "Value"],
    ["Calls audited", summary.calls_audited],
    ["Average overall score", dash(summary.avg_overall)],
    ["Average greeting", dash(summary.avg_greeting)],
    ["Average empathy", dash(summary.avg_empathy)],
    ["Average professionalism", dash(summary.avg_professionalism)],
    ["Average resolution", dash(summary.avg_resolution)],
    ["Average communication", dash(summary.avg_communication)],
    ["Average language mix", dash(summary.avg_language_handling)],
    ["Excellent", summary.excellent],
    ["Good", summary.good],
    ["Needs improvement", summary.needs_improvement],
    ["Poor", summary.poor],
    ["Calls with compliance issues", summary.calls_with_compliance_issue],
    ["Compliance findings", summary.total_compliance_findings],
    ["Documents audits", summary.documents_audits],
    ["Automatic audits", summary.automatic_audits],
  ]);
  summarySheet["!cols"] = [{ wch: 38 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  const scoreSheet = XLSX.utils.aoa_to_sheet([
    [
      "Audited at",
      "Call",
      "Agent",
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
    ...report.calls.map((row) => [
      formatReportDate(row.audited_at),
      row.title,
      row.agent_name,
      row.overall_score,
      dash(row.greeting),
      dash(row.empathy),
      dash(row.professionalism),
      dash(row.resolution),
      dash(row.communication),
      dash(row.language_handling),
      verdictCell(String(row.verdict)),
      dash(row.customer_sentiment),
      auditModeLabel(row.audit_mode),
      row.compliance_findings.join(" | ") || "None identified",
      dash(row.summary),
    ]),
  ]);
  scoreSheet["!cols"] = [
    { wch: 22 },
    { wch: 28 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 50 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, scoreSheet, "Scores");

  const complianceSheet = XLSX.utils.aoa_to_sheet([
    ["Audited at", "Call", "Agent", "Compliance finding"],
    ...report.compliance.map((row) => [
      formatReportDate(row.audited_at),
      row.title,
      row.agent_name,
      row.finding,
    ]),
  ]);
  complianceSheet["!cols"] = [{ wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, complianceSheet, "Compliance");

  const agentSheet = XLSX.utils.aoa_to_sheet([
    [
      "Agent",
      "Calls audited",
      "Average score",
      "Excellent",
      "Good",
      "Needs improvement",
      "Poor",
      "Calls with compliance issues",
      "Compliance findings",
    ],
    ...report.agents.map((row) => [
      row.agent_name,
      row.call_count,
      dash(row.avg_score),
      row.excellent,
      row.good,
      row.needs_improvement,
      row.poor,
      row.compliance_calls,
      row.compliance_findings,
    ]),
  ]);
  agentSheet["!cols"] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 18 },
    { wch: 10 },
    { wch: 28 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, agentSheet, "Agents");

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
  return Buffer.from(out);
}

function pdfEscape(text: string) {
  const ascii = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x20-\x7E]/g, "?");
  return ascii.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      if (word.length > maxChars) {
        for (let i = 0; i < word.length; i += maxChars) {
          lines.push(word.slice(i, i + maxChars));
        }
        current = "";
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export class PdfDoc {
  private pages: string[] = [];
  private current = "";
  y = 800;
  readonly width = 595;
  readonly height = 842;

  constructor() {
    this.beginPage();
  }

  private beginPage() {
    this.current = "BT\n";
    this.y = 800;
  }

  private flushText() {
    if (!this.current.endsWith("ET\n") && this.current.startsWith("BT")) {
      this.current += "ET\n";
    }
  }

  private ensureText() {
    if (this.current.endsWith("ET\n")) this.current += "BT\n";
  }

  newPage() {
    this.flushText();
    this.pages.push(this.current);
    this.beginPage();
  }

  need(space: number) {
    if (this.y - space < 48) this.newPage();
  }

  fillBar(y: number, h: number, r: number, g: number, b: number) {
    this.flushText();
    this.current += `${r} ${g} ${b} rg 36 ${y} ${this.width - 72} ${h} re f\n0 0 0 rg\n`;
    this.ensureText();
  }

  text(x: number, y: number, size: number, value: string, fill = "0 0 0") {
    this.ensureText();
    this.current += `/F1 ${size} Tf ${fill} rg ${x} ${y} Td (${pdfEscape(value)}) Tj\n`;
    this.current += `${-x} ${-y} Td\n`;
  }

  heading(title: string) {
    this.need(40);
    this.text(40, this.y, 16, title, "0.1 0.15 0.25");
    this.y -= 26;
  }

  line(label: string, value: string) {
    this.need(16);
    this.text(40, this.y, 10, `${label}: ${value}`);
    this.y -= 14;
  }

  para(value: string, size = 10) {
    for (const line of wrapText(value, 92)) {
      this.need(14);
      this.text(40, this.y, size, line);
      this.y -= 13;
    }
  }

  gap(n = 10) {
    this.y -= n;
  }

  table(headers: string[], rows: string[][], widths: number[], empty = "No rows in this period.") {
    const drawRow = (cells: string[], header: boolean) => {
      const wrapped = cells.map((cell, i) => wrapText(cell, Math.max(8, Math.floor(widths[i] / 5.4))));
      const height = Math.max(16, ...wrapped.map((lines) => lines.length * 11 + 6));
      this.need(height + 2);
      if (header) {
        this.flushText();
        this.current += `0.95 0.96 0.97 rg 36 ${this.y - height + 8} ${this.width - 72} ${height} re f\n0 0 0 rg\n`;
        this.ensureText();
      }
      let x = 40;
      for (let i = 0; i < cells.length; i += 1) {
        let yy = this.y - 2;
        for (const line of wrapped[i]) {
          this.text(x, yy - 8, header ? 9 : 8, line, header ? "0.2 0.25 0.3" : "0.063 0.137 0.247");
          yy -= 11;
        }
        x += widths[i];
      }
      this.y -= height;
    };

    drawRow(headers, true);
    if (!rows.length) {
      this.need(18);
      this.text(40, this.y, 9, empty);
      this.y -= 18;
      return;
    }
    for (const row of rows) drawRow(row, false);
  }

  build(): Buffer {
    this.flushText();
    this.pages.push(this.current);

    const objects: string[] = [];
    const offsets: number[] = [0];
    const add = (body: string) => {
      offsets.push(0);
      objects.push(body);
    };

    add("<< /Type /Catalog /Pages 2 0 R >>");
    const pageIds: number[] = [];
    const fontId = 3 + this.pages.length * 2;
    add(""); // pages placeholder

    this.pages.forEach((content) => {
      const pageObj = objects.length + 1;
      const contentObj = pageObj + 1;
      pageIds.push(pageObj);
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentObj} 0 R >>`,
      );
      const stream = content.replace(/\n/g, "\n");
      add(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
    });

    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

    let pdf = "%PDF-1.4\n";
    objects.forEach((body, index) => {
      offsets[index + 1] = Buffer.byteLength(pdf, "utf8");
      pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i <= objects.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf, "utf8");
  }
}

export function pdfBuffer(report: QaReport): Buffer {
  const doc = new PdfDoc();
  doc.fillBar(790, 52, 0.04, 0.06, 0.12);
  doc.text(40, 810, 22, "ZETRO", "0.2 0.6 1.0");
  doc.text(125, 810, 16, " |  QUALITY OPERATIONS REPORT", "1 1 1");
  doc.y = 750;
  doc.heading(report.period_label);
  doc.line("Scope", report.agent_label);
  doc.line("Range", `${report.range_start} to ${report.range_end} (Africa/Nairobi)`);
  doc.line("Generated", formatReportDate(report.generated_at));
  doc.gap(12);

  const s = report.summary;
  doc.heading("Score summary");
  doc.table(
    ["Metric", "Value"],
    [
      ["Calls audited", String(s.calls_audited)],
      ["Average overall score", scoreLabel(s.avg_overall)],
      ["Average greeting", scoreLabel(s.avg_greeting)],
      ["Average empathy", scoreLabel(s.avg_empathy)],
      ["Average professionalism", scoreLabel(s.avg_professionalism)],
      ["Average resolution", scoreLabel(s.avg_resolution)],
      ["Average communication", scoreLabel(s.avg_communication)],
      ["Average language mix", scoreLabel(s.avg_language_handling)],
      ["Excellent / Good / Needs improvement / Poor", `${s.excellent} / ${s.good} / ${s.needs_improvement} / ${s.poor}`],
      ["Documents audits", String(s.documents_audits)],
      ["Automatic audits", String(s.automatic_audits)],
    ],
    [280, 230],
  );
  doc.gap(12);

  doc.heading("Compliance summary");
  doc.table(
    ["Metric", "Value"],
    [
      ["Calls with compliance issues", String(s.calls_with_compliance_issue)],
      ["Total compliance findings", String(s.total_compliance_findings)],
    ],
    [280, 230],
  );
  doc.gap(12);

  if (report.agents.length) {
    doc.heading("Agents");
    doc.table(
      ["Agent", "Calls", "Avg", "Excellent", "Poor", "Compliance"],
      report.agents.map((row) => [
        row.agent_name,
        String(row.call_count),
        scoreLabel(row.avg_score),
        String(row.excellent),
        String(row.poor),
        `${row.compliance_findings} findings / ${row.compliance_calls} calls`,
      ]),
      [130, 50, 50, 70, 50, 160],
    );
    doc.gap(12);
  }

  doc.heading("Call scores");
  doc.table(
    ["When", "Call", "Agent", "Score", "Verdict", "Path"],
    report.calls.map((row) => [
      formatReportDate(row.audited_at),
      row.title,
      row.agent_name,
      String(row.overall_score),
      verdictCell(String(row.verdict)),
      auditModeLabel(row.audit_mode),
    ]),
    [95, 130, 90, 45, 90, 70],
  );
  doc.gap(12);

  doc.heading("Compliance findings");
  doc.table(
    ["When", "Call", "Agent", "Finding"],
    report.compliance.map((row) => [
      formatReportDate(row.audited_at),
      row.title,
      row.agent_name,
      row.finding,
    ]),
    [90, 110, 80, 230],
  );

  return doc.build();
}

export function exportFilename(report: QaReport, ext: "xlsx" | "pdf") {
  return `${reportFileStem(report)}.${ext}`;
}
