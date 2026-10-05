#!/usr/bin/env python3
"""Resolve merge conflicts in CHANGELOG.md by combining both sides' entries.

Two branches that each add an entry under `## [Unreleased]` conflict on every
merge. This keeps the base branch's sections and entries in order, then adds
the other side's entries under the matching `### ` heading (creating the
heading in Keep a Changelog order if it is new).

It only touches conflict hunks made of `### ` headings, `- ` entries (with
indented continuation lines) and blank lines. Any other conflict is left for
a person: the script exits 1 without writing.

Usage: scripts/resolve-changelog.py [CHANGELOG.md]
"""

import re
import sys

ORDER = ["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"]

CONFLICT = re.compile(
    r"^<<<<<<< [^\n]*\n(.*?)(?:^\|\|\|\|\|\|\| [^\n]*\n.*?)?^=======\n(.*?)^>>>>>>> [^\n]*\n",
    re.MULTILINE | re.DOTALL,
)


def parse(text, bare=False):
    """Return [(heading, [entry, ...]), ...] or None if text is not just entries."""
    sections = [("", [])] if bare else []
    for line in text.splitlines(keepends=True):
        if line.startswith("### "):
            sections.append((line.strip()[4:], []))
        elif line.startswith("- "):
            if not sections:
                return None
            sections[-1][1].append(line)
        elif line.startswith((" ", "\t")) and line.strip():
            if not sections or not sections[-1][1]:
                return None
            sections[-1][1][-1] += line
        elif line.strip():
            return None
    return sections


def combine(ours, theirs):
    """Their sections and entries first, then ours that they lack."""
    merged = {heading: list(entries) for heading, entries in theirs}
    order = [heading for heading, _ in theirs]
    for heading, entries in ours:
        if heading not in merged:
            merged[heading] = []
            order.append(heading)
        merged[heading] += [e for e in entries if e not in merged[heading]]
    order.sort(key=lambda h: ORDER.index(h) if h in ORDER else len(ORDER))
    return "\n".join(
        (f"### {heading}\n\n" if heading else "") + "".join(merged[heading])
        for heading in order
    )


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "CHANGELOG.md"
    with open(path, encoding="utf-8") as f:
        text = f.read()

    def resolve(match):
        bare = not re.search(r"^### ", match.group(1) + match.group(2), re.MULTILINE)
        if bare:
            prefix = text[:match.start()]
            releases = re.findall(r"^## .+$", prefix, re.MULTILINE)
            if (not releases or releases[-1] != "## [Unreleased]"
                    or prefix.rfind("\n### ") < prefix.rfind("\n## ")):
                raise ValueError(match.group(0))
        ours, theirs = parse(match.group(1), bare), parse(match.group(2), bare)
        if ours is None or theirs is None:
            raise ValueError(match.group(0))
        return combine(ours, theirs)

    try:
        resolved, count = CONFLICT.subn(resolve, text)
    except ValueError as e:
        print(f"{path}: cannot resolve this conflict automatically:\n{e}", file=sys.stderr)
        return 1
    if count == 0 or "<<<<<<< " in resolved:
        print(f"{path}: no conflict this script can resolve", file=sys.stderr)
        return 1

    with open(path, "w", encoding="utf-8") as f:
        f.write(resolved)
    print(f"{path}: resolved {count} conflict(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
