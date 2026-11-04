#!/usr/bin/env python3
"""Measure the grammar's parse rate over a corpus of real Nextflow files.

Parses every *.nf file under the given directories and reports the share that
parse without ERROR/MISSING nodes, plus the most common failing constructs
(clustered by error-context signature) so grammar work can be prioritised.
Exits non-zero if any file fails.

Usage:
    pip install ast-grep-py
    npx tree-sitter build --output libnextflow.so  # .dylib on macOS
    export NEXTFLOW_TS_LIB=libnextflow.so
    python scripts/parse-rate.py path/to/nf-core-modules/modules [more dirs...]
"""

import os
import sys
from collections import Counter
from pathlib import Path

from ast_grep_py import SgRoot, register_dynamic_language

LIB = os.environ.get("NEXTFLOW_TS_LIB") or sys.exit("NEXTFLOW_TS_LIB must point to the built parser library")

register_dynamic_language(
    {
        "nextflow": {
            "library_path": LIB,
            "language_symbol": "tree_sitter_nextflow",
            "expando_char": "_",
            "extensions": ["nf"],
        }
    }
)


def signature(err, source_lines):
    """Cluster key for an error: the first line of the offending source."""
    line = source_lines[err.range().start.line].strip()
    return line[:80]


def main(dirs):
    files = [f for d in dirs for f in sorted(Path(d).rglob("*.nf"))]
    clean, failed = 0, 0
    sigs = Counter()
    examples = {}
    for f in files:
        src = f.read_text(encoding="latin1")
        root = SgRoot(src, "nextflow").root()
        errors = root.find_all(kind="ERROR")
        if not errors:
            clean += 1
            continue
        failed += 1
        lines = src.splitlines()
        for e in errors[:5]:  # cap per file so one broken file doesn't dominate
            s = signature(e, lines)
            sigs[s] += 1
            examples.setdefault(s, f)

    total = clean + failed
    print(f"\nparse rate: {clean}/{total} ({100 * clean / total:.1f}%) error-free")
    print(f"\ntop failing constructs ({failed} files with errors):")
    for sig, count in sigs.most_common(25):
        print(f"{count:5}  {sig}")
        print(f"       e.g. {examples[sig]}")
    return failed


if __name__ == "__main__":
    sys.exit(1 if main(sys.argv[1:] or ["."]) else 0)
