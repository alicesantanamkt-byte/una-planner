const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

const root = process.cwd();
const partsDir = path.join(root, 'archive_v2');

function readText(name) {
  const fullPath = path.join(partsDir, name);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`[UNA Planner] Missing archive part: ${name}`);
  }
  return fs.readFileSync(fullPath, 'utf8').trim();
}

function readHexText(...names) {
  const hex = names.map(readText).join('');
  return Buffer.from(hex, 'hex').toString('utf8');
}

const base64 = [
  readText('chunk_00.txt'),
  readHexText('hex01_0.txt', 'hex01_1.txt'),
  readText('chunk_02.txt'),
  readText('chunk_03.txt'),
  readHexText('hex04_0.txt', 'hex04_1.txt'),
  readText('chunk_05.txt'),
  readHexText('hex06_0.txt', 'hex06_1.txt'),
  readText('chunk_07.txt'),
  readText('chunk_08_part_00.txt'),
  readText('chunk_08_part_01.txt'),
].join('');

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

console.log(`[UNA Planner] Validated and reconstructed app (${zipBuffer.length} bytes, sha1 ${actualSha1}).`);
