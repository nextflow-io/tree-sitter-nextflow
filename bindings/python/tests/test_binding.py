from unittest import TestCase

from tree_sitter import Language, Parser, Query
import tree_sitter_nextflow


class TestLanguage(TestCase):
    def test_can_load_grammar(self):
        try:
            Parser(Language(tree_sitter_nextflow.language()))
        except Exception:
            self.fail("Error loading Nextflow grammar")

    def test_queries_compile(self):
        language = Language(tree_sitter_nextflow.language())
        for query in ("HIGHLIGHTS_QUERY", "INJECTIONS_QUERY", "TAGS_QUERY"):
            with self.subTest(query=query):
                Query(language, getattr(tree_sitter_nextflow, query))
