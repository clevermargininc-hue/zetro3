import ExcelJS from "exceljs";

export const COLOR = {
  navy: "0F275A",
  navyDark: "081635",
  blue: "2563EB",
  blueLight: "EFF6FF",
  blueBorder: "BFDBFE",
  zebra: "F8FAFC",
  white: "FFFFFF",
  line: "E2E8F0",
  lineDark: "CBD5E1",
  ink: "0F172A",
  muted: "64748B",
  headerText: "FFFFFF",

  // Score Badges
  excellentFill: "DCFCE7",
  excellentText: "15803D",
  goodFill: "DBEAFE",
  goodText: "1D4ED8",
  warningFill: "FEF3C7",
  warningText: "B45309",
  dangerFill: "FEE2E2",
  dangerText: "B91C1C",
};

export const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: `FF${COLOR.line}` } },
  left: { style: "thin", color: { argb: `FF${COLOR.line}` } },
  bottom: { style: "thin", color: { argb: `FF${COLOR.line}` } },
  right: { style: "thin", color: { argb: `FF${COLOR.line}` } },
};

export const TOTAL_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: `FF${COLOR.navy}` } },
  bottom: { style: "double", color: { argb: `FF${COLOR.navy}` } },
};

export function colLetter(colIndex1Based: number): string {
  let n = colIndex1Based;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/**
 * Creates and configures a standardized worksheet with visible gridlines and clean print margins.
 */
export function createWorksheet(
  wb: ExcelJS.Workbook,
  name: string,
  orientation: "portrait" | "landscape" = "portrait"
): ExcelJS.Worksheet {
  const sheet = wb.addWorksheet(name, {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    },
  });
  sheet.properties.tabColor = { argb: `FF${COLOR.navy}` };
  return sheet;
}

/**
 * Creates an executive header banner spanning column A to lastCol.
 * Returns the next available row index.
 */
export function addBrandBanner(
  sheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  lastCol: number
): number {
  const endLetter = colLetter(Math.max(2, lastCol));

  // Row 1: Primary Title Banner
  const r1 = sheet.getRow(1);
  r1.height = 32;
  sheet.mergeCells(`A1:${endLetter}1`);
  const c1 = r1.getCell(1);
  c1.value = `ZETRO  ·  ${title.toUpperCase()}`;
  c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.navyDark}` } };
  c1.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  c1.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  // Row 2: Secondary Metadata Subtitle
  const r2 = sheet.getRow(2);
  r2.height = 20;
  sheet.mergeCells(`A2:${endLetter}2`);
  const c2 = r2.getCell(1);
  c2.value = subtitle;
  c2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.navy}` } };
  c2.font = { name: "Segoe UI", size: 9, color: { argb: "FFCBD5E1" } };
  c2.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  // Row 3: Breathing room
  const r3 = sheet.getRow(3);
  r3.height = 10;

  return 4;
}

/**
 * Adds a section divider header with a stylish left accent.
 */
export function addSectionHeader(
  sheet: ExcelJS.Worksheet,
  rowIndex: number,
  title: string,
  lastCol: number
): number {
  const r = sheet.getRow(rowIndex);
  r.height = 24;
  sheet.mergeCells(`A${rowIndex}:${colLetter(lastCol)}${rowIndex}`);
  const c = r.getCell(1);
  c.value = title.toUpperCase();
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.blueLight}` } };
  c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: `FF${COLOR.navy}` } };
  c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  c.border = {
    left: { style: "medium", color: { argb: `FF${COLOR.blue}` } },
    bottom: { style: "thin", color: { argb: `FF${COLOR.blueBorder}` } },
  };
  return rowIndex + 1;
}

/**
 * Adds an executive KPI strip (3-4 key numbers in card format).
 */
export function addKpiCards(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  cards: Array<{ label: string; value: string | number; note?: string }>
): number {
  const labelRow = sheet.getRow(startRow);
  const valueRow = sheet.getRow(startRow + 1);
  const noteRow = sheet.getRow(startRow + 2);

  labelRow.height = 18;
  valueRow.height = 28;
  noteRow.height = 16;

  cards.forEach((card, index) => {
    const col = index + 1;

    // Label
    const lCell = labelRow.getCell(col);
    lCell.value = card.label.toUpperCase();
    lCell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: `FF${COLOR.muted}` } };
    lCell.alignment = { vertical: "middle", horizontal: "center" };
    lCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.zebra}` } };
    lCell.border = {
      top: { style: "thin", color: { argb: `FF${COLOR.lineDark}` } },
      left: { style: "thin", color: { argb: `FF${COLOR.lineDark}` } },
      right: { style: "thin", color: { argb: `FF${COLOR.lineDark}` } },
    };

    // Value
    const vCell = valueRow.getCell(col);
    vCell.value = card.value;
    vCell.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: `FF${COLOR.navy}` } };
    vCell.alignment = { vertical: "middle", horizontal: "center" };
    vCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.zebra}` } };
    vCell.border = {
      left: { style: "thin", color: { argb: `FF${COLOR.lineDark}` } },
      right: { style: "thin", color: { argb: `FF${COLOR.lineDark}` } },
    };

    // Note / Delta
    const nCell = noteRow.getCell(col);
    nCell.value = card.note || "";
    nCell.font = { name: "Segoe UI", size: 8, italic: true, color: { argb: `FF${COLOR.muted}` } };
    nCell.alignment = { vertical: "middle", horizontal: "center" };
    nCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.zebra}` } };
    nCell.border = {
      left: { style: "thin", color: { argb: `FF${COLOR.lineDark}` } },
      right: { style: "thin", color: { argb: `FF${COLOR.lineDark}` } },
      bottom: { style: "medium", color: { argb: `FF${COLOR.blue}` } },
    };
  });

  sheet.getRow(startRow + 3).height = 12; // Gap
  return startRow + 4;
}

export type ColumnDef = {
  header: string;
  width?: number;
  align?: "left" | "center" | "right";
  isScore?: boolean;
  isPct?: boolean;
  isDate?: boolean;
  isDuration?: boolean;
  wrapText?: boolean;
};

/**
 * Creates table headers and sets up column widths.
 */
export function addTableHeader(
  sheet: ExcelJS.Worksheet,
  rowIndex: number,
  columns: ColumnDef[]
): ExcelJS.Row {
  const row = sheet.getRow(rowIndex);
  row.height = 26;

  columns.forEach((col, index) => {
    const colNum = index + 1;
    const cell = row.getCell(colNum);
    cell.value = col.header;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.navy}` } };
    cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = {
      vertical: "middle",
      horizontal: col.align || (col.isScore || col.isPct ? "center" : "left"),
      wrapText: true,
    };
    cell.border = {
      top: { style: "medium", color: { argb: `FF${COLOR.navyDark}` } },
      left: { style: "thin", color: { argb: `FF${COLOR.navy}` } },
      right: { style: "thin", color: { argb: `FF${COLOR.navy}` } },
      bottom: { style: "medium", color: { argb: `FF${COLOR.blue}` } },
    };

    if (col.width) {
      sheet.getColumn(colNum).width = col.width;
    }
  });

  return row;
}

/**
 * Styles a table data row with clean typography, zebra striping, and score badge highlights.
 */
export function styleTableRow(
  row: ExcelJS.Row,
  columns: ColumnDef[],
  rowIndex: number,
  startDataRow: number
) {
  row.height = 22;
  const isZebra = (rowIndex - startDataRow) % 2 === 1;
  const baseFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: isZebra ? `FF${COLOR.zebra}` : `FF${COLOR.white}` },
  };

  columns.forEach((col, index) => {
    const colNum = index + 1;
    const cell = row.getCell(colNum);

    cell.font = {
      name: "Segoe UI",
      size: 9.5,
      color: { argb: `FF${COLOR.ink}` },
    };
    cell.border = THIN_BORDER;
    cell.fill = baseFill;
    cell.alignment = {
      vertical: "middle",
      horizontal: col.align || (col.isScore || col.isPct ? "center" : "left"),
      wrapText: col.wrapText ?? false,
      indent: col.align === "left" || (!col.align && !col.isScore && !col.isPct) ? 1 : 0,
    };

    // Format percentages
    if (col.isPct && typeof cell.value === "number") {
      cell.numFmt = "0.0%";
    }

    // Score badge formatting
    if (col.isScore) {
      const num = typeof cell.value === "number" ? cell.value : null;
      if (num != null) {
        if (num >= 85) {
          cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: `FF${COLOR.excellentText}` } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.excellentFill}` } };
        } else if (num >= 70) {
          cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: `FF${COLOR.goodText}` } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.goodFill}` } };
        } else if (num >= 50) {
          cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: `FF${COLOR.warningText}` } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.warningFill}` } };
        } else {
          cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: `FF${COLOR.dangerText}` } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.dangerFill}` } };
        }
      }
    }
  });
}

/**
 * Adds an Excel formula-based Summary/Total Row at the bottom of a data table.
 */
export function addTableSummaryRow(
  sheet: ExcelJS.Worksheet,
  rowIndex: number,
  cells: Array<{ col: number; formula?: string; value?: string | number; isScore?: boolean; isPct?: boolean }>
) {
  const row = sheet.getRow(rowIndex);
  row.height = 24;

  cells.forEach(({ col, formula, value, isScore, isPct }) => {
    const cell = row.getCell(col);
    if (formula) {
      cell.value = { formula };
    } else if (value != null) {
      cell.value = value;
    }
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: `FF${COLOR.navy}` } };
    cell.border = TOTAL_BORDER;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${COLOR.blueLight}` } };
    cell.alignment = {
      vertical: "middle",
      horizontal: isScore || isPct ? "center" : "left",
      indent: !isScore && !isPct ? 1 : 0,
    };
    if (isPct) {
      cell.numFmt = "0.0%";
    }
  });
}

/**
 * Automatically freezes headers and applies auto-filter across the specified table range.
 */
export function finalizeWorksheet(
  sheet: ExcelJS.Worksheet,
  headerRowIndex: number,
  lastCol: number,
  enableFilter = true
) {
  sheet.views = [
    {
      showGridLines: true,
      state: "frozen",
      xSplit: 0,
      ySplit: headerRowIndex,
      topLeftCell: `A${headerRowIndex + 1}`,
      activeCell: `A${headerRowIndex + 1}`,
    },
  ];

  if (enableFilter && sheet.rowCount > headerRowIndex) {
    sheet.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: sheet.rowCount, column: lastCol },
    };
  }
}

