import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const ICONS_DIR = path.join(ROOT, "public/icons");
const SPLASH_DIR = path.join(ROOT, "public/splash");

const PRIMARY = "#1e3a5f";
const ACCENT = "#c45c26";
const WHITE = "#ffffff";

const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="108" fill="${PRIMARY}"/>
  <rect x="136" y="120" width="240" height="272" rx="20" fill="${WHITE}" opacity="0.95"/>
  <rect x="168" y="168" width="176" height="12" rx="6" fill="${ACCENT}"/>
  <rect x="168" y="200" width="140" height="10" rx="5" fill="${PRIMARY}" opacity="0.35"/>
  <rect x="168" y="228" width="160" height="10" rx="5" fill="${PRIMARY}" opacity="0.35"/>
  <rect x="168" y="256" width="120" height="10" rx="5" fill="${PRIMARY}" opacity="0.35"/>
  <text x="256" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="700" fill="${PRIMARY}">국</text>
</svg>
`;

const MASKABLE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${PRIMARY}"/>
  <rect x="156" y="140" width="200" height="232" rx="18" fill="${WHITE}" opacity="0.95"/>
  <rect x="184" y="184" width="144" height="10" rx="5" fill="${ACCENT}"/>
  <rect x="184" y="212" width="112" height="8" rx="4" fill="${WHITE}" opacity="0.45"/>
  <rect x="184" y="236" width="128" height="8" rx="4" fill="${WHITE}" opacity="0.45"/>
  <text x="256" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="${WHITE}">국</text>
</svg>
`;

function splashSvg(width, height) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${PRIMARY}"/>
  <rect x="${width * 0.28}" y="${height * 0.32}" width="${width * 0.44}" height="${height * 0.22}" rx="24" fill="${WHITE}" opacity="0.95"/>
  <rect x="${width * 0.34}" y="${height * 0.38}" width="${width * 0.32}" height="8" rx="4" fill="${ACCENT}"/>
  <text x="${width / 2}" y="${height * 0.62}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.round(width * 0.12)}" font-weight="700" fill="${WHITE}">국</text>
  <text x="${width / 2}" y="${height * 0.68}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.round(width * 0.045)}" fill="${WHITE}" opacity="0.9">국어 지문 분석</text>
</svg>
`;
}

async function writePng(svg, outPath, size) {
  await sharp(Buffer.from(svg))
    .resize(size, size, { fit: "contain", background: PRIMARY })
    .png()
    .toFile(outPath);
}

async function writeSplash(svg, outPath, width, height) {
  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

async function main() {
  await fs.mkdir(ICONS_DIR, { recursive: true });
  await fs.mkdir(SPLASH_DIR, { recursive: true });

  const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  for (const size of iconSizes) {
    await writePng(ICON_SVG, path.join(ICONS_DIR, `icon-${size}.png`), size);
  }

  await writePng(ICON_SVG, path.join(ICONS_DIR, "apple-touch-icon.png"), 180);
  await writePng(MASKABLE_SVG, path.join(ICONS_DIR, "maskable-icon-512.png"), 512);
  await fs.writeFile(path.join(ICONS_DIR, "icon.svg"), ICON_SVG.trim());

  const splashes = [
    { name: "apple-splash-1170-2532", width: 1170, height: 2532 },
    { name: "apple-splash-1284-2778", width: 1284, height: 2778 },
    { name: "apple-splash-750-1334", width: 750, height: 1334 },
    { name: "apple-splash-828-1792", width: 828, height: 1792 },
  ];

  for (const splash of splashes) {
    await writeSplash(
      splashSvg(splash.width, splash.height),
      path.join(SPLASH_DIR, `${splash.name}.png`),
      splash.width,
      splash.height
    );
  }

  console.log("PWA icons and splash screens generated.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
