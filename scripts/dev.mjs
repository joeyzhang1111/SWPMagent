import { spawn } from 'node:child_process';
import process from 'node:process';

const children = [];
let stopping = false;

function start(command, args, label) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  child.on('error', (error) => {
    console.error(`[${label}] failed to start: ${error.message}`);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`[${label}] stopped (${signal || code || 0}); shutting down the dev stack.`);
      shutdown(code || 1);
    }
  });
  children.push(child);
}

function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(exitCode), 100).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('python', ['-m', 'backend.run'], 'backend');
start(process.execPath, ['node_modules/vite/bin/vite.js'], 'frontend');
