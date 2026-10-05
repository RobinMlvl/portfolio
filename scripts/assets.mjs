// Dev-only: converts source images from sibling repos into public/. Run: node scripts/assets.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

async function mustExist(p) { try { await fs.access(p); } catch { throw new Error(`Missing source: ${p}`); } }

const manifest = JSON.parse(await fs.readFile(new URL('./assets.manifest.json', import.meta.url), 'utf8'));
const results = [];

for (const item of manifest.logos) {
  await mustExist(item.from);
  await fs.mkdir(path.dirname(item.to), { recursive: true });
  if (item.op === 'copy') { await fs.copyFile(item.from, item.to); results.push([item.to, 'copied']); continue; }
  // limitInputPixels: false — riview's source SVG declares width/height="100%" with viewBox
  // "0 0 16000 6250"; at density 300 that rasterizes to 66667x26042 (~1.74e9 px), over sharp's
  // default 268,402,689px safety limit. The final resize still yields the expected 1600-wide output.
  const img = sharp(item.from, { density: 300, limitInputPixels: false }).resize({ width: item.width, withoutEnlargement: true }).png({ compressionLevel: 9 });
  const info = await img.toFile(item.to);
  results.push([item.to, `${info.width}x${info.height}`]);
}
for (const item of manifest.screens) {
  await mustExist(item.from);
  await fs.mkdir(path.dirname(item.to), { recursive: true });
  const info = await sharp(item.from).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(item.to);
  results.push([item.to, `${info.width}x${info.height}`]);
}
for (const [to, what] of results) console.log(what.padEnd(12), to);
