// Runs the server (tsx watch, :3000) and the client (Vite, :5173) together.
// Plain Node so it works the same on Windows, macOS and Linux without extra deps.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const workspaces = [
  { name: 'server', pkg: '@keyclashr/server', dir: 'server' },
  { name: 'client', pkg: '@keyclashr/client', dir: 'client' },
];

const hasDevScript = (dir) => {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL(`../${dir}/package.json`, import.meta.url), 'utf8'),
    );
    return typeof pkg.scripts?.dev === 'string';
  } catch {
    return false;
  }
};

const children = workspaces
  .filter((w) => hasDevScript(w.dir))
  .map((w) => {
    const child = spawn('npm', ['run', 'dev', '-w', w.pkg], { stdio: 'inherit', shell: true });
    child.on('exit', (code) => {
      console.log(`[dev] ${w.name} exited with code ${code ?? 'null'}`);
      shutdown(code ?? 1);
    });
    return child;
  });

if (children.length === 0) {
  console.error('[dev] no workspace has a "dev" script yet');
  process.exit(1);
}

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
