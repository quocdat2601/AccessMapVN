import { runVerificationEngineTests } from '../src/features/contribution/__tests__/verificationEngine.test.ts';
import { runTestImageAdapterTests } from '../src/features/contribution/__tests__/testImageAdapter.test.ts';
import { runTagReviewTests } from '../src/features/contribution/__tests__/tagReview.test.ts';

console.log('====================================================');
console.log('🚀 RUNNING WORKFLOW 1 AUTOMATED TEST SUITES (TDD)');
console.log('====================================================\n');

try {
  runVerificationEngineTests();
  console.log('');
  runTestImageAdapterTests();
  console.log('');
  runTagReviewTests();
  console.log('\n====================================================');
  console.log('🎉 ALL WORKFLOW 1 TEST SUITES PASSED PERFECTLY!');
  console.log('====================================================');
  process.exit(0);
} catch (error) {
  console.error('\n❌ TEST SUITE FAILED:', error);
  process.exit(1);
}
