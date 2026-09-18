import ExcelJS from "exceljs";
import { BRAND, hex, logoPng, scoreBand } from "@/lib/brand";

const NAVY: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: `FF${hex(BRAND.navy)}` },
};

const BLUE: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: `FF${hex(BRAND.blue)}` },
};

const PAGE: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEEF2F7" },
};

const WHITE: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: `FF${hex(BRAND.white)}` },
};

const CARD_EDGE: ExcelJS.Border = {
  style: "medium",
  color: { argb: `FF${hex(BRAND.navy)}` },
};

const ROW_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: "thin", color: { argb: `FF${hex(BRAND.line)}` } },
};

const CENTER: Partial<ExcelJS.Alignment> = {
  vertical: "middle",
  horizontal: "center",
  wrapText: true,
};

const BODY: Partial<ExcelJS.Alignment> = {
  vertical: "middle",
  horizontal: "left",
  wrapText: true,
  indent: 1,
};

/** Report block starts at D. A–C are a left margin, never content. */
export const TABLE_ORIGIN = 4;
export const XLSX_HEADER_ROW = 8;
export const XLSX_DATA_ROW = 9;
const GUTTER_WIDTH = 12;
const BOTTOM_PAD = 3;

export function tableCol(indexFromZero: number) {
  return TABLE_ORIGIN + indexFromZero;
}

export function lastTableCol(tableColumns: number) {
  return TABLE_ORIGIN + tableColumns - 1;
}

function colLetter(col: number) {
  let n = col;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function setTableColumns(sheet: ExcelJS.Worksheet, widths: number[]) {
  sheet.columns = [
    { width: GUTTER_WIDTH },
    { width: GUTTER_WIDTH },
    { width: GUTTER_WIDTH },
    ...widths.map((width) => ({ width })),
    { width: GUTTER_WIDTH },
  ];
}

export function addTableRow(sheet: ExcelJS.Worksheet, values: ExcelJS.CellValue[]) {
  return sheet.addRow([...Array(TABLE_ORIGIN - 1).fill(null), ...values]);
}

function fillTableRow(sheet: ExcelJS.Worksheet, rowIndex: number, span: number, fill: ExcelJS.Fill) {
  const last = lastTableCol(span);
  for (let col = TABLE_ORIGIN; col <= last; col++) {
    sheet.getRow(rowIndex).getCell(col).fill = fill;
  }
}

function paintGutters(sheet: ExcelJS.Worksheet, tableColumns: number, lastRow: number) {
  const lastTable = lastTableCol(tableColumns);
  const rightGutter = lastTable + 1;
  for (let rowIndex = 1; rowIndex <= lastRow; rowIndex++) {
    const row = sheet.getRow(rowIndex);
    for (let col = 1; col <= rightGutter; col++) {
      if (col >= TABLE_ORIGIN && col <= lastTable) continue;
      const cell = row.getCell(col);
      cell.value = null;
      cell.fill = PAGE;
      cell.border = {};
      cell.font = { name: "Calibri", size: 10, color: { argb: `FF${hex(BRAND.ink)}` } };
    }
  }
}

function strokeCard(sheet: ExcelJS.Worksheet, tableColumns: number, lastRow: number) {
  const lastTable = lastTableCol(tableColumns);
  for (let rowIndex = 1; rowIndex <= lastRow; rowIndex++) {
    const row = sheet.getRow(rowIndex);
    const left = row.getCell(TABLE_ORIGIN);
    const right = row.getCell(lastTable);
    left.border = { ...(left.border || {}), left: CARD_EDGE };
    right.border = { ...(right.border || {}), right: CARD_EDGE };
    if (rowIndex === lastRow) {
      for (let col = TABLE_ORIGIN; col <= lastTable; col++) {
        const cell = row.getCell(col);
        cell.border = { ...(cell.border || {}), bottom: CARD_EDGE };
        if (!cell.fill) cell.fill = WHITE;
      }
    }
  }
}

/**
 * Gray page around a navy card that begins at column D.
 * Call after headers, rows, and body styles are in place.
 */
export function finishSheet(sheet: ExcelJS.Worksheet, tableColumns: number, freezeHeader = true) {
  const lastTable = lastTableCol(tableColumns);
  const rightGutter = lastTable + 1;
  const lastRow = Math.max(sheet.rowCount, XLSX_DATA_ROW) + BOTTOM_PAD;

  for (let rowIndex = sheet.rowCount + 1; rowIndex <= lastRow; rowIndex++) {
    sheet.getRow(rowIndex).height = 10;
    for (let col = TABLE_ORIGIN; col <= lastTable; col++) {
      sheet.getRow(rowIndex).getCell(col).fill = WHITE;
    }
  }

  paintGutters(sheet, tableColumns, lastRow);
  strokeCard(sheet, tableColumns, lastRow);

  sheet.properties.tabColor = { argb: `FF${hex(BRAND.navy)}` };
  sheet.pageSetup = {
    ...(sheet.pageSetup || {}),
    horizontalCentered: true,
    fitToPage: sheet.pageSetup?.fitToPage ?? true,
    fitToWidth: sheet.pageSetup?.fitToWidth ?? 1,
    printArea: `A1:${colLetter(rightGutter)}${lastRow}`,
  };
  sheet.pageSetup.margins = {
    left: 0.35,
    right: 0.35,
    top: 0.4,
    bottom: 0.4,
    header: 0.2,
    footer: 0.2,
  };
  sheet.views = [
    {
      showGridLines: false,
      state: "frozen",
      xSplit: TABLE_ORIGIN - 1,
      ySplit: freezeHeader ? XLSX_HEADER_ROW : 0,
      topLeftCell: freezeHeader ? `${colLetter(TABLE_ORIGIN)}${XLSX_DATA_ROW}` : `${colLetter(TABLE_ORIGIN)}1`,
      activeCell: `${colLetter(TABLE_ORIGIN)}${freezeHeader ? XLSX_DATA_ROW : 8}`,
    },
  ];
}

/**
 * Navy identity block over the table (from column D), not from A.
 * Rows 1–5 brand, 6–7 space, headings at 8.
 */
export function brandBanner(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  caption: string,
  meta: string,
  lastColumn: number,
  freezeHeader = true,
) {
  const span = Math.max(2, lastColumn);
  const start = colLetter(TABLE_ORIGIN);
  const end = colLetter(lastTableCol(span));

  sheet.mergeCells(`${start}1:${end}1`);
  sheet.mergeCells(`${start}2:${end}2`);
  sheet.mergeCells(`${start}3:${end}3`);
  sheet.mergeCells(`${start}4:${end}4`);
  sheet.mergeCells(`${start}5:${end}5`);
  sheet.mergeCells(`${start}6:${end}6`);
  sheet.mergeCells(`${start}7:${end}7`);

  sheet.getRow(1).height = 46;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 20;
  sheet.getRow(4).height = 18;
  sheet.getRow(5).height = 8;
  sheet.getRow(6).height = 14;
  sheet.getRow(7).height = 10;

  for (const rowIndex of [1, 2, 3, 4]) fillTableRow(sheet, rowIndex, span, NAVY);
  fillTableRow(sheet, 5, span, BLUE);
  fillTableRow(sheet, 6, span, WHITE);
  fillTableRow(sheet, 7, span, WHITE);

  const mark = workbook.addImage({
    buffer: logoPng(160) as unknown as ExcelJS.Buffer,
    extension: "png",
  });
  sheet.addImage(mark, {
    tl: { col: TABLE_ORIGIN - 1 + span / 2 - 0.42, row: 0.18 },
    ext: { width: 38, height: 38 },
    editAs: "oneCell",
  });

  const wordmark = sheet.getRow(2).getCell(TABLE_ORIGIN);
  wordmark.value = "Zetro";
  wordmark.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  wordmark.alignment = CENTER;

  const title = sheet.getRow(3).getCell(TABLE_ORIGIN);
  title.value = caption;
  title.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFBFDBFE" } };
  title.alignment = CENTER;

  const info = sheet.getRow(4).getCell(TABLE_ORIGIN);
  info.value = meta;
  info.font = { name: "Calibri", size: 9, color: { argb: "FF94A3B8" } };
  info.alignment = CENTER;

  if (!freezeHeader) {
    sheet.views = [
      {
        showGridLines: false,
        state: "frozen",
        xSplit: TABLE_ORIGIN - 1,
        ySplit: 0,
      },
    ];
  }

  return XLSX_HEADER_ROW;
}

export function headerRow(sheet: ExcelJS.Worksheet, headers: string[], rowIndex = XLSX_HEADER_ROW) {
  const row = sheet.getRow(rowIndex);
  row.height = 30;
  headers.forEach((label, index) => {
    const cell = row.getCell(tableCol(index));
    cell.value = label;
    cell.fill = NAVY;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = CENTER;
    cell.border = {
      bottom: { style: "medium", color: { argb: `FF${hex(BRAND.blue)}` } },
    };
  });
  return row;
}

export function styleBody(sheet: ExcelJS.Worksheet, firstDataRow: number, tableColumns: number) {
  const last = lastTableCol(tableColumns);
  for (let i = firstDataRow; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    row.height = Math.max(row.height || 0, 24);
    for (let col = TABLE_ORIGIN; col <= last; col++) {
      const cell = row.getCell(col);
      cell.font = {
        name: "Calibri",
        size: 10,
        color: { argb: `FF${hex(BRAND.ink)}` },
        ...(cell.font || {}),
      };
      cell.alignment = BODY;
      cell.border = ROW_BORDER;
      cell.fill =
        (i - firstDataRow) % 2 === 1
          ? {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: `FF${hex(BRAND.zebra)}` },
            }
          : WHITE;
    }
  }
}

export function paintScore(cell: ExcelJS.Cell, score: number | null | undefined) {
  const band = scoreBand(typeof score === "number" ? score : null);
  cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: `FF${hex(band.color)}` } };
  cell.alignment = CENTER;
}

export function paintScoreCell(cell: ExcelJS.Cell) {
  paintScore(cell, typeof cell.value === "number" ? cell.value : null);
}
