import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const cmd = isWindows ? 'npx.cmd' : 'npx';
const args = ['playwright', 'test'];

const child = spawn(cmd, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    E2E_ARTIFACTS: '1'
  }
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
