import { BRAND, logoPath, pdfColor, type Rgb } from "@/lib/brand";

/** Helvetica advance widths (units/1000) for the printable ASCII range. */
const REGULAR = "278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584"
  .split(" ")
  .map(Number);
const BOLD = "278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584"
  .split(" ")
  .map(Number);

export type TextStyle = {
  bold?: boolean;
  color?: Rgb;
  align?: "left" | "right" | "center";
  width?: number;
};

export type Column = {
  header: string;
  width: number;
  align?: "left" | "right" | "center";
  color?: (raw: string) => Rgb;
  bold?: boolean;
};

function sanitize(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x09\x20-\x7E]/g, "-");
}

function escape(text: string) {
  return sanitize(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function textWidth(text: string, size: number, bold = false) {
  const table = bold ? BOLD : REGULAR;
  let total = 0;
  for (const char of sanitize(text)) {
    const index = char.charCodeAt(0) - 32;
    total += table[index] ?? 556;
  }
  return (total * size) / 1000;
}

/** Greedy wrap that measures real glyph widths instead of counting characters. */
export function wrapToWidth(text: string, maxWidth: number, size: number, bold = false) {
  const lines: string[] = [];
  for (const paragraph of String(text ?? "").split(/\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (textWidth(next, size, bold) <= maxWidth) {
        current = next;
        continue;
      }
      if (current) lines.push(current);
      if (textWidth(word, size, bold) > maxWidth) {
        let chunk = "";
        for (const char of word) {
          if (textWidth(chunk + char, size, bold) > maxWidth) {
            lines.push(chunk);
            chunk = char;
          } else {
            chunk += char;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
    if (current) lines.push(current);
    if (!words.length) lines.push("");
  }
  return lines.length ? lines : [""];
}

export type PdfDocOptions = {
  title?: string;
  subtitle?: string;
  footerNote?: string;
};

export class PdfDoc {
  private pages: string[] = [];
  private body = "";
  private options: PdfDocOptions;

  readonly width = 595;
  readonly height = 842;
  readonly margin = 40;
  readonly contentWidth = 595 - 80;
  private readonly bodyTop = 742;
  private readonly bodyBottom = 62;

  y = 742;

  constructor(options: PdfDocOptions = {}) {
    this.options = options;
    this.startPage();
  }

  private startPage() {
    this.body = "";
    this.y = this.options.title ? this.bodyTop : 800;
    if (this.options.title) this.pageHeader();
  }

  private pageHeader() {
    const { title, subtitle } = this.options;
    this.rect(0, this.height - 78, this.width, 78, BRAND.navy);
    this.logo(this.margin, this.height - 60, 26, BRAND.blue);
    this.write(this.margin + 36, this.height - 46, 20, "ZETRO", { bold: true, color: BRAND.white });
    this.write(this.margin + 36, this.height - 62, 8, "CONTACT CENTER QUALITY", {
      color: { r: 148, g: 163, b: 184 },
    });
    this.write(this.width - this.margin, this.height - 46, 12, title || "", {
      bold: true,
      color: BRAND.white,
      align: "right",
    });
    if (subtitle) {
      this.write(this.width - this.margin, this.height - 62, 9, subtitle, {
        color: { r: 148, g: 163, b: 184 },
        align: "right",
      });
    }
  }

  private pageFooter(pageNumber: number, pageCount: number) {
    const y = 40;
    const line = `0.85 0.89 0.94 RG 0.7 w ${this.margin} ${y + 14} m ${this.width - this.margin} ${y + 14} l S\n`;
    const note = this.options.footerNote || "Zetro quality operations";
    const left = `/F1 8 Tf ${pdfColor(BRAND.slate)} rg 1 0 0 1 ${this.margin} ${y} Tm (${escape(note)}) Tj`;
    const label = `Page ${pageNumber} of ${pageCount}`;
    const right = `/F1 8 Tf ${pdfColor(BRAND.slate)} rg 1 0 0 1 ${
      this.width - this.margin - textWidth(label, 8)
    } ${y} Tm (${escape(label)}) Tj`;
    return `${line}BT ${left} ET\nBT ${right} ET\n`;
  }

  // ---------------------------------------------------------------- primitives

  rect(x: number, y: number, w: number, h: number, fill: Rgb) {
    this.body += `${pdfColor(fill)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`;
  }

  hairline(x: number, y: number, w: number, color: Rgb = BRAND.line) {
    this.body += `${pdfColor(color)} RG 0.7 w ${x.toFixed(2)} ${y.toFixed(2)} m ${(x + w).toFixed(2)} ${y.toFixed(2)} l S\n`;
  }

  logo(x: number, y: number, size: number, color: Rgb = BRAND.blue) {
    this.body += `${pdfColor(color)} rg ${logoPath(x, y, size)} f*\n`;
  }

  write(x: number, y: number, size: number, value: string, style: TextStyle = {}) {
    const font = style.bold ? "/F2" : "/F1";
    const color = pdfColor(style.color || BRAND.ink);
    let tx = x;
    if (style.align === "right") tx = x - textWidth(value, size, style.bold);
    else if (style.align === "center") tx = x - textWidth(value, size, style.bold) / 2;
    this.body += `BT ${font} ${size} Tf ${color} rg 1 0 0 1 ${tx.toFixed(2)} ${y.toFixed(2)} Tm (${escape(value)}) Tj ET\n`;
  }

  /** Legacy positional signature kept for existing call sites. */
  text(x: number, y: number, size: number, value: string, fill = "0 0 0") {
    const [r, g, b] = fill.split(" ").map(Number);
    this.write(x, y, size, value, {
      color: { r: (r || 0) * 255, g: (g || 0) * 255, b: (b || 0) * 255 },
    });
  }

  fillBar(y: number, h: number, r: number, g: number, b: number) {
    this.rect(this.margin - 4, y, this.width - 2 * (this.margin - 4), h, {
      r: r * 255,
      g: g * 255,
      b: b * 255,
    });
  }

  // ------------------------------------------------------------------- layout

  newPage() {
    this.pages.push(this.body);
    this.startPage();
  }

  need(space: number) {
    if (this.y - space < this.bodyBottom) this.newPage();
  }

  gap(n = 10) {
    this.y -= n;
  }

  heading(title: string) {
    // Reserve the heading plus a table header and first row so it never orphans.
    this.need(96);
    this.write(this.margin, this.y, 13, title, { bold: true, color: BRAND.ink });
    this.y -= 6;
    this.hairline(this.margin, this.y, this.contentWidth);
    this.y -= 16;
  }

  subtle(value: string) {
    this.need(16);
    this.write(this.margin, this.y, 9, value, { color: BRAND.slate });
    this.y -= 13;
  }

  line(label: string, value: string) {
    this.need(16);
    this.write(this.margin, this.y, 9, label.toUpperCase(), { color: BRAND.slate });
    this.write(this.margin + 110, this.y, 9.5, value, { bold: true });
    this.y -= 14;
  }

  para(value: string, size = 9.5) {
    for (const line of wrapToWidth(value, this.contentWidth, size)) {
      this.need(14);
      this.write(this.margin, this.y, size, line);
      this.y -= 13;
    }
  }

  /** Row of KPI tiles, mirroring the KPI strip in the app. */
  cards(items: { label: string; value: string; hint?: string }[]) {
    if (!items.length) return;
    const perRow = Math.min(4, items.length);
    const height = 58;
    for (let start = 0; start < items.length; start += perRow) {
      const slice = items.slice(start, start + perRow);
      this.need(height + 10);
      const gapX = 10;
      const cardWidth = (this.contentWidth - gapX * (perRow - 1)) / perRow;
      const top = this.y;
      slice.forEach((item, index) => {
        const x = this.margin + index * (cardWidth + gapX);
        this.rect(x, top - height, cardWidth, height, BRAND.zebra);
        this.rect(x, top - height, 2.5, height, BRAND.blue);
        this.write(x + 12, top - 20, 7.5, item.label.toUpperCase(), { color: BRAND.slate });
        // Long values (verdicts, durations) shrink to fit rather than run into the next tile.
        let size = 17;
        while (size > 9 && textWidth(item.value, size, true) > cardWidth - 24) size -= 0.5;
        this.write(x + 12, top - 40, size, item.value, { bold: true, color: BRAND.ink });
        if (item.hint) {
          const hint = wrapToWidth(item.hint, cardWidth - 20, 7.5)[0];
          this.write(x + 12, top - 51, 7.5, hint, { color: BRAND.slate });
        }
      });
      this.y = top - height - 12;
    }
  }

  /**
   * Data table with a filled header, zebra rows and per-column alignment.
   * The header repeats whenever the table spills onto a new page.
   */
  grid(columns: Column[], rows: string[][], empty = "No rows in this period.") {
    const padX = 8;
    const padY = 6;
    const size = 8.5;
    const lineHeight = 11;

    const drawHeader = () => {
      const height = 20;
      this.need(height + 14);
      const top = this.y;
      this.rect(this.margin, top - height, this.contentWidth, height, BRAND.navy);
      let x = this.margin;
      for (const column of columns) {
        const align = column.align || "left";
        const anchor =
          align === "right" ? x + column.width - padX : align === "center" ? x + column.width / 2 : x + padX;
        this.write(anchor, top - height + padY + 1, 7.5, column.header.toUpperCase(), {
          bold: true,
          color: BRAND.white,
          align,
        });
        x += column.width;
      }
      this.y = top - height;
    };

    drawHeader();

    if (!rows.length) {
      this.need(24);
      this.rect(this.margin, this.y - 22, this.contentWidth, 22, BRAND.zebra);
      this.write(this.margin + padX, this.y - 15, size, empty, { color: BRAND.slate });
      this.y -= 22;
      return;
    }

    rows.forEach((cells, rowIndex) => {
      const wrapped = columns.map((column, i) =>
        wrapToWidth(cells[i] ?? "", column.width - padX * 2, size, column.bold),
      );
      const height = Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + padY * 2;

      if (this.y - height < this.bodyBottom) {
        this.newPage();
        drawHeader();
      }

      const top = this.y;
      if (rowIndex % 2 === 1) {
        this.rect(this.margin, top - height, this.contentWidth, height, BRAND.zebra);
      }

      let x = this.margin;
      columns.forEach((column, i) => {
        const align = column.align || "left";
        const anchor =
          align === "right" ? x + column.width - padX : align === "center" ? x + column.width / 2 : x + padX;
        const color = column.color ? column.color(cells[i] ?? "") : BRAND.ink;
        let ty = top - padY - 8;
        for (const line of wrapped[i]) {
          this.write(anchor, ty, size, line, { bold: column.bold, color, align });
          ty -= lineHeight;
        }
        x += column.width;
      });

      this.hairline(this.margin, top - height, this.contentWidth);
      this.y = top - height;
    });
  }

  /** Legacy table signature: plain headers, widths and left alignment. */
  table(headers: string[], rows: string[][], widths: number[], empty?: string) {
    this.grid(
      headers.map((header, i) => ({ header, width: widths[i] })),
      rows,
      empty,
    );
  }

  build(): Buffer {
    this.pages.push(this.body);
    const pageCount = this.pages.length;

    const objects: string[] = [];
    const streams: (Uint8Array | null)[] = [];
    const add = (body: string, stream: Uint8Array | null = null) => {
      objects.push(body);
      streams.push(stream);
    };

    add("<< /Type /Catalog /Pages 2 0 R >>");
    add(""); // /Pages placeholder, filled once page ids are known

    const regularId = 3 + pageCount * 2;
    const boldId = regularId + 1;
    const pageIds: number[] = [];

    this.pages.forEach((content, index) => {
      const pageObj = objects.length + 1;
      const contentObj = pageObj + 1;
      pageIds.push(pageObj);
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] ` +
          `/Resources << /Font << /F1 ${regularId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${contentObj} 0 R >>`,
      );
      const stream = Buffer.from(content + this.pageFooter(index + 1, pageCount), "latin1");
      add(`<< /Length ${stream.length} >>`, stream);
    });

    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`;

    const chunks: Uint8Array[] = [Buffer.from("%PDF-1.4\n", "latin1")];
    const offsets: number[] = [];
    let position = chunks[0].length;

    objects.forEach((body, index) => {
      offsets[index] = position;
      const stream = streams[index];
      const parts: Uint8Array[] = [Buffer.from(`${index + 1} 0 obj\n${body}\n`, "latin1")];
      if (stream) {
        parts.push(Buffer.from("stream\n", "latin1"), stream, Buffer.from("\nendstream\n", "latin1"));
      }
      parts.push(Buffer.from("endobj\n", "latin1"));
      const object = Buffer.concat(parts);
      chunks.push(object);
      position += object.length;
    });

    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
      xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF`;
    chunks.push(Buffer.from(xref, "latin1"));

    return Buffer.concat(chunks);
  }
}
