/* global process */
// Minimal zero-dependency test harness. Each *.test.js exports a default async function
// that receives `t` and registers assertions.

const state = { passed: 0, failed: 0, failures: [] };

export const makeT = (suite) => {
  const fail = (msg, detail) => {
    state.failed++;
    state.failures.push(`${suite} > ${msg}${detail ? `\n      ${detail}` : ''}`);
    console.error(`  ❌ FAIL: ${msg}${detail ? `\n      ${detail}` : ''}`);
  };
  const pass = (msg) => {
    state.passed++;
    console.log(`  ✅ ${msg}`);
  };

  return {
    ok(condition, msg) {
      condition ? pass(msg) : fail(msg);
    },
    equal(actual, expected, msg) {
      Object.is(actual, expected)
        ? pass(msg)
        : fail(msg, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    /** Compares numbers with a tolerance, for float math. */
    close(actual, expected, tolerance, msg) {
      Math.abs(actual - expected) <= tolerance
        ? pass(msg)
        : fail(msg, `expected ${expected} +/- ${tolerance}, got ${actual}`);
    },
    deepEqual(actual, expected, msg) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      a === b ? pass(msg) : fail(msg, `expected ${b}, got ${a}`);
    },
  };
};

export const report = () => {
  console.log(`\nTests Complete: ${state.passed} Passed, ${state.failed} Failed`);
  if (state.failures.length) {
    console.error('\nFailures:');
    state.failures.forEach((f) => console.error('  - ' + f));
  }
  process.exit(state.failed > 0 ? 1 : 0);
};
