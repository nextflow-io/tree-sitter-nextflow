# String Interpolation Implementation Guide

## Problem Statement
Implement Nextflow/Groovy string interpolation (`"Hello ${variable}!"`) in tree-sitter grammar.

## Current Status: 90% Complete

### ✅ Working
- `interpolated_string` node recognition
- `interpolation` node with `${expression}` syntax
- `string_content` before interpolation
- Basic variable interpolation: `"Hello ${name}"` ✅

### ❌ Issues
- `string_content` after interpolation fails
- Example: `"Hello ${name}!"` - the `!"` part generates ERROR
- Token positions 22-24 in `"Hello ${name}!"` not parsing

## Reference Implementation Analysis

### From `/tmp/tree-sitter-nextflow/grammar.js` (lines 674-720):

```javascript
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
  // ... other variants
),

interpolation: $ => seq(
  '$',
  choice(
    seq('{', $._expression, '}'),
    alias(token.immediate(/[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*/), $.identifier),
  )
),
```

### Key Differences from Our Implementation:

1. **`alias(token.immediate(prec(1, regex)), $.string_content)`** vs our `$.string_content`
2. **`escape_sequence` support** (we don't have this)
3. **`/[^$\\"\n]+/`** (includes newline handling)
4. **`$._expression`** vs our `$.simple_expression`

## Proposed Fix

### Option 1: Exact Reference Pattern
Replace our string interpolation with exact reference pattern:
```javascript
interpolated_string: $ => seq(
  '"',
  repeat(choice(
    alias(token.immediate(prec(1, /[^$\\"\n]+/)), $.string_content),
    $.interpolation,
  )),
  '"'
),

string_content: $ => /[^$\\"\n]+/, // Remove our current token.immediate wrapper
```

### Option 2: Add Escape Sequence Support
Add missing escape sequence handling:
```javascript
escape_sequence: $ => token(prec(1, seq(
  '\\',
  choice(/[bfnrst\\'"\n]/, /u[0-9a-fA-F]{4}/)
)))
```

## Test Cases to Validate

### Basic Interpolation
```nextflow
"Hello ${name}!"           // Currently: 90% working (!" fails)
"${variable}"              // Should work
"text ${expr} more text"   // Multiple content sections
```

### Advanced Interpolation (Future)
```nextflow
"${process.out[0]}"        // Property/method access
"Count: ${items.size()}"   // Method calls in interpolation
"${x + y * 2}"            // Complex expressions
```

### Expected AST Structure
```
(interpolated_string
  (string_content)         // "Hello "
  (interpolation           // "${name}"
    (identifier))          // name
  (string_content))        // "!"
```

## Debug Commands for String Interpolation

```bash
# Test specific interpolation patterns
echo '"Hello ${name}!"' | tree-sitter parse
echo '"${variable}"' | tree-sitter parse
echo '"text ${expr} more"' | tree-sitter parse

# Debug with detailed parsing logs
echo '"Hello ${name}!"' | tree-sitter parse --debug

# Test interpolation within command expressions
echo 'println "Hello ${name}!"' | tree-sitter parse
```

## Priority: HIGH
**Rationale**: String interpolation is fundamental to Nextflow - enables 6 skipped tests and ecosystem compatibility.
**Next Action**: Apply reference pattern exactly, test, then iterate.
