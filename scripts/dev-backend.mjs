import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const environmentPath = join(repositoryRoot, 'infra', '.env');
const exampleEnvironmentPath = join(repositoryRoot, 'infra', '.env.example');
const mobileEnvironmentPath = join(repositoryRoot, 'mobile', '.env');

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
let mobileEnvironment = {};
try {
  mobileEnvironment = readEnvironment(mobileEnvironmentPath);
} catch {
  // Authentication remains unavailable locally until the developer configures mobile/.env.
}

const supabaseUrl = mobileEnvironment.EXPO_PUBLIC_SUPABASE_URL;
const authEnvironment =
  typeof supabaseUrl === 'string' &&
  /^https:\/\//i.test(supabaseUrl) &&
  !supabaseUrl.includes('your-project.supabase.co')
    ? { Supabase__Url: supabaseUrl }
    : {};

const useLocalDb = process.env.USE_LOCAL_DB === 'true' || process.argv.includes('--local-db');

const connectionEnv = useLocalDb
  ? { ConnectionStrings__SupabaseConnection: connectionString }
  : {};

if (useLocalDb) {
  console.log(`[backend] Dùng PostgreSQL local: 127.0.0.1:${port}/${database}`);
} else {
  console.log('[backend] Dùng PostgreSQL Supabase Cloud (theo dotnet user-secrets / appsettings).');
}

console.log(
  authEnvironment.Supabase__Url
    ? '[backend] Xác thực JWT dùng Supabase URL từ mobile/.env.'
    : '[backend] Chưa có Supabase URL hợp lệ; các thao tác cần đăng nhập sẽ bị từ chối.'
);
const child = spawn('dotnet', ['run', '--project', 'backend/src/WebApi/AccessMapVN.WebApi.csproj'], {
  cwd: repositoryRoot,
  stdio: 'inherit',
  env: { ...process.env, ...connectionEnv, ...authEnvironment },
  windowsHide: false,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code) => process.exit(code ?? 1));
