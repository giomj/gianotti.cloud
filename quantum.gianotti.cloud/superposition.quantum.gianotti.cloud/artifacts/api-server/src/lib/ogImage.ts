import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

// Resolve fonts relative to this module. In production the bundle lives at
// artifacts/api-server/dist/index.mjs, in dev it is built to the same place,
// so ../assets/fonts is stable in both cases.
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.resolve(moduleDir, "../assets/fonts");

const WIDTH = 1200;
const HEIGHT = 630;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Naive word wrapping based on estimated glyph width. Good enough for a
 * headline in a known font at a known size.
 */
function wrapText(
  text: string,
  maxCharsPerLine: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const allLines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) allLines.push(current);
      current = word;
    }
  }
  if (current) allLines.push(current);

  if (allLines.length <= maxLines) return allLines;
  const lines = allLines.slice(0, maxLines);
  const last = lines[lines.length - 1]!;
  lines[lines.length - 1] =
    last.length > maxCharsPerLine - 1
      ? `${last.slice(0, maxCharsPerLine - 1)}…`
      : `${last}…`;
  return lines;
}

export interface OgImageInput {
  title: string;
  excerpt?: string;
  tags?: string[];
}

function buildSvg({ title, excerpt, tags }: OgImageInput): string {
  const titleLines = wrapText(title, 30, 3);
  const titleSize = titleLines.length >= 3 ? 56 : 64;
  const titleLineHeight = titleSize * 1.2;
  const titleStartY = 250;

  const titleTspans = titleLines
    .map(
      (line, i) =>
        `<tspan x="80" y="${titleStartY + i * titleLineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  const excerptLines = excerpt ? wrapText(excerpt, 62, 2) : [];
  const excerptStartY = titleStartY + titleLines.length * titleLineHeight + 20;
  const excerptTspans = excerptLines
    .map(
      (line, i) =>
        `<tspan x="80" y="${excerptStartY + i * 38}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  const tagText = (tags ?? [])
    .slice(0, 3)
    .map((t) => `#${t}`)
    .join("   ");

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1120"/>
      <stop offset="55%" stop-color="#101a33"/>
      <stop offset="100%" stop-color="#1a1040"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.6">
      <stop offset="0%" stop-color="#6d5efc" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#6d5efc" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <!-- quantum orbit motif -->
  <g transform="translate(1010, 140)" stroke="#7c8cf8" fill="none" stroke-opacity="0.55">
    <ellipse rx="110" ry="42" stroke-width="2"/>
    <ellipse rx="110" ry="42" stroke-width="2" transform="rotate(60)"/>
    <ellipse rx="110" ry="42" stroke-width="2" transform="rotate(-60)"/>
    <circle r="10" fill="#a5b4fc" stroke="none"/>
    <circle cx="110" r="6" fill="#22d3ee" stroke="none"/>
    <circle cx="-55" cy="80" r="6" fill="#f472b6" stroke="none"/>
  </g>
  <rect x="80" y="120" width="56" height="6" rx="3" fill="#22d3ee"/>
  <text x="80" y="165" font-family="Inter" font-size="26" font-weight="700" letter-spacing="4" fill="#22d3ee">QUANTUM COMPUTING BLOG</text>
  <text font-family="Inter" font-size="${titleSize}" font-weight="700" fill="#f8fafc">${titleTspans}</text>
  ${excerptTspans ? `<text font-family="Inter" font-size="28" font-weight="400" fill="#94a3b8">${excerptTspans}</text>` : ""}
  ${tagText ? `<text x="80" y="${HEIGHT - 60}" font-family="Inter" font-size="24" font-weight="400" fill="#7c8cf8">${escapeXml(tagText)}</text>` : ""}
  <rect x="0" y="${HEIGHT - 8}" width="${WIDTH}" height="8" fill="#22d3ee"/>
</svg>`;
}

export function renderOgImage(input: OgImageInput): Buffer {
  const svg = buildSvg(input);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
    font: {
      fontFiles: [
        path.join(fontsDir, "Inter-Regular.ttf"),
        path.join(fontsDir, "Inter-Bold.ttf"),
      ],
      loadSystemFonts: false,
      defaultFontFamily: "Inter",
    },
  });
  return Buffer.from(resvg.render().asPng());
}

let siteDefaultPng: Buffer | null = null;

export function renderDefaultOgImage(): Buffer {
  if (!siteDefaultPng) {
    siteDefaultPng = renderOgImage({
      title: "A learning journey through quantum computing",
      excerpt:
        "Hands-on posts with code, math, and interactive experiments.",
    });
  }
  return siteDefaultPng;
}

// Read font files eagerly at startup so a missing asset fails fast.
readFileSync(path.join(fontsDir, "Inter-Regular.ttf"));
readFileSync(path.join(fontsDir, "Inter-Bold.ttf"));
