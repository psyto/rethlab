import type { TestCase, ChallengeResult } from '@/types';

/**
 * Pattern-based Python code validator for Hyperliquid SDK challenges.
 * Does NOT execute Python — validates structure and patterns.
 * Also checks that placeholder code has been replaced.
 */
export function validatePython(
  code: string,
  testCases: TestCase[],
  solutionCode: string
): ChallengeResult {
  // First check: reject unmodified starter code (still has pass placeholders)
  const unimplemented = detectUnimplemented(code);
  if (unimplemented.length > 0) {
    return {
      passed: false,
      testResults: testCases.map((tc) => ({
        description: tc.description,
        passed: false,
        actual: `Not implemented: ${unimplemented.join(', ')}`,
        expected: tc.expectedOutput,
      })),
      output: `Functions not yet implemented: ${unimplemented.join(', ')}. Replace "pass" with your code.`,
    };
  }

  // Second check: pattern matching against test cases
  const testResults = testCases.map((tc) => {
    const checks = parseExpectedPatterns(tc.expectedOutput);
    const allPass = checks.every((check) => check.test(code));

    return {
      description: tc.description,
      passed: allPass,
      actual: allPass ? 'Pattern matched' : 'Pattern not found in code',
      expected: tc.expectedOutput,
    };
  });

  // Third check: compare key structures with solution
  const solutionCheck = compareWithSolution(code, solutionCode);
  if (!solutionCheck.passed) {
    return {
      passed: false,
      testResults: testResults.map((r) => ({
        ...r,
        passed: false,
        actual: solutionCheck.message,
      })),
      output: solutionCheck.message,
    };
  }

  const passed = testResults.every((r) => r.passed);

  return {
    passed,
    testResults,
    output: passed
      ? 'All checks passed!'
      : 'Some checks failed. Review the expected patterns and update your code.',
  };
}

/**
 * Detect functions that still have only `pass` as their body (unimplemented).
 * Properly skips multi-line docstrings.
 */
function detectUnimplemented(code: string): string[] {
  const unimplemented: string[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const defMatch = lines[i].match(/^\s*def\s+(\w+)\s*\(/);
    if (!defMatch) continue;

    const funcName = defMatch[1];
    const defIndent = lines[i].match(/^\s*/)?.[0].length ?? 0;

    // Scan the function body, skipping docstrings properly
    let hasRealCode = false;
    let inDocstring = false;
    let docstringDelimiter = '';

    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      const trimmed = line.trim();

      // Handle multi-line docstrings
      if (inDocstring) {
        if (trimmed.includes(docstringDelimiter)) {
          inDocstring = false;
        }
        continue;
      }

      // Detect docstring start
      if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
        const delim = trimmed.startsWith('"""') ? '"""' : "'''";
        // Check if docstring opens and closes on the same line
        const afterOpen = trimmed.slice(3);
        if (!afterOpen.includes(delim)) {
          inDocstring = true;
          docstringDelimiter = delim;
        }
        continue;
      }

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // If we hit a line at same or less indentation, function body is over
      const lineIndent = line.match(/^\s*/)?.[0].length ?? 0;
      if (lineIndent <= defIndent && trimmed) break;

      // `pass` alone is not real implementation
      if (trimmed === 'pass' || trimmed === 'return None' || trimmed === 'return') {
        continue;
      }

      // Any other code means it's implemented
      hasRealCode = true;
      break;
    }

    if (!hasRealCode) {
      unimplemented.push(funcName);
    }
  }

  return unimplemented;
}

/**
 * Compare user code with solution to verify sufficient logic exists.
 */
function compareWithSolution(code: string, solutionCode: string): { passed: boolean; message: string } {
  if (!solutionCode) return { passed: true, message: '' };

  const userLogicLines = countLogicLines(code);
  const solutionLogicLines = countLogicLines(solutionCode);

  if (solutionLogicLines > 0 && userLogicLines < solutionLogicLines * 0.3) {
    return {
      passed: false,
      message: 'Your implementation seems incomplete. Add more logic to your functions.',
    };
  }

  return { passed: true, message: '' };
}

function countLogicLines(code: string): number {
  let inDocstring = false;
  let docDelim = '';

  return code.split('\n').filter((line) => {
    const trimmed = line.trim();

    if (inDocstring) {
      if (trimmed.includes(docDelim)) inDocstring = false;
      return false;
    }
    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      const d = trimmed.startsWith('"""') ? '"""' : "'''";
      if (!trimmed.slice(3).includes(d)) {
        inDocstring = true;
        docDelim = d;
      }
      return false;
    }

    return (
      trimmed &&
      !trimmed.startsWith('#') &&
      !trimmed.startsWith('def ') &&
      !trimmed.startsWith('class ') &&
      !trimmed.startsWith('import ') &&
      !trimmed.startsWith('from ') &&
      trimmed !== 'pass' &&
      trimmed !== 'return None' &&
      trimmed !== 'return'
    );
  }).length;
}

/**
 * Parse expected output string into regex patterns.
 */
function parseExpectedPatterns(expected: string): RegExp[] {
  return expected
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [type, ...rest] = line.split(':');
      const value = rest.join(':').trim();

      switch (type) {
        case 'contains':
          return new RegExp(escapeRegex(value));
        case 'defines':
          return new RegExp(`(def|class)\\s+${escapeRegex(value)}`);
        case 'imports':
          return new RegExp(`(import\\s+${escapeRegex(value)}|from\\s+${escapeRegex(value)})`);
        case 'calls':
          return new RegExp(escapeRegex(value) + '\\s*\\(');
        case 'class':
          return new RegExp(`class\\s+${escapeRegex(value)}`);
        default:
          return new RegExp(escapeRegex(line));
      }
    });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
