import mammoth from "mammoth";
import { extractText } from "unpdf";
import * as XLSX from "xlsx";

const MAX_CHARS = 60_000;
export const MAX_DOCUMENT_BYTES = 12 * 1024 * 1024;

function cleanText(raw: string) {
  return raw
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncate(text: string) {
  if (text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS)}\n\n[Truncated for model context]`;
}

function xmlToText(raw: string) {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\?[\s\S]*?\?>/g, " ")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function spreadsheetToText(bytes: Buffer) {
  const workbook = XLSX.read(bytes, { type: "buffer" });
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    return `Sheet: ${name}\n${csv}`;
  });
  return sheets.join("\n\n");
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
    const result = await extractText(new Uint8Array(bytes), { mergePages: true });
    text = result.text;
  } else if (
    name.endsWith(".docx") ||
    mime.includes("wordprocessingml") ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: bytes });
    text = result.value;
  } else {
    throw new Error("Upload a PDF, Word, Excel, XML, or text file.");
  }

  text = cleanText(text);
  if (text.length < 20) {
    throw new Error(
      "This file has no readable text. Zetro must be able to read the document before it can audit an agent.",
    );
  }
  return truncate(text);
}
