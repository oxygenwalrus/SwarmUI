const { spawn } = require('child_process');
const electronBinary = require('electron');

const env = { ...process.env, VITE_RUNTIME_TARGET: 'electron' };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, ['.'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env,
});

child.on('error', (error) => {
  console.error('Failed to start Electron:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
