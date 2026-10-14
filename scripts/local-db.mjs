import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(repositoryRoot, 'infra', '.env');
const exampleEnvPath = join(repositoryRoot, 'infra', '.env.example');

function parseEnv(path) {
  const result = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    result[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return result;
}

let localEnv;
try {
  localEnv = parseEnv(envPath);
} catch {
  console.error('[local-db] Thiếu infra/.env. Chạy: Copy-Item infra/.env.example infra/.env');
  process.exit(1);
}
const defaults = parseEnv(exampleEnvPath);
const value = (name) => localEnv[name] || defaults[name];
const database = value('ACCESSMAP_DB_NAME') || 'accessmapvn';
const user = value('ACCESSMAP_DB_USER') || 'accessmap';
const password = value('ACCESSMAP_DB_PASSWORD') || 'accessmap_dev_only';
const port = value('ACCESSMAP_DB_PORT') || '5432';
const composeArgs = ['compose', '--env-file', 'infra/.env', '-f', 'infra/docker-compose.dev.yml'];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    windowsHide: true,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : options.input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
    input: options.input,
    env: options.env || process.env,
  });
  if (result.error) {
    console.error(`[local-db] Không chạy được ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    if (options.capture && result.stderr) console.error(result.stderr.trim());
    process.exit(result.status ?? 1);
  }
  return result.stdout?.trim() || '';
}

function requirePostgres() {
  const container = run('docker', [...composeArgs, 'ps', '--status', 'running', '-q', 'postgres'], { capture: true });
  if (!container) {
    console.error('[local-db] PostgreSQL local chưa chạy. Hãy chạy npm run dev:infra trước.');
    process.exit(1);
  }
}

function migrate() {
  requirePostgres();
  const connection = `Host=127.0.0.1;Port=${port};Database=${database};Username=${user};Password=${password}`;
  console.log(`[local-db] Áp migration vào PostgreSQL LOCAL 127.0.0.1:${port}/${database}...`);
  run('dotnet', [
    'ef', 'database', 'update',
    '--project', 'backend/src/Infrastructure/AccessMapVN.Infrastructure.csproj',
    '--startup-project', 'backend/src/WebApi/AccessMapVN.WebApi.csproj',
  ], { env: { ...process.env, ConnectionStrings__SupabaseConnection: connection } });
}

function psql(sql) {
  requirePostgres();
  run('docker', [
    ...composeArgs, 'exec', '-T', 'postgres',
    'psql', '-v', 'ON_ERROR_STOP=1', '-U', user, '-d', database,
  ], { input: sql });
}

const command = process.argv[2];
switch (command) {
  case 'migrate':
    migrate();
    break;
  case 'seed-wf02':
    migrate();
    console.log('[local-db] Thêm/cập nhật địa điểm demo WF-02...');
    psql(readFileSync(join(repositoryRoot, 'infra', 'seed-wf02.sql'), 'utf8'));
    console.log('[local-db] Hoàn tất. Tìm địa điểm: [WF-02 DEMO] Trung tâm Phục vụ Cộng đồng');
    break;
  case 'tables':
    psql("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename;\n");
    break;
  default:
    console.error('Usage: node scripts/local-db.mjs <migrate|seed-wf02|tables>');
    process.exit(1);
}
