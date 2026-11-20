import {
  runVerificationEngineTests,
} from '../src/features/contribution/__tests__/verificationEngine.test.ts';
import { runTestImageAdapterTests } from '../src/features/contribution/__tests__/testImageAdapter.test.ts';
import { runTagReviewTests } from '../src/features/contribution/__tests__/tagReview.test.ts';
import { runDiscoveryFilterTests } from '../src/features/discovery/__tests__/discoveryFilter.test.ts';

console.log('====================================================');
console.log('RUNNING CI-SAFE MOBILE UNIT TESTS');
console.log('====================================================\n');

try {
  runVerificationEngineTests();
  console.log('');
  runTestImageAdapterTests();
  console.log('');
  runTagReviewTests();
  console.log('');
  runDiscoveryFilterTests();
  console.log('\nAll CI-safe mobile unit tests passed.');
} catch (error) {
  console.error('\nUnit test suite failed:', error);
  process.exit(1);
}
