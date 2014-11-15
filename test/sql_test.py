import unittest

from pgblackboard import sql


class TryGetSelectingTableAndColsTestCase(unittest.TestCase):
    def _m(self, stmt):
        return sql.try_get_selecting_table_and_cols(stmt)

    def test_single_col(self):
        self.assertEqual(
            self._m('SELECT col FROM table'),
            ('table', ['col'])
        )

    def test_wildcard(self):
        self.assertEqual(
            self._m('SELECT * FROM table'),
            ('table', '*')
        )

    def test_two_cols(self):
        self.assertEqual(
            self._m('SELECT col1, col2 FROM table'),
            ('table', ['col1', 'col2'])
        )

    def test_quoted_idents(self):
        self.assertEqual(
            self._m('SELECT "col1", "col2", "col_with_""quotes""" FROM table'),
            ('table', ['col1', 'col2', 'col_with_"quotes"'])
        )

    def test_full_qualified_idents(self):
        self.assertEqual(
            self._m('SELECT table.col1, table.col2 FROM public.table'),
            ('public.table', ['col1', 'col2'])
        )

    def test_full_qualified_quoted_idents(self):
        self.assertEqual(
            self._m('SELECT table."col1", table."col_with_""quotes""" FROM public."table"'),
            ('public."table"', ['col1', 'col_with_"quotes"'])
        )

    def test_where(self):
        self.assertEqual(
            self._m('SELECT col1, col2 FROM table WHERE true'),
            ('table', ['col1', 'col2'])
        )

    def test_limit(self):
        self.assertEqual(
            self._m('SELECT col1, col2 FROM table LIMIT 10'),
            ('table', ['col1', 'col2'])
        )

    def test_offset(self):
        self.assertEqual(
            self._m('SELECT col1, col2 FROM table OFFSET 20'),
            ('table', ['col1', 'col2'])
        )

    def test_orderby(self):
        self.assertEqual(
            self._m('SELECT col1, col2 FROM table ORDER BY col1'),
            ('table', ['col1', 'col2'])
        )

    def test_limit_offset(self):
        self.assertEqual(
            self._m('SELECT col1, col2 FROM table WHERE true LIMIT 10 OFFSET 20'),
            ('table', ['col1', 'col2'])
        )

    def test_where_limit_offset(self):
        self.assertEqual(
            self._m('SELECT col1, col2 FROM table WHERE true LIMIT 10 OFFSET 20'),
            ('table', ['col1', 'col2'])
        )

    def test_line_comment(self):
        self.assertEqual(
            self._m('-- line comment\nSELECT col FROM table'),
            ('table', ['col'])
        )

    def test_inline_comment(self):
        self.assertEqual(
            self._m('/* inline comment */ SELECT col FROM table'),
            ('table', ['col'])
        )


    def test_join(self):
        self.assertIsNone(
            self._m('SELECT col1, col2 FROM table JOIN table1')
        )

    def test_groupby(self):
        self.assertIsNone(
            self._m('SELECT col1, col2 FROM table GROUP BY col1')
        )


class SplitTestCase(unittest.TestCase):

    def test_split(self):
        self.assertEqual(
            list(sql.split('SELECT 1;SELECT 2;')),
            ['SELECT 1;', 'SELECT 2;']
        )

    def test_split_with_missing_last_semicolon(self):
        self.assertEqual(
            list(sql.split('SELECT 1;SELECT 2')),
            ['SELECT 1;', 'SELECT 2']
        )

    def test_split_fake_dollar_tag(self):
        # make sure that $1, $ is not interpret as dollar tag
        self.assertEqual(
            list(sql.split('SELECT $1, $2; SELECT $1, $2;')),
            ['SELECT $1, $2;', ' SELECT $1, $2;']
        )

    def test_ignore_semicolon_in_literal(self):
        self._test_no_split("SELECT ';', ...")

    def test_ignore_semicolon_in_extended_literal(self):
        self._test_no_split("SELECT e'\\';\\'', ...")
        self._test_no_split("SELECT E'\\';\\'', ...")

    def test_ignore_semicolon_in_ident(self):
        self._test_no_split('SELECT 1 AS ";", ...')

    def test_ignore_semicolon_in_dollar_str(self):
        self._test_no_split('SELECT 1 AS $$;$$, ...')

    def test_ignore_semicolon_in_dollar_str_with_named_tag(self):
        self._test_no_split('SELECT 1 AS $foo_1$;$foo_1$, ...')

    def test_ignore_semicolon_in_dollar_str_nested(self):
        self._test_no_split('SELECT 1 AS $foo_1$ $bar; $foo_1$')

    def test_ignore_semicolon_in_block_comment(self):
        self._test_no_split('SELECT 1/*;*/, ...')

    def test_ignore_semicolon_in_line_comment(self):
        self._test_no_split('SELECT 1 ' '-- one;\n, ...')

    def _test_no_split(self, s):
        self.assertEqual(list(sql.split(s)), [s])


class ExtractDbnameTestCase(unittest.TestCase):
    def test_simple(self):
        self.assertEqual(
            sql.extract_dbname('\\connect postgres\nselect 1'),
            ('postgres', 'select 1', 18)
        )

    def test_empty_first_lines(self):
        self.assertEqual(
            sql.extract_dbname('\n\n\\connect postgres\nselect 1'),
            ('postgres', 'select 1', 20)
        )

    def test_quoted(self):
        self.assertEqual(
            sql.extract_dbname('\\connect "name_with_""quotes"""\nselect 1'),
            ('name_with_"quotes"', 'select 1', 32)
        )

    def test_empty_query(self):
        self.assertEqual(
            sql.extract_dbname('\\connect postgres'),
            ('postgres', '', None)
        )

    def test_empty_query_1(self):
        self.assertEqual(
            sql.extract_dbname('\\connect postgres\n'),
            ('postgres', '', 18)
        )

    def test_missing_connect(self):
        self.assertIsNone(sql.extract_dbname('SELECT 1'))


class StripCommentsTestCase(unittest.TestCase):
    def test_strip_block_comment(self):
        self.assertEqual(
            sql._strip_comments('SELECT 1/* comment */'),
            'SELECT 1'
        )

    def test_strip_line_comment(self):
        self.assertEqual(
            sql._strip_comments('... -- must be stripped'),
            '... '
        )

    def test_strip_line_comment_preserving_linebreak(self):
        self.assertEqual(
            sql._strip_comments('-- must be stripped \nSELECT 1'),
            '\nSELECT 1'
        )

    def test_strip_comment_after_slash_str_literal(self):
        self.assertEqual(
            sql._strip_comments("SELECT '\\'/* must be stripped */"),
            "SELECT '\\'"
        )

    def test_strip_self_close_block_comment(self):
        self.assertEqual(
            sql._strip_comments('SELECT/*/ must be stripped */ ...'),
            'SELECT ...'
        )

    def test_strip_block_comment_in_fake_dollar_str(self):
        self.assertEqual(
            sql._strip_comments(
                'SELECT $1, $2;'
                '/* must be stripped */'
                'SELECT $1, $2;'),
            'SELECT $1, $2;SELECT $1, $2;'
        )

    def test_nostrip_block_comment_in_literal(self):
        self._assert_nostrip("SELECT '/* must NOT be stripped */'")

    def test_nostrip_block_comment_in_extended_literal(self):
        self._assert_nostrip("SELECT e'\\'/* must NOT be stripped */\\''")
        self._assert_nostrip("SELECT E'\\'/* must NOT be stripped */\\''")

    def test_nostrip_line_comment_in_literal(self):
        self._assert_nostrip("'-- must NOT be stripped'")

    def test_nostrip_line_comment_in_extended_literal(self):
        self._assert_nostrip("SELECT e'\\'" "-- must NOT be stripped \\''")
        self._assert_nostrip("SELECT E'\\'" "-- must NOT be stripped \\''")

    def test_nostrip_block_comment_in_dollar_str(self):
        self._assert_nostrip('SELECT $tag_1$/* must NOT be stripped */$tag_1$')

    def test_nostrip_line_comment_in_dollar_str(self):
        self._assert_nostrip('$tag_1$ -- must NOT be stripped $tag_1$')

    def test_nostrip_block_comment_in_dollar_str_with_empty_tag(self):
        self._assert_nostrip("SELECT $$/* must NOT be stripped */$$")

    def _assert_nostrip(self, s):
        self.assertEqual(sql._strip_comments(s), s)