import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "public", "icons");
const pngSourcePath = join(iconsDir, "sam-icon.png");

const SIZES = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "apple-touch-icon.png", size: 180, maskable: false },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
];

async function resizeIcon(source, size) {
  return sharp(source).resize(size, size, { fit: "cover" }).png({ compressionLevel: 9 }).toBuffer();
}

async function maskableIcon(source, size) {
  const inner = Math.round(size * 0.82);
  const resized = await sharp(source).resize(inner, inner, { fit: "cover" }).png().toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  await mkdir(iconsDir, { recursive: true });
  const pngSource = await readFile(pngSourcePath);

  for (const { name, size, maskable } of SIZES) {
    const png = maskable ? await maskableIcon(pngSource, size) : await resizeIcon(pngSource, size);
    await writeFile(join(iconsDir, name), png);
    console.log(`wrote ${name} (${size}x${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
