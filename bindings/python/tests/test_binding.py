from unittest import TestCase

from tree_sitter import Language, Parser, Query
import tree_sitter_nextflow


class TestLanguage(TestCase):
    def test_parses_nextflow_workflow(self):
        parser = Parser(Language(tree_sitter_nextflow.language()))
        source = b'workflow {\n  println "Hello"\n}\n'
        tree = parser.parse(source)
        self.assertFalse(tree.root_node.has_error, str(tree.root_node))
        self.assertEqual(tree.root_node.type, "source_file")
        self.assertEqual(tree.root_node.end_byte, len(source))

    def test_reports_invalid_nextflow(self):
        parser = Parser(Language(tree_sitter_nextflow.language()))
        tree = parser.parse(b"workflow {")
        self.assertTrue(tree.root_node.has_error)

    def test_queries_compile(self):
        language = Language(tree_sitter_nextflow.language())
        for query in ("HIGHLIGHTS_QUERY", "INJECTIONS_QUERY", "TAGS_QUERY"):
            with self.subTest(query=query):
                Query(language, getattr(tree_sitter_nextflow, query))
