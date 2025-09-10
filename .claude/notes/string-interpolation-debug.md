# String Interpolation Parsing Issue - Detailed Analysis

## Problem: `string_content` After Interpolation Fails

### Failing Test Case
```nextflow
println("Hello ${name}!")
```

### Current Parsing Behavior
```
✅ (string_content [0, 9] - [0, 15])     // "Hello "
✅ (interpolation [0, 15] - [0, 22])     // "${name}"
❌ (ERROR [0, 22] - [0, 24])             // "!" - should be string_content
```

### Character Position Analysis
```
println("Hello ${name}!")
0123456789012345678901234567
```
- Position 22: `!`
- Position 23: `"` (closing quote)
- ERROR at 22-24: Parser can't handle `!"` as `string_content` + string termination

### Working vs Failing Patterns

#### ✅ Works (Multi-character content)
```bash
echo '"Hello ${name} world"' | tree-sitter parse  # " world" parses as string_content
```

#### ❌ Fails (Single/few characters)
```bash
echo '"Hello ${name}!"'      # "!" fails
echo '"Hello ${name}!!"'     # "!!" fails
echo '"Hello ${name} x"'     # Need to test this
```

## Current Grammar Implementation

### Interpolated String Structure
```javascript
interpolated_string: $ => seq(
  '"',
  repeat(choice(
    alias(token.immediate(prec(1, /[^$"\\]+/)), $.string_content),
    $.escape_sequence,
    $.interpolation
  )),
  '"'
),

interpolation: $ => seq('${', $.simple_expression, '}'),
escape_sequence: $ => token(prec(1, seq('\\', choice(/[bfnrst\\'"\n]/, /u[0-9a-fA-F]{4}/))))
```

### Pattern Analysis
- **Regex**: `/[^$"\\]+/` should match `!` (not $, ", or \)
- **Precedence**: `prec(1)` should handle conflicts
- **Token Immediate**: Should handle context after interpolation

## Hypotheses

### 1. Token Context Issue
**Theory**: `token.immediate()` might not work correctly after interpolation ends
**Test**: Try without `token.immediate()` wrapper

### 2. Lexer State Confusion
**Theory**: After `${...}` ends, lexer may not return to string context properly
**Test**: Check if issue exists with other characters besides `!`

### 3. Alias Pattern Issue
**Theory**: `alias(token.immediate(...), $.string_content)` might cause recursion
**Test**: Try simpler `string_content` definition

## Next Debugging Steps

### 1. Test Character Variations
```bash
echo '"${x}a"' | tree-sitter parse    # Test 'a' after interpolation
echo '"${x}ab"' | tree-sitter parse   # Test 'ab' after interpolation
echo '"${x}123"' | tree-sitter parse  # Test numbers after interpolation
```

### 2. Test Escape Sequences
```bash
echo '"${x}\!"' | tree-sitter parse   # Test escaped exclamation
echo '"${x}\n"' | tree-sitter parse   # Test newline escape
```

### 3. Reference Grammar Testing
```bash
cd /tmp/tree-sitter-nextflow
echo 'println("Hello ${name}!")' | tree-sitter parse  # Test reference implementation
```

## Potential Solutions

### Option 1: Copy Exact Reference Pattern
Use the exact reference grammar implementation with all their complexity

### Option 2: Simplified Approach for v2
Since we're targeting strict syntax, maybe avoid complex token.immediate patterns:
```javascript
interpolated_string: $ => seq(
  '"',
  /[^"]*\$\{/, $.simple_expression, /\}[^"]*/,
  '"'
)
```

### Option 3: External Scanner
Consider using external scanner for string content like some complex grammars do

## Current Status: 95% Working
- ✅ Basic interpolation structure recognized
- ✅ `${variable}` parsing works
- ✅ String content before interpolation works
- ❌ String content after interpolation fails (edge case)

**Priority**: High - this is the final blocker for string interpolation support
