# Tree-sitter Nextflow Development Roadmap

## Current Status
**Test Results**: 28/80 passing (35% coverage)
- **Major Achievement**: Transformed from 21 → 28 passing tests (+33% improvement)
- **Architecture**: Clean conflict-free minimal parser with incremental enhancement capability
- **Language Injection**: Bash/shell syntax highlighting fully functional

## Completed Milestones ✅

### Phase 1: Foundation (Grammar Rewrite)
- Complete grammar rewrite to eliminate all conflicts
- Minimal viable parser architecture 
- Language injection preservation
- 10/10 core tests passing

### Phase 2: Variable Declarations (5 → 5 tests)
- Binary expressions with arithmetic operators
- Assignment statements (x = 42)
- List literals ([1, 2, 3])  
- Map literals ([key: value])
- Channel expressions (Channel.from())
- **Result**: All variable declaration tests passing

### Phase 3: Expression System (+7 tests)
- Binary operators: +, -, *, /, %, **, ==, !=, <, >, <=, >=, &&, ||, .., ..<
- Parenthesized expressions for precedence  
- Command expressions (println "text")
- Function calls (foo("arg"))
- If/else control structures with blocks
- **Result**: 28 total passing tests

## Immediate Priorities 🎯

### 1. Complete String Interpolation (High Impact)
**Status**: 90% implemented, needs `string_content` token fix
**Blocker**: `token.immediate()` handling for content after `${var}`
**Solution**: Apply exact pattern from reference grammar
**Impact**: +6 tests, ecosystem compatibility

### 2. Fix Process Definition Regressions (Quality)
**Issue**: 3 previously passing tests now failing
**Affected**: Process input/output blocks broken by expression changes
**Impact**: Restore stability, maintain language injection

### 3. AST-grep Integration (Strategic)
**Status**: Documentation complete, grammar ready
**Actions**: 
- Build dynamic library: `tree-sitter build --output nextflow.so`
- Create `sgconfig.yml` configuration
- Test integration with sample Nextflow files
**Impact**: Enable Nextflow in ast-grep ecosystem

## Feature Implementation Queue 📋

### Tier 1: Core Language Features (High Impact)
- **String Interpolation** (6 tests): `"Hello ${var}"`, property access, templates
- **Advanced Closures** (4 tests): Multi-parameter, complex closures
- **Channel Operations** (7 tests): Remaining pipe operations, advanced methods

### Tier 2: Language Constructs (Medium Impact)  
- **Control Flow** (3 tests): For/while loops, switch statements
- **Workflow Features** (3 tests): Take/main/emit, process invocations  
- **Data Structures** (3 tests): Ranges, sets, complex collections

### Tier 3: Advanced Features (Lower Priority)
- **Configuration** (3 tests): Config files, profiles, environment
- **Error Handling** (3 tests): Try/catch blocks, error directives
- **DSL Features** (6 tests): Advanced channels, operators, methods

## Technical Debt & Optimizations

### Precedence System Upgrade
**Current**: Flat precedence levels (causing operator precedence issues)
**Solution**: Implement PREC constant system from reference grammars
**Benefit**: Resolve remaining binary expression precedence failures

### Expression Architecture Evolution
**Current**: Single `simple_expression` with all choices
**Future**: Consider layered architecture (_expression → _callable_expression → _juxtable_expression)
**Benefit**: Cleaner grammar organization, better conflict resolution

### Performance Considerations
- First-time compilation after `tree-sitter generate` takes longer (C compilation)
- Subsequent generations are much faster
- Token usage optimization through targeted file testing

## Success Metrics

### Quantitative Goals
- **Short-term**: 35 → 45 passing tests (+28% improvement)
- **Medium-term**: 50+ passing tests (60%+ coverage)
- **Long-term**: 70+ passing tests (comprehensive Nextflow support)

### Qualitative Goals
- **Editor Integration**: Full syntax highlighting + IntelliSense
- **Tool Ecosystem**: ast-grep, language servers, formatters
- **Developer Experience**: Accurate parsing of real-world Nextflow files
- **Community Value**: Reference implementation for Nextflow tooling

## Lessons Learned

### What Worked Well
1. **Minimal Viable Parser**: Starting simple and adding incrementally
2. **Reference Research**: Learning from existing grammars saved significant time
3. **Test-Driven Development**: Enabling tests one by one ensured progress visibility
4. **Language Injection**: Maintained throughout all changes

### Challenges Overcome  
1. **Grammar Conflicts**: Solved with complete rewrite approach
2. **Expression Precedence**: Managed through careful precedence assignment
3. **Test Alignment**: Updated expectations to match grammar structure
4. **Complex Syntax**: Broke down into manageable incremental features

### Future Considerations
- **Token Handling**: `token.immediate()` and `alias()` patterns need careful implementation
- **Conflict Management**: Prefer precedence over conflicts where possible  
- **Test Organization**: Maintain clear correlation between test files and grammar features