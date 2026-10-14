import { runAiLiveImageTests } from '../src/features/contribution/__tests__/verificationEngine.test.ts';

console.log('Running live AI integration tests. The AI service must be available on port 8000.');

try {
  await runAiLiveImageTests();
  console.log('\nLive AI integration tests passed.');
} catch (error) {
  console.error('\nLive AI integration tests failed:', error);
  process.exit(1);
}
