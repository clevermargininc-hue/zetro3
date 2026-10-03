import mammoth from "mammoth";
import { extractText } from "unpdf";
import * as XLSX from "xlsx";

/**
 * Storage safety cap only. Prompts decide separately how much to send (see standards-reader),
 * so company files are no longer silently cut at upload time.
 */
const MAX_STORED_CHARS = 2_000_000;
/** Legacy uploads were cut at 60k chars and end with this marker — they get re-read from storage. */
export const LEGACY_EXTRACTION_CAP = 60_000;
export const EXTRACTION_TRUNCATED_MARKER = "[Truncated for model context]";
export const MAX_DOCUMENT_BYTES = 12 * 1024 * 1024;

function cleanText(raw: string) {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\u00A0]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncate(text: string) {
  if (text.length <= MAX_STORED_CHARS) return text;
  return `${text.slice(0, MAX_STORED_CHARS)}\n\n${EXTRACTION_TRUNCATED_MARKER}`;
}

function decodeEntities(raw: string) {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function xmlToText(raw: string) {
  return decodeEntities(
    raw
      .replace(/^\uFEFF/, "")
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\?[\s\S]*?\?>/g, " ")
      .replace(/<!DOCTYPE[\s\S]*?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

/** Text inside one table cell / inline run — keep it on one line. */
function inlineHtmlText(html: string) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, " / ")
      .replace(/<\/(p|li|h[1-6])>/gi, " / ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .replace(/(\s*\/\s*)+$/g, "")
    .replace(/^(\s*\/\s*)+/g, "")
    .trim();
}

function tableRowsToText(tableHtml: string) {
  const rows = [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)]
    .map((row) => {
      const cells = [...row[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((cell) => inlineHtmlText(cell[1]))
        .filter(Boolean);
      return cells.length ? `| ${cells.join(" | ")} |` : "";
    })
    .filter(Boolean);
  return rows.length ? `\n${rows.join("\n")}\n` : "\n";
}

/**
 * Word → structured text. Tables keep one row per line ("| Criterion | Weight | Notes |")
 * so scorecard criteria stay attached to their weights and Auto-Zero marks.
 */
function htmlToStructuredText(html: string) {
  let out = html;
  // Replace innermost tables first so nested tables do not break the row parser.
  const innermostTable = /<table\b[^>]*>(?:(?!<table\b)[\s\S])*?<\/table>/i;
  for (let guard = 0; guard < 500 && innermostTable.test(out); guard++) {
    out = out.replace(innermostTable, (table) => tableRowsToText(table));
  }
  out = out
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
      const text = inlineHtmlText(inner);
      return text ? `\n\n${"#".repeat(Math.min(6, Number(level) + 1))} ${text}\n` : "\n";
    })
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|li|ul|ol)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(out)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n");
}

async function wordToText(bytes: Buffer) {
  const [html, raw] = await Promise.all([
    mammoth.convertToHtml({ buffer: bytes }).catch(() => ({ value: "" })),
    mammoth.extractRawText({ buffer: bytes }).catch(() => ({ value: "" })),
  ]);
  const structured = cleanText(htmlToStructuredText(html.value || ""));
  const plain = cleanText(raw.value || "");
  // Prefer the structured version unless it clearly lost content.
  const structuredLetters = structured.replace(/[\s|#\-/]/g, "").length;
  const plainLetters = plain.replace(/\s/g, "").length;
  return structuredLetters >= plainLetters * 0.85 ? structured : plain;
}

/** Copy merged-cell values into every covered cell so category labels stay on each row. */
function fillMergedCells(sheet: XLSX.WorkSheet) {
  const merges = sheet["!merges"] || [];
  for (const range of merges) {
    const topLeft = sheet[XLSX.utils.encode_cell(range.s)];
    if (!topLeft) continue;
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        if (r === range.s.r && c === range.s.c) continue;
        const address = XLSX.utils.encode_cell({ r, c });
        if (!sheet[address]) sheet[address] = { ...topLeft };
      }
    }
  }
}

/**
 * Excel → one line per row, cells joined with " | ".
 * Uses formatted cell text (so 0.1 shows as "10%"), keeps every sheet, and fills merged cells.
 */
function spreadsheetToText(bytes: Buffer) {
  const workbook = XLSX.read(bytes, { type: "buffer", cellDates: true });
  const sheetMeta = workbook.Workbook?.Sheets || [];
  const sheets = workbook.SheetNames.map((name, index) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return "";
    fillMergedCells(sheet);
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }) as unknown[][];
    const lines = rows
      .map((row) => {
        const cells: string[] = [];
        for (const value of row) {
          const text = String(value ?? "").replace(/\s+/g, " ").trim();
          if (!text) continue;
          // Horizontal merges repeat the same label — keep it once.
          if (cells[cells.length - 1] === text) continue;
          cells.push(text);
        }
        return cells.length ? `| ${cells.join(" | ")} |` : "";
      })
      .filter(Boolean);
    if (!lines.length) return "";
    const hidden = sheetMeta[index]?.Hidden ? " (hidden sheet)" : "";
    return `## Sheet: ${name}${hidden}\n${lines.join("\n")}`;
  }).filter(Boolean);
  return sheets.join("\n\n");
}

async function pdfToText(bytes: Buffer) {
  const result = await extractText(new Uint8Array(bytes), { mergePages: false });
  const pages = Array.isArray(result.text) ? result.text : [String(result.text || "")];
  if (pages.length <= 1) return pages.join("\n");
  return pages
    .map((page, index) => {
      const body = String(page || "").trim();
      return body ? `--- Page ${index + 1} of ${pages.length} ---\n${body}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export async function extractDocumentText(
  bytes: Buffer,
  fileName: string,
  mimeType?: string | null,
) {
  const name = fileName.toLowerCase();
  const mime = (mimeType || "").toLowerCase();
  let text = "";

  if (
    name.endsWith(".xml") ||
    mime === "text/xml" ||
    mime === "application/xml" ||
    mime === "application/xhtml+xml"
  ) {
    text = xmlToText(bytes.toString("utf8"));
  } else if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsm") ||
    mime.includes("spreadsheetml") ||
    mime === "application/vnd.ms-excel"
  ) {
    text = spreadsheetToText(bytes);
  } else if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".csv") ||
    mime.startsWith("text/")
  ) {
    text = bytes.toString("utf8");
  } else if (name.endsWith(".pdf") || mime === "application/pdf") {
    text = await pdfToText(bytes);
  } else if (
    name.endsWith(".docx") ||
    mime.includes("wordprocessingml") ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    text = await wordToText(bytes);
  } else {
    throw new Error("Upload a PDF, Word, Excel, XML, or text file.");
  }

  text = cleanText(text);
  if (text.length < 20) {
    throw new Error(
      name.endsWith(".pdf")
        ? "This PDF has no readable text (it may be a scanned image). Export it as a text PDF or Word file so Zetro can read every rule before auditing."
        : "This file has no readable text. Zetro must be able to read the document before it can audit an agent.",
    );
  }
  return truncate(text);
}
