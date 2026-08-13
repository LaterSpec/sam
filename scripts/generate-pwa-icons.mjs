import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "public", "icons");
const pngSourcePath = join(iconsDir, "sam_iconv2.png");

const SIZES = [
  { name: "sam_iconv2-192.png", size: 192 },
  { name: "sam_iconv2-512.png", size: 512 },
];

async function resizeIcon(source, size) {
  return sharp(source).resize(size, size, { fit: "cover" }).png({ compressionLevel: 9 }).toBuffer();
}

async function main() {
  await mkdir(iconsDir, { recursive: true });
  const pngSource = await readFile(pngSourcePath);

  for (const { name, size } of SIZES) {
    const png = await resizeIcon(pngSource, size);
    await writeFile(join(iconsDir, name), png);
    console.log(`wrote ${name} (${size}x${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
