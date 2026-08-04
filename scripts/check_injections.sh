#!/usr/bin/env bash
# Golden test for queries/injections.scm.
#
# `tree-sitter test` cannot exercise injections: its highlight assertions
# only check the host-language layer (the test subcommand loads just this
# grammar, so `#set! injection.language "bash"` never resolves). This
# script instead pins the exact capture ranges the injection query
# produces on a fixture covering every pattern.
#
# Usage: scripts/check_injections.sh [--update]
set -euo pipefail

cd "$(dirname "$0")/.."

fixture=test/injection/fixture.nf
expected=test/injection/expected.txt
actual=$(npx tree-sitter-cli query queries/injections.scm "$fixture" 2>/dev/null \
  | grep -v '^Wall time' | sed '/^$/d')

if [[ "${1:-}" == "--update" ]]; then
  printf '%s\n' "$actual" > "$expected"
  echo "updated $expected"
  exit 0
fi

if diff -u "$expected" <(printf '%s\n' "$actual"); then
  echo "injection captures OK"
else
  echo "injection captures CHANGED — inspect the diff; run with --update if intended" >&2
  exit 1
fi
