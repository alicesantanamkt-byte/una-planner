const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

const root = process.cwd();
const partsDir = path.join(root, 'archive_v2');

const orderedParts = [
  'chunk_00.txt',
  'chunk_01.txt',
  'chunk_02.txt',
  'chunk_03.txt',
  'chunk_04.txt',
  'chunk_05.txt',
  'chunk_06.txt',
  'chunk_07.txt',
  'chunk_08_part_00.txt',
  'chunk_08_part_01.txt',
];

for (const name of orderedParts) {
  const fullPath = path.join(partsDir, name);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`[UNA Planner] Missing archive part: ${name}`);
  }
}

const base64 = orderedParts
  .map((name) => fs.readFileSync(path.join(partsDir, name), 'utf8').trim())
  .join('');

const zipBuffer = Buffer.from(base64, 'base64');
const expectedSize = 61340;
const expectedSha1 = 'c22220ff2bb5f62594ac248ad597018cc63e6199';
const actualSha1 = crypto.createHash('sha1').update(zipBuffer).digest('hex');

if (zipBuffer.length !== expectedSize) {
  throw new Error(`[UNA Planner] Archive size mismatch: expected ${expectedSize}, got ${zipBuffer.length}.`);
}
if (actualSha1 !== expectedSha1) {
  throw new Error(`[UNA Planner] Archive checksum mismatch: expected ${expectedSha1}, got ${actualSha1}.`);
}

const zip = new AdmZip(zipBuffer);
const entries = zip.getEntries();
const prefix = 'una_planner_app_v81/';

for (const entry of entries) {
  if (entry.isDirectory || !entry.entryName.startsWith(prefix)) continue;
  const relativePath = entry.entryName.slice(prefix.length);
  if (!relativePath) continue;
  const destination = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, entry.getData());
}

console.log(`[UNA Planner] Validated and reconstructed app from ${orderedParts.length} parts (${zipBuffer.length} bytes, sha1 ${actualSha1}).`);
