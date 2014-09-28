import unittest

from pgblackboard import sql


class ParseUpdatableTestCase(unittest.TestCase):

    def test_single_col(self):
        self.assertEqual(
            sql.parse_updatable('SELECT col FROM table'),
            ('table', ['col'])
        )

    def test_wildcard(self):
        self.assertEqual(
            sql.parse_updatable('SELECT * FROM table'),
            ('table', '*')
        )

    def test_two_cols(self):
        self.assertEqual(
            sql.parse_updatable('SELECT col1, col2 FROM table'),
            ('table', ['col1', 'col2'])
        )

    def test_quoted_idents(self):
        self.assertEqual(
            sql.parse_updatable('SELECT "col1", "col2", "col_with_""quotes""" FROM table'),
            ('table', ['col1', 'col2', 'col_with_"quotes"'])
        )

    def test_full_qualified_idents(self):
        self.assertEqual(
            sql.parse_updatable('SELECT table.col1, table.col2 FROM public.table'),
            ('public.table', ['col1', 'col2'])
        )

    def test_full_qualified_quoted_idents(self):
        self.assertEqual(
            sql.parse_updatable('SELECT table."col1", table."col_with_""quotes""" FROM public."table"'),
            ('public."table"', ['col1', 'col_with_"quotes"'])
        )

    def test_where(self):
        self.assertEqual(
            sql.parse_updatable('SELECT col1, col2 FROM table WHERE true'),
            ('table', ['col1', 'col2'])
        )

    def test_limit(self):
        self.assertEqual(
            sql.parse_updatable('SELECT col1, col2 FROM table LIMIT 10'),
            ('table', ['col1', 'col2'])
        )

    def test_offset(self):
        self.assertEqual(
            sql.parse_updatable('SELECT col1, col2 FROM table OFFSET 20'),
            ('table', ['col1', 'col2'])
        )

    def test_orderby(self):
        self.assertEqual(
            sql.parse_updatable('SELECT col1, col2 FROM table ORDER BY col1'),
            ('table', ['col1', 'col2'])
        )

    def test_limit_offset(self):
        self.assertEqual(
            sql.parse_updatable('SELECT col1, col2 FROM table WHERE true LIMIT 10 OFFSET 20'),
            ('table', ['col1', 'col2'])
        )

    def test_where_limit_offset(self):
        self.assertEqual(
            sql.parse_updatable('SELECT col1, col2 FROM table WHERE true LIMIT 10 OFFSET 20'),
            ('table', ['col1', 'col2'])
        )

    def test_line_comment(self):
        self.assertEqual(
            sql.parse_updatable('-- line comment\nSELECT col FROM table'),
            ('table', ['col'])
        )

    def test_inline_comment(self):
        self.assertEqual(
            sql.parse_updatable('/* inline comment */ SELECT col FROM table'),
            ('table', ['col'])
        )


    def test_join(self):
        self.assertIsNone(
            sql.parse_updatable('SELECT col1, col2 FROM table JOIN table1')
        )

    def test_groupby(self):
        self.assertIsNone(
            sql.parse_updatable('SELECT col1, col2 FROM table GROUP BY col1')
        )


class SplitTestCase(unittest.TestCase):

    def test_simple(self):
        self.assertEqual(
            list(sql.split('SELECT 1;SELECT 2;')),
            ['SELECT 1;', 'SELECT 2;']
        )

    def test_missing_last_semicolon(self):
        self.assertEqual(
            list(sql.split('SELECT 1;SELECT 2')),
            ['SELECT 1;', 'SELECT 2']
        )

    def test_listeral(self):
        self.assertEqual(
            list(sql.split("SELECT ';';SELECT 2;")),
            ["SELECT ';';", 'SELECT 2;']
        )


    def test_dollar_quoted(self):
        self.assertEqual(
            list(sql.split('SELECT 1 as $$;$$;SELECT 2;')),
            ['SELECT 1 as $$;$$;', 'SELECT 2;']
        )

    def test_named_dollar_quoted(self):
        self.assertEqual(
            list(sql.split('SELECT 1 as $foo$;$foo$;SELECT 2;')),
            ['SELECT 1 as $foo$;$foo$;', 'SELECT 2;']
        )

    def test_ident(self):
        self.assertEqual(
            list(sql.split('SELECT 1 as ";";SELECT 2;')),
            ['SELECT 1 as ";";', 'SELECT 2;']
        )

    def test_inline_comments(self):
        self.assertEqual(
            list(sql.split('SELECT 1/*;*/;SELECT 2;')),
            ['SELECT 1/*;*/;', 'SELECT 2;']
        )

    def test_line_comment(self):
        self.assertEqual(
            list(sql.split('SELECT 1 ' '-- one;\n;SELECT 2;')),
            ['SELECT 1 ' '-- one;\n;', 'SELECT 2;']
        )


class StripCommentsTestCase(unittest.TestCase):
    def test_inline(self):
        self.assertEqual(
            sql._strip_comments('/* comment */SELECT 1'),
            'SELECT 1'
        )

    def test_line(self):
        self.assertEqual(
            sql._strip_comments('-- comment\nSELECT 1'),
            '\nSELECT 1'
        )

    def test_inline_literal(self):
        self.assertEqual(
            sql._strip_comments("SELECT '/* comment */'"),
            "SELECT '/* comment */'"
        )

    def test_line_literal(self):
        self.assertEqual(
            sql._strip_comments("'-- comment'"),
            "'-- comment'"
        )

    def test_inline_dollar_quoted(self):
        self.assertEqual(
            sql._strip_comments("$$/* comment */$$"),
            "$$/* comment */$$"
        )

    def test_line_dollar_quoted(self):
        self.assertEqual(
            sql._strip_comments("$$-- comment$$"),
            "$$-- comment$$"
        )
