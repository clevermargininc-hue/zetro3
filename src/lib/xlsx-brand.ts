import ExcelJS from "exceljs";
import { BRAND, hex, logoPng, scoreBand } from "@/lib/brand";

export const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: `FF${hex(BRAND.navy)}` },
};

const ROW_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: "hair", color: { argb: `FF${hex(BRAND.line)}` } },
};

/** Leading pad so banner text clears the floating logo image. */
const PAD = "        ";

/**
 * Navy banner with the Zetro mark, a caption and up to two metadata lines.
 * Occupies rows 1–4; data should start at row 5 or later.
 */
export function brandBanner(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  caption: string,
  meta: string,
  lastColumn: number,
) {
  const span = Math.max(4, lastColumn);
  const end = sheet.getRow(1).getCell(span).address.replace(/\d+/, "");

  sheet.mergeCells(`A1:${end}1`);
  sheet.mergeCells(`A2:${end}2`);
  sheet.mergeCells(`A3:${end}3`);
  sheet.getRow(1).height = 30;
  sheet.getRow(2).height = 17;
  sheet.getRow(3).height = 15;

  const title = sheet.getCell("A1");
  title.value = `${PAD}ZETRO  ·  CONTACT CENTER QUALITY`;
  title.font = { name: "Segoe UI", size: 15, bold: true, color: { argb: "FFFFFFFF" } };
  title.alignment = { vertical: "middle" };

  const sub = sheet.getCell("A2");
  sub.value = `${PAD}${caption}`;
  sub.font = { name: "Segoe UI", size: 10, color: { argb: "FFCBD5E1" } };
  sub.alignment = { vertical: "middle" };

  const info = sheet.getCell("A3");
  info.value = `${PAD}${meta}`;
  info.font = { name: "Segoe UI", size: 9, color: { argb: "FF94A3B8" } };
  info.alignment = { vertical: "middle" };

  for (const rowIndex of [1, 2, 3]) {
    for (let col = 1; col <= span; col++) {
      sheet.getRow(rowIndex).getCell(col).fill = HEADER_FILL;
    }
  }

  const logo = workbook.addImage({
    buffer: logoPng(96) as unknown as ExcelJS.Buffer,
    extension: "png",
  });
  sheet.addImage(logo, {
    tl: { col: 0.25, row: 0.35 },
    ext: { width: 34, height: 34 },
    editAs: "oneCell",
  });

  sheet.getRow(4).height = 6;
}

export function headerRow(sheet: ExcelJS.Worksheet, headers: string[], rowIndex: number) {
  const row = sheet.getRow(rowIndex);
  row.values = headers;
  row.height = 22;
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });
  return row;
}

/** Zebra striping, wrapped text and hairline separators from `firstDataRow` down. */
export function styleBody(sheet: ExcelJS.Worksheet, firstDataRow: number) {
  for (let i = firstDataRow; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    row.alignment = { vertical: "top", wrapText: true };
    row.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 9, ...(cell.font || {}) };
      cell.border = ROW_BORDER;
    });
    if ((i - firstDataRow) % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${hex(BRAND.zebra)}` },
        };
      });
    }
  }
}

/** Colors a score cell by band and right-aligns it. */
export function paintScore(cell: ExcelJS.Cell, score: number | null | undefined) {
  const band = scoreBand(typeof score === "number" ? score : null);
  cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: `FF${hex(band.color)}` } };
  cell.alignment = { vertical: "top", horizontal: "right" };
}

export function paintScoreCell(cell: ExcelJS.Cell) {
  paintScore(cell, typeof cell.value === "number" ? cell.value : null);
}
