import { spawn } from 'node:child_process';

const target = process.argv[2] === 'electron' ? 'electron' : 'web';
const env = {
  ...process.env,
  VITE_RUNTIME_TARGET: target,
};

function run(command, args) {
  return new Promise((resolve, reject) => {
    const spawnCommand = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : command;
    const spawnArgs = process.platform === 'win32'
      ? ['/d', '/s', '/c', command, ...args]
      : args;
    const child = spawn(spawnCommand, spawnArgs, {
      cwd: process.cwd(),
      stdio: 'inherit',
      env,
      windowsHide: true,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${spawnCommand} ${spawnArgs.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

try {
  await run('tsc', ['-b']);
  await run('vite', ['build']);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
