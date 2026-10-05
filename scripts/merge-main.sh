#!/usr/bin/env bash
# Merge the base branch into the current branch, resolving the conflicts that
# every grammar PR hits once another one lands: the generated parser under
# src/ (regenerated with `tree-sitter generate`, never merged by hand) and
# entries under `## [Unreleased]` in CHANGELOG.md (scripts/resolve-changelog.py).
# Any other conflict, grammar.js included, is left for a person.
#
# The result is a merge commit (no rebase), made only after `npm test` passes.
#
# Usage: scripts/merge-main.sh [--if-conflicted] [base-ref]
#
#   base-ref         what to merge (default: origin/main, fetched first)
#   --if-conflicted  do nothing unless the merge conflicts; the
#                    resolve-conflicts workflow uses this so it does not add
#                    merge commits to PRs that merge cleanly
#
# Exit status: 0 merged, 1 error or tests failed, 2 needs a person,
# 3 nothing to do.
set -euo pipefail

# Runs against whatever branch is checked out, which may predate this script,
# so find the repository from the working directory, not from $0.
here=$(cd "$(dirname "$0")" && pwd)
cd "$(git rev-parse --show-toplevel)"

if_conflicted=false
if [[ "${1:-}" == "--if-conflicted" ]]; then
  if_conflicted=true
  shift
fi
base=${1:-origin/main}

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Working tree has uncommitted changes; commit or stash them first." >&2
  exit 1
fi

if [[ "$base" == origin/* ]]; then
  git fetch --quiet origin "${base#origin/}"
fi

if git merge-base --is-ancestor "$base" HEAD; then
  echo "Already up to date with $base."
  exit 3
fi

if git merge --no-commit --no-ff "$base" >/dev/null; then
  conflicted=false
else
  conflicted=true
fi

if [[ "$if_conflicted" == true && "$conflicted" == false ]]; then
  git merge --abort
  echo "$base merges cleanly; nothing to do."
  exit 3
fi

needs_person=()
while IFS= read -r file; do
  case "$file" in
    src/parser.c | src/grammar.json | src/node-types.json | src/tree_sitter/*)
      # Overwritten by `tree-sitter generate` below.
      git checkout --theirs -- "$file"
      ;;
    CHANGELOG.md)
      if "$here/resolve-changelog.py" CHANGELOG.md; then
        git add CHANGELOG.md
      else
        needs_person+=("$file")
      fi
      ;;
    *)
      needs_person+=("$file")
      ;;
  esac
done < <(git diff --name-only --diff-filter=U)

if (( ${#needs_person[@]} )); then
  git merge --abort
  echo "Conflicts that need a person: ${needs_person[*]}" >&2
  exit 2
fi

# Regenerate even when src/ merged textually: a parser.c stitched together
# from two generations is not a parser for the merged grammar.js.
npx tree-sitter generate
git add src/

if ! npm test; then
  git merge --abort
  echo "Tests fail after merging $base; leaving the branch unchanged." >&2
  exit 1
fi

git commit --quiet --no-edit
echo "Merged $base and regenerated src/."
