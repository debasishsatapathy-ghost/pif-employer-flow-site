// Processes public/logo-train.png → public/logo-train-transparent.png
// Samples the background color from the top-left corner and removes it.
const sharp = require('sharp');
const path  = require('path');

const INPUT  = path.join(__dirname, '../public/logo-train.png');
const OUTPUT = path.join(__dirname, '../public/logo-train-transparent.png');

async function run() {
  const image = sharp(INPUT).ensureAlpha();
  const { width, height } = await image.metadata();

  const { data } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Sample background from several corner pixels and average them
  const sampleCoords = [[0,0],[1,0],[0,1],[1,1],[2,0],[0,2]];
  let bgR = 0, bgG = 0, bgB = 0;
  for (const [cx, cy] of sampleCoords) {
    const idx = (cy * width + cx) * 4;
    bgR += data[idx]; bgG += data[idx+1]; bgB += data[idx+2];
  }
  bgR /= sampleCoords.length;
  bgG /= sampleCoords.length;
  bgB /= sampleCoords.length;

  console.log(`Image: ${width}×${height}  |  BG colour: rgb(${Math.round(bgR)},${Math.round(bgG)},${Math.round(bgB)})`);

  const out = Buffer.from(data);
  const THRESHOLD = 70; // colour-distance threshold; tune if needed

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i+1], b = out[i+2];
    const dist = Math.sqrt(
      (r - bgR) ** 2 +
      (g - bgG) ** 2 +
      (b - bgB) ** 2
    );
    if (dist < THRESHOLD) {
      // Soft edge: fade alpha proportionally to distance from BG
      out[i+3] = Math.round(out[i+3] * (dist / THRESHOLD));
    }
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(OUTPUT);

  console.log(`Written → ${OUTPUT}`);
}

run().catch(err => { console.error(err); process.exit(1); });
