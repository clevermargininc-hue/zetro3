import zlib from "node:zlib";

/** Zetro palette. Keep these in sync with the app theme. */
export const BRAND = {
  navy: { r: 11, g: 18, b: 32 },
  ink: { r: 16, g: 35, b: 63 },
  blue: { r: 37, g: 99, b: 235 },
  blueSoft: { r: 219, g: 234, b: 254 },
  slate: { r: 100, g: 116, b: 139 },
  line: { r: 226, g: 232, b: 240 },
  zebra: { r: 248, g: 250, b: 252 },
  white: { r: 255, g: 255, b: 255 },
  green: { r: 22, g: 128, b: 61 },
  amber: { r: 180, g: 83, b: 9 },
  rose: { r: 190, g: 24, b: 93 },
} as const;

export type Rgb = { r: number; g: number; b: number };

export function hex({ r, g, b }: Rgb) {
  return [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** PDF operators take 0–1 components. */
export function pdfColor({ r, g, b }: Rgb) {
  return `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)}`;
}

/** Score bands shared by the PDF and Excel exports. */
export function scoreBand(score: number | null | undefined) {
  if (score == null) return { label: "—", color: BRAND.slate };
  if (score >= 85) return { label: "Excellent", color: BRAND.green };
  if (score >= 70) return { label: "Good", color: BRAND.ink };
  if (score >= 50) return { label: "Review", color: BRAND.amber };
  return { label: "Poor", color: BRAND.rose };
}

type Point = [number, number];

/** The Zetro mark: a triangle ring, drawn on a 24×24 grid like the app icon. */
const OUTER: [Point, Point, Point] = [
  [12, 2],
  [2, 22],
  [22, 22],
];
const INNER: [Point, Point, Point] = [
  [12, 5.8],
  [5.7, 18.4],
  [18.3, 18.4],
];

/** PDF path for the mark, scaled into a box of `size` at (x, y) with y-up axes. */
export function logoPath(x: number, y: number, size: number) {
  const s = size / 24;
  const map = ([px, py]: Point) => `${(x + px * s).toFixed(2)} ${(y + (24 - py) * s).toFixed(2)}`;
  const tri = (points: [Point, Point, Point]) =>
    `${map(points[0])} m ${map(points[1])} l ${map(points[2])} l h`;
  return `${tri(OUTER)} ${tri(INNER)}`;
}

function inTriangle([px, py]: Point, [a, b, c]: [Point, Point, Point]) {
  const sign = (p: Point, q: Point, r: Point) =>
    (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const d1 = sign([px, py], a, b);
  const d2 = sign([px, py], b, c);
  const d3 = sign([px, py], c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

function crc32(buf: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([head, body, crc]);
}

/**
 * Rasterized mark for embedding in spreadsheets, which cannot take vector paths.
 * 4×4 supersampled so the diagonals stay clean at small sizes.
 */
export function logoPng(size = 128, color: Rgb = BRAND.blue): Buffer {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const samples = 4;
  const scale = 24 / size;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px: Point = [
            (x + (sx + 0.5) / samples) * scale,
            (y + (sy + 0.5) / samples) * scale,
          ];
          if (inTriangle(px, OUTER) && !inTriangle(px, INNER)) hits++;
        }
      }
      const alpha = Math.round((hits / (samples * samples)) * 255);
      const at = rowStart + 1 + x * 4;
      raw[at] = color.r;
      raw[at + 1] = color.g;
      raw[at + 2] = color.b;
      raw[at + 3] = alpha;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
