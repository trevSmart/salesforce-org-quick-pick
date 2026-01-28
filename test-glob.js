// Test script for simpleGlobMatch function
function simpleGlobMatch(text, pattern) {
  // First escape special characters (except * and ? which are wildcards)
  // Then convert wildcards to RegExp equivalents
  const regexPattern = '^' + pattern
    .replace(/[-/\\^$+.()|[\]{}]/g, '\\$&')  // Escape special characters except * and ?
    .replace(/\*/g, '.*')   // *  → .*
    .replace(/\?/g, '.')    // ?  → .
  + '$';

  const regex = new RegExp(regexPattern);
  return regex.test(text);
}

// Test cases
const testCases = [
  { pattern: 'Vodafone*', text: 'Vodafone - dev11pro', expected: true },
  { pattern: 'Vodafone*', text: 'Vodafone - dev12', expected: true },
  { pattern: 'Vodafone*', text: 'Vodafone - devrubik', expected: true },
  { pattern: 'Vodafone*', text: 'Vodafone - qa1', expected: true },
  { pattern: 'Vodafone*', text: 'Vodafone', expected: true },
  { pattern: 'Vodafone*', text: 'Other Org', expected: false },
  { pattern: 'Vodafone*', text: 'VodafoneX', expected: true },
  { pattern: 'DEV*', text: 'DEV1', expected: true },
  { pattern: 'DEV*', text: 'DEV - test', expected: true },
  { pattern: '*TEST*', text: 'MY TEST ORG', expected: true },
  { pattern: '*TEST*', text: 'TEST', expected: true },
];

console.log('Testing simpleGlobMatch function:\n');
let passed = 0;
let failed = 0;

testCases.forEach(({ pattern, text, expected }) => {
  const result = simpleGlobMatch(text, pattern);
  const status = result === expected ? '✓ PASS' : '✗ FAIL';
  if (result === expected) {
    passed++;
  } else {
    failed++;
  }
  console.log(`${status} | Pattern: "${pattern}" | Text: "${text}" | Expected: ${expected} | Got: ${result}`);

  if (result !== expected) {
    // Show the regex pattern for debugging
    const regexPattern = '^' + pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
    + '$';
    console.log(`  Debug: Regex pattern = ${regexPattern}`);
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
