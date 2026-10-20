const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

const root = process.cwd();
const archiveDir = path.join(root, 'archive_v2');
const files = [
  'chunk_00.txt',
  'chunk_01.txt',
  'chunk_02.txt',
  'chunk_03.txt',
  'rest_04_08.txt',
];

for (const name of files) {
  const fullPath = path.join(archiveDir, name);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`[UNA Planner] Missing validated archive part: ${name}`);
  }
}

const base64 = files
  .map((name) => fs.readFileSync(path.join(archiveDir, name), 'utf8').trim())
  .join('');

const zipBuffer = Buffer.from(base64, 'base64');
const expectedBytes = 61340;
const expectedSha1 = 'c22220ff2bb5f62594ac248ad597018cc63e6199';
const actualSha1 = crypto.createHash('sha1').update(zipBuffer).digest('hex');

if (zipBuffer.length !== expectedBytes) {
  throw new Error(`[UNA Planner] Archive size mismatch: expected ${expectedBytes}, got ${zipBuffer.length}.`);
}

if (actualSha1 !== expectedSha1) {
  throw new Error(`[UNA Planner] Archive checksum mismatch: expected ${expectedSha1}, got ${actualSha1}.`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'una-planner-'));
const zip = new AdmZip(zipBuffer);
zip.extractAllTo(tempDir, true);

const extractedRoot = path.join(tempDir, 'una_planner_app_v81');
if (!fs.existsSync(path.join(extractedRoot, 'app')) || !fs.existsSync(path.join(extractedRoot, 'package.json'))) {
  throw new Error('[UNA Planner] Valid archive extracted, but expected app root was not found.');
}

for (const name of fs.readdirSync(extractedRoot)) {
  fs.cpSync(path.join(extractedRoot, name), path.join(root, name), {
    recursive: true,
    force: true,
  });
}

fs.rmSync(tempDir, { recursive: true, force: true });
console.log(`[UNA Planner] Validated and reconstructed full app (${zipBuffer.length} bytes, sha1 ${actualSha1}).`);
