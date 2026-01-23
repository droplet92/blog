import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const WORKSPACE_ROOT = process.cwd();

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    yield fullPath;
  }
}

function isLatestArtifactFile(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  return normalized.startsWith('test-results/latest/') && normalized.toLowerCase().endsWith('.png');
}

async function* safeWalk(dir) {
  try {
    for await (const filePath of walk(dir)) {
      yield filePath;
    }
  } catch {
    // Directory doesn't exist or is unreadable.
  }
}

async function sha256File(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
  const latestFiles = [];

  // Only scan the intended output folder to avoid noise from deps (node_modules)
  // and to keep the output focused on what humans should check.
  const latestRoot = path.join(WORKSPACE_ROOT, 'test-results', 'latest');
  for await (const filePath of safeWalk(latestRoot)) {
    const rel = path.relative(WORKSPACE_ROOT, filePath).replaceAll('\\', '/');
    if (isLatestArtifactFile(rel)) latestFiles.push(filePath);
  }

  latestFiles.sort((a, b) => a.localeCompare(b));

  if (latestFiles.length === 0) {
    console.log('Latest artifacts: (none)');
    console.log('  Run `npm test` to generate test-results/latest/*.png');
  } else {
    console.log('Latest artifacts:');
    for (const filePath of latestFiles) {
      const stat = await fs.stat(filePath);
      const rel = path.relative(WORKSPACE_ROOT, filePath).replaceAll('\\', '/');
      const hash = await sha256File(filePath);

      console.log(`${rel}`);
      console.log(`  mtime: ${stat.mtime.toISOString()}`);
      console.log(`  size:  ${stat.size} bytes`);
      console.log(`  sha256:${hash}`);
    }
  }

  if (latestFiles.length === 0) {
    process.exitCode = 1;
  }
}

await main();
