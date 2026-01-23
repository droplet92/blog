import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TEST_RESULTS = path.join(ROOT, 'test-results');

const KEEP = new Set([
  'latest',
  '.last-run.json'
]);

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(TEST_RESULTS))) return;

  const entries = await fs.readdir(TEST_RESULTS, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      if (KEEP.has(entry.name)) return;
      const full = path.join(TEST_RESULTS, entry.name);
      await fs.rm(full, { recursive: true, force: true });
    })
  );
}

await main();
