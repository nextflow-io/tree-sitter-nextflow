# Tree-sitter Grammar Reference Analysis

## Overview
Analysis of existing tree-sitter grammars for Nextflow development insights.

## Key Reference Repositories
- **tree-sitter-groovy**: `/tmp/tree-sitter-groovy` - Groovy language patterns
- **tree-sitter-nextflow**: `/tmp/tree-sitter-nextflow` - Existing Nextflow implementation

## Critical Patterns Discovered

### 1. Sophisticated Precedence System
Both grammars use detailed precedence constants:
```javascript
const PREC = {
  DEFAULT: 1,
  PRIORITY: 2,
  ELVIS: 3, // ?:
  OR: 4, // ||
  AND: 5, // &&
  BIN_OR: 6, // |
  BIN_XOR: 7, // ^
  BIN_AND: 8, // &
  COMPARE_EQ: 9, // == != <=> === !== =~ ==~
  COMPARE: 10, // < <= > >= in !in instanceof !instanceof as
  SHIFT: 11, // << >> >>> .. ..< <..< <..
  PLUS: 12, // + -
  STAR: 13, // * / %
  UNARY: 14, // +x -x ++x --x
  POW: 15, // **
  TOP: 16, // new () [] {} . .& .@ ?. * *. *: ~ ! (type) x[y] ++ --
  STATEMENT: 17
}
```

### 2. String Interpolation Implementation
**Key Pattern from tree-sitter-nextflow**:
```javascript
interpolation: $ => seq(
  '$',
  choice(
    seq('{', $._expression, '}'),
    alias(token.immediate(/[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*/), $.identifier),
  )
),

_interpolate_string: $ => choice(
  seq(
    '"',
    repeat(choice(
      alias(token.immediate(prec(1, /[^$\\"\n]+/)), $.string_content),
      $.escape_sequence,
      $.interpolation,
    )),
    '"',
  ),
  // ... other string types
)
```

**Critical Insights**:
- Uses `token.immediate()` with `alias()` for string content
- Supports both `${expr}` and `$identifier` syntax
- Separates escape sequences from content
- Multiple string types (plain, interpolated, triple-quoted, slashy, dollar-slashy)

### 3. Expression Architecture
**Comparison**:
- **Our approach**: Flat `simple_expression` with all choices
- **Reference approach**: Layered with `_expression`, `_callable_expression`, `_juxtable_expression`

### 4. Conflict Resolution Strategies
- Both grammars use minimal conflicts arrays
- Heavy reliance on precedence instead of conflicts
- Dynamic precedence and heuristics mentioned in TODOs

## Implementation Recommendations

### Immediate: Fix String Interpolation
**Issue**: `token.immediate()` usage for `string_content` after interpolations
**Solution**: Adopt exact pattern from reference grammar:
```javascript
string_content: $ => alias(token.immediate(prec(1, /[^$\\"\n]+/)), $.string_content)
```

### Medium-term: Precedence Refactoring
**Current**: Single precedence levels cause operator precedence issues
**Solution**: Implement PREC constant system for proper operator precedence

### Long-term: Architecture Evolution
**Current**: Minimal viable parser approach
**Future**: Consider layered expression architecture from references

## String Interpolation Debug Notes

### Current Status (90% Complete)
- ✅ Basic `${variable}` recognition working
- ✅ `interpolated_string` and `interpolation` nodes created
- ❌ `string_content` after interpolation fails (`!"` in `"Hello ${name}!"`)

### Suspected Issue
- `token.immediate()` usage may be incorrect
- Need exact pattern from reference: `alias(token.immediate(prec(1, regex)), $.string_content)`

### Test Case Failing
```nextflow
println "Hello ${name}!"
```
**Current Output**: Works until `!"` at end
**Expected**: Full interpolated string with proper string_content nodes

## Reference Grammar File Locations
- Groovy interpolation: `/tmp/tree-sitter-groovy/grammar.js:645`
- Nextflow interpolation: `/tmp/tree-sitter-nextflow/grammar.js:726`
- Precedence systems: Both files lines 1-19
