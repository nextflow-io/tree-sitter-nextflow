"""Regression tests for the changelog merge used by Resolve conflicts."""

import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/resolve-changelog.py"


class ResolveChangelogTests(unittest.TestCase):
    def resolve(self, source):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "CHANGELOG.md"
            path.write_text(source, encoding="utf-8")
            result = subprocess.run(["python3", str(SCRIPT), str(path)], capture_output=True)
            return result.returncode, path.read_text(encoding="utf-8")

    def test_entries_only_conflict_under_existing_heading(self):
        source = (
            "## [Unreleased]\n\n### Fixed\n\n- Existing fix.\n"
            "<<<<<<< HEAD\n- Division fix.\n=======\n- Section fix.\n"
            ">>>>>>> origin/main\n\n## [0.4.0]\n"
        )
        code, resolved = self.resolve(source)
        self.assertEqual(code, 0)
        self.assertEqual(
            resolved,
            "## [Unreleased]\n\n### Fixed\n\n- Existing fix.\n"
            "- Section fix.\n- Division fix.\n\n## [0.4.0]\n",
        )

    def test_entries_without_unreleased_section_remain_unresolved(self):
        source = (
            "## [0.4.0]\n\n### Fixed\n\n"
            "<<<<<<< HEAD\n- Old fix.\n=======\n- Other fix.\n"
            ">>>>>>> origin/main\n"
        )
        code, resolved = self.resolve(source)
        self.assertEqual(code, 1)
        self.assertEqual(resolved, source)


if __name__ == "__main__":
    unittest.main()
