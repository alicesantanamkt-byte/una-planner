const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const root = process.cwd();
const partsDir = path.join(root, 'deploy_parts');

if (!fs.existsSync(partsDir)) {
  console.log('[UNA Planner] deploy_parts not found; nothing to reconstruct.');
  process.exit(0);
}

const parts = fs.readdirSync(partsDir)
  .filter((name) => name.startsWith('part_'))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

if (!parts.length) {
  throw new Error('[UNA Planner] No archive parts found.');
}

const base64 = parts
  .map((name) => fs.readFileSync(path.join(partsDir, name), 'utf8').trim())
  .join('');

const zipBuffer = Buffer.from(base64, 'base64');
if (zipBuffer.length < 4 || zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4b) {
  throw new Error('[UNA Planner] Reconstructed payload is not a valid ZIP.');
}

const zip = new AdmZip(zipBuffer);
zip.extractAllTo(root, true);

console.log(`[UNA Planner] Reconstructed ${parts.length} archive parts (${zipBuffer.length} bytes).`);
