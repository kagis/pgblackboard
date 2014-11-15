import re


def split(sql):
    """
    Splits multistatement query by semicolon
    which is not within literal, quoted identifier or comment
    """

    open_close_esc = (
        ("e'", "'", '\\'),
        ("E'", "'", '\\'),
        ("'", "'", None),
        ('"', '"', None),
        ('/*', '*/', None),
        ('--', '\n', None)
    )

    statement = ''
    escaping = False
    escape_symbol = None
    expecting_close_token = None

    for x in sql:
        statement += x

        if escaping:
            escaping = False

        elif x == escape_symbol:
            escaping = True

        elif expecting_close_token:
            if statement.endswith(expecting_close_token):
                expecting_close_token = None
                escape_symbol = None

        elif x == ';':
            yield statement
            statement = ''

        elif x == '$':
            m = _re_dollar_tag_end.search(statement)
            expecting_close_token = m and m.group(0)
        else:
            for open_token, close_token, esc in open_close_esc:
                if statement.endswith(open_token):
                    expecting_close_token = close_token
                    escape_symbol = esc
                    break

    if statement:
        yield statement


def isnotempty(sql):
    return bool(_strip_comments(sql).strip())


def notemptypos(sql):
    return re.search(r'\S', sql).start()


def extract_dbname(sql):
    """
    Extracts database name from `\connect database` on first line
    and returns tuple (database, query, query_position)
    """

    m = re.match(r'''(?ixs)^ \s* \\c(?:onnect)? \s+
                    ({symbol}) [ \t]* (\n)? (.*)'''
                    .format(symbol=_symbol), sql)
    return m and (
        _unquote_symbol(m.group(1)),
        m.group(3) if m.group(2) else '',
        m.start(3) if m.group(2) else None
    )



_symbol    = r'(?: \w+ | (?: "[^"]*")+              )'
_ident     = r'(?: (?:{symbol}\.)?({symbol})        )'.format(symbol=_symbol)
_identlist = r'(?: {ident} (?: \s*,\s* {ident} )*   )'.format(ident=_ident)
_query     = r'''SELECT \s+ (?P<columns>\*|{identlist})
                 \s+ FROM   \s+ (?P<table>{ident})
                 (?: \s+ (?:WHERE|ORDER\s+BY|LIMIT|OFFSET) .* )?'''.format(
                    identlist=_identlist,
                    ident=_ident)

_updatable_query_pattern = re.compile(r'(?ixs)^{query}$'.format(query=_query))
_ident_pattern = re.compile(r'(?ixs){ident}'.format(ident=_ident))


def try_get_selecting_table_and_cols(sql):
    """
    Returns tuple (table, columns) if query is
    simple enough and result rowset can be modified.
    Otherwise returns None.
    """
    sql = _strip_comments(sql).strip(';\n ')
    match = _updatable_query_pattern.match(sql)
    return match and (
        match.group('table'),
        '*' if match.group('columns') == '*' else list(map(
            _unquote_symbol,
            _ident_pattern.findall(match.group('columns'))
        ))
    )


def _unquote_symbol(ident):
    return ident[1:-1].replace('""', '"') \
        if ident.startswith('"') and ident.endswith('"') \
        else ident


def _strip_comments(sql):
    """Strips comments which are not within quotes"""
    return ''.join(__strip_comments(sql))


def __strip_comments(sql):
    it = iter(sql)

    skipping_line = False
    skipping_multiline = False
    slash_escaping = False
    expecting_close_token = ''

    tail = ''
    prev = ''
    x = next(it, '')
    peek = next(it, '')
    while x:
        tail += x

        if skipping_line:
            if x == '\n':
                yield '\n'
                skipping_line = False

        elif skipping_multiline:
            skipping_multiline = (prev + x != '*/')

        elif slash_escaping and prev == '\\':
            yield x

        elif expecting_close_token:
            yield x
            if tail.endswith(expecting_close_token):
                expecting_close_token = ''
                slash_escaping = False

        elif x in '\'"':
            yield x
            expecting_close_token = x
            slash_escaping = (prev in tuple('eE'))

        elif x == '$':
            yield x
            m = _re_dollar_tag_end.search(tail)
            expecting_close_token = m and m.groups(0)

        elif x + peek == '--':
            skipping_line = True

        elif x + peek == '/*':
            peek = next(it)
            skipping_multiline = True

        else:
            yield x


        prev = x
        x = peek
        peek = next(it, '')

_re_dollar_tag_end = re.compile(r'(\$\w*\$)$')

_explain_pattern = r'(?ixs)^ EXPLAIN \(\s*([^\)]+)\)'
_explain_pattern_old = r'(?ixs)^ EXPLAIN (?:\s+(ANALYZE))? (?:\s+(VERBOSE))?'

def is_explain(q):
    m = re.match(pattern, q)
    if m:
        return m.group(1)

    old_pattern = r'(?ixs)^ EXPLAIN (?:\s+(ANALYZE))? (?:\s+(VERBOSE))?'
    m = re.match(old_pattern, q)
    if m:
        return ','.join(list(filter(None, m.groups())))



# if __name__ == '__main__':
#     print(_strip_comments('select 1 /*/ str */ --comment\n;'))
#     print(_strip_comments('select 1/* comment */, \'-- olo\''))