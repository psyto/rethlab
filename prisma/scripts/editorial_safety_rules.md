# RethLab Editorial Safety Rules (Non-destructive Pass)

## Goal
Improve readability without changing technical meaning.

## Immutable Elements (must not change)
- Numeric values, ranges, percentages, and thresholds
- Math expressions and formulas
- API names, method names, function signatures, type names
- Protocol constants, addresses, chain IDs, and slugs
- Step order where execution semantics depend on sequence
- Quiz correctness and answer keys

## Allowed Edits
- Split long paragraphs
- Remove duplicate phrasing
- Replace translation-ese with plain wording
- Convert dense prose into flat bullet lists
- Tighten transitions and remove filler

## Guardrails
- No new technical claims
- No deletion of prerequisite caveats
- No replacement of exact code identifiers
- Preserve all code blocks and command lines verbatim

## Verification Checklist
1. Key terms and identifiers still present
2. All numbers and ranges unchanged
3. All command examples unchanged
4. Quiz options/answers unchanged
5. The same conclusion can be derived by the reader
