import {
  runVerificationEngineTests,
  runAiLiveImageTests,
} from '../src/features/contribution/__tests__/verificationEngine.test.ts';
import { runTestImageAdapterTests } from '../src/features/contribution/__tests__/testImageAdapter.test.ts';
import { runTagReviewTests } from '../src/features/contribution/__tests__/tagReview.test.ts';

console.log('====================================================');
console.log('🚀 RUNNING WORKFLOW 1 AUTOMATED TEST SUITES (TDD)');
console.log('====================================================\n');

async function main() {
  try {
    runVerificationEngineTests();
    console.log('');
    runTestImageAdapterTests();
    console.log('');
    runTagReviewTests();
    console.log('');
    await runAiLiveImageTests();
    console.log('\n====================================================');
    console.log('🎉 ALL WORKFLOW 1 TEST SUITES PASSED PERFECTLY!');
    console.log('====================================================');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

main();

