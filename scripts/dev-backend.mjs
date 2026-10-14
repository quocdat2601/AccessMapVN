import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const environmentPath = join(repositoryRoot, 'infra', '.env');
const exampleEnvironmentPath = join(repositoryRoot, 'infra', '.env.example');

function readEnvironment(path) {
  const values = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator > 0) values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return values;
}

let localEnvironment;
try {
  localEnvironment = readEnvironment(environmentPath);
} catch {
  localEnvironment = readEnvironment(exampleEnvironmentPath);
  console.warn('[backend] Không thấy infra/.env; đang dùng các giá trị local mặc định.');
}

const database = localEnvironment.ACCESSMAP_DB_NAME || 'accessmapvn';
const user = localEnvironment.ACCESSMAP_DB_USER || 'accessmap';
const password = localEnvironment.ACCESSMAP_DB_PASSWORD || 'accessmap_dev_only';
const port = localEnvironment.ACCESSMAP_DB_PORT || '5432';
const connectionString = `Host=127.0.0.1;Port=${port};Database=${database};Username=${user};Password=${password}`;

console.log(`[backend] Dùng PostgreSQL local: 127.0.0.1:${port}/${database}`);
const child = spawn('dotnet', ['run', '--project', 'backend/src/WebApi/AccessMapVN.WebApi.csproj'], {
  cwd: repositoryRoot,
  stdio: 'inherit',
  env: { ...process.env, ConnectionStrings__SupabaseConnection: connectionString },
  windowsHide: false,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code) => process.exit(code ?? 1));
