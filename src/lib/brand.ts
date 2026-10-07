import zlib from "node:zlib";

/** Zetro palette. Keep these in sync with the app theme. */
export const BRAND = {
  navy: { r: 6, g: 28, b: 82 },      // #061C52
  ink: { r: 6, g: 28, b: 82 },       // #061C52
  blue: { r: 4, g: 182, b: 218 },    // #04B6DA
  mark: { r: 4, g: 182, b: 218 },    // #04B6DA
  accent: { r: 4, g: 182, b: 218 },  // #04B6DA
  blueSoft: { r: 227, g: 235, b: 251 }, // #E3EBFB
  slate: { r: 51, g: 65, b: 85 },    // #334155
  line: { r: 227, g: 235, b: 251 },   // #E3EBFB
  zebra: { r: 243, g: 246, b: 253 },  // #F3F6FD
  white: { r: 255, g: 255, b: 255 },
  green: { r: 21, g: 128, b: 61 },
  amber: { r: 180, g: 83, b: 9 },
  rose: { r: 185, g: 28, b: 28 },
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

/** App icon path on a 24×24 grid (same as `src/app/icon.svg`). */
const Z_STROKE: Point[] = [
  [6.5, 7.5],
  [17.5, 7.5],
  [6.5, 16.5],
  [17.5, 16.5],
];
const Z_WIDTH = 2.5;
const TILE_RADIUS = 4;

function mapLogoPoint(x: number, y: number, size: number, [px, py]: Point) {
  const s = size / 24;
  return `${(x + px * s).toFixed(2)} ${(y + (24 - py) * s).toFixed(2)}`;
}

/** PDF path for the Z stroke, y-up, sized into a `size` box at (x, y). */
export function logoStrokePath(x: number, y: number, size: number) {
  const pts = Z_STROKE.map((p) => mapLogoPoint(x, y, size, p));
  return `${pts[0]} m ${pts.slice(1).map((p) => `${p} l`).join(" ")}`;
}

export function logoStrokeWidth(size: number) {
  return (Z_WIDTH * size) / 24;
}

function distToSegment(p: Point, a: Point, b: Point) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const wx = p[0] - a[0];
  const wy = p[1] - a[1];
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(p[0] - b[0], p[1] - b[1]);
  const t = c1 / c2;
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
}

function onZStroke(p: Point) {
  let min = Infinity;
  for (let i = 0; i < Z_STROKE.length - 1; i++) {
    min = Math.min(min, distToSegment(p, Z_STROKE[i], Z_STROKE[i + 1]));
  }
  return min <= Z_WIDTH / 2;
}

function inRoundedTile([x, y]: Point) {
  if (x < 0 || y < 0 || x > 24 || y > 24) return false;
  const r = TILE_RADIUS;
  if (x >= r && x <= 24 - r) return true;
  if (y >= r && y <= 24 - r) return true;
  const cx = x < r ? r : 24 - r;
  const cy = y < r ? r : 24 - r;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
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
 * Official Zetro mark for spreadsheets: blue rounded tile + white Z, matching icon.svg.
 * 4×4 supersampled so the stroke stays clean when Excel scales it down.
 */
export function logoPng(size = 160): Buffer {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const samples = 4;
  const scale = 24 / size;
  const fill = BRAND.mark;
  const stroke = BRAND.white;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      let tileHits = 0;
      let strokeHits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const p: Point = [
            (x + (sx + 0.5) / samples) * scale,
            (y + (sy + 0.5) / samples) * scale,
          ];
          if (!inRoundedTile(p)) continue;
          tileHits++;
          if (onZStroke(p)) strokeHits++;
        }
      }
      const total = samples * samples;
      const at = rowStart + 1 + x * 4;
      if (!tileHits) {
        raw[at + 3] = 0;
        continue;
      }
      const t = strokeHits / tileHits;
      raw[at] = Math.round(fill.r + (stroke.r - fill.r) * t);
      raw[at + 1] = Math.round(fill.g + (stroke.g - fill.g) * t);
      raw[at + 2] = Math.round(fill.b + (stroke.b - fill.b) * t);
      raw[at + 3] = Math.round((tileHits / total) * 255);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
