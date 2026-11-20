import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webAdminRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const ts = require(require.resolve('typescript', { paths: [webAdminRoot, path.resolve(webAdminRoot, '..')] }));

async function importTsModule(relativePath) {
  const fullPath = path.join(webAdminRoot, relativePath);
  const source = fs.readFileSync(fullPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: fullPath,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const encoded = Buffer.from(outputText, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

console.log('====================================================');
console.log('RUNNING WEB-ADMIN UNIT TESTS');
console.log('====================================================\n');

try {
  const moderationPres = await importTsModule(
    'src/entities/community-moderation/lib/presentation.ts'
  );
  const contributionPres = await importTsModule(
    'src/entities/contribution/lib/presentation.ts'
  );
  const formatLib = await importTsModule('src/shared/lib/format.ts');
  const runtimeCfg = await importTsModule('src/shared/config/runtime.ts');

  // 1. Community moderation ETag, date formatting, and label dictionaries
  assert.strictEqual(moderationPres.formatEtagFromVersion(undefined), undefined);
  assert.strictEqual(moderationPres.formatEtagFromVersion(0), '"0"');
  assert.strictEqual(moderationPres.formatEtagFromVersion(4), '"4"');
  assert.strictEqual(moderationPres.formatAdminDate(undefined), '—');
  assert.strictEqual(moderationPres.formatAdminDate('not-a-date'), 'not-a-date');
  assert.ok(moderationPres.formatAdminDate('2026-05-01T10:30:00Z').length > 4);

  for (const dict of [
    moderationPres.featureLabels,
    moderationPres.publishedStatusLabels,
    moderationPres.disputeStatusLabels,
    moderationPres.disputeDecisionLabels,
    moderationPres.reportStatusLabels,
    moderationPres.reportReasonLabels,
    moderationPres.commentStatusLabels,
  ]) {
    const entries = Object.entries(dict);
    assert.ok(entries.length > 0);
    for (const [k, v] of entries) {
      assert.strictEqual(typeof v, 'string', `Expected label string for ${k}`);
      assert.ok(v.trim().length > 0, `Expected non-empty label for ${k}`);
    }
  }
  assert.ok('WrongAddressOrPin' in moderationPres.reportReasonLabels);
  assert.ok('RecordPublication' in moderationPres.disputeDecisionLabels);
  assert.ok('CreateAdvisory' in moderationPres.disputeDecisionLabels);
  console.log('  ✅ Community moderation presentation helpers (PASSED)');

  // 2. Contribution waiting time & status metadata
  assert.strictEqual(contributionPres.formatWaitingTime(0), 'Đã hoàn tất');
  assert.strictEqual(contributionPres.formatWaitingTime(45), 'Chờ 45 phút');
  assert.strictEqual(contributionPres.formatWaitingTime(120), 'Chờ 2 giờ');
  assert.strictEqual(contributionPres.formatWaitingTime(135), 'Chờ 2 giờ 15 phút');
  assert.strictEqual(contributionPres.contributionStatusMeta.pending.badge, 'blue');
  assert.strictEqual(contributionPres.contributionStatusMeta.published.badge, 'teal');
  console.log('  ✅ Contribution presentation helpers (PASSED)');

  // 3. Number/percent formatting
  assert.strictEqual(typeof formatLib.formatNumber(12345), 'string');
  assert.strictEqual(typeof formatLib.formatCompactNumber(12345), 'string');
  assert.ok(formatLib.formatPercent(75.5, 1).endsWith('%'));
  console.log('  ✅ Shared format helpers (PASSED)');

  // 4. Runtime config helpers
  const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prevPub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const prevAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const prevApi = process.env.NEXT_PUBLIC_API_BASE_URL;
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.strictEqual(runtimeCfg.isSupabaseConfigured(), false);
    assert.throws(() => runtimeCfg.getSupabasePublicConfig());

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    assert.strictEqual(runtimeCfg.isSupabaseConfigured(), true);
    assert.deepStrictEqual(runtimeCfg.getSupabasePublicConfig(), {
      url: 'https://example.supabase.co',
      publishableKey: 'anon-key',
    });

    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:5256/';
    assert.strictEqual(runtimeCfg.getApiBaseUrl(), 'http://localhost:5256');
  } finally {
    if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
    if (prevPub === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = prevPub;
    if (prevAnon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevAnon;
    if (prevApi === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = prevApi;
  }
  console.log('  ✅ Runtime config helpers (PASSED)');

  console.log('\nAll web-admin unit tests passed.');
} catch (error) {
  console.error('\nWeb-admin unit test suite failed:', error);
  process.exit(1);
}
