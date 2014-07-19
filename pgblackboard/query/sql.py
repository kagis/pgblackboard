import re, sqlparse


def split(sql):
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
    dollar_quote_opening = False

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

        elif dollar_quote_opening:
            dollar_quote += x
            if x == '$':
                expecting_close_token = dollar_quote
                dollar_quote_opening = False

        elif x == ';':
            yield statement
            statement = ''

        else:
            if x == '$':
                dollar_quote_opening = True
                dollar_quote = '$'
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


def extract_connect(sql):
    m = re.match(r'(?ixs)^ \s* \\connect \s+ (\w+) (.*)', sql)
    if m:
        db, query = m.groups()
        return db, query, m.start(2)


def parse_select(sql):
    sql = _strip_comments(sql).rstrip(' ;').strip()
    try:
        stmt, = sqlparse.parse(sql)
    except:
        return

    tokens = (t for t in stmt.tokens if not t.is_whitespace())
    try:
        select, columns, from_, table, *where = tokens
    except:
        return

    if (select.is_keyword and select.value == 'select' and
        isinstance(columns, (sqlparse.sql.Identifier, sqlparse.sql.IdentifierList)) and
        from_.is_keyword and from_.value == 'from' and
        isinstance(table, sqlparse.sql.Identifier) and
        (not where or (len(where) == 1 and isinstance(where[0], sqlparse.sql.Where)))
        ):

        columns_idents = ([columns]
            if isinstance(columns, sqlparse.sql.Identifier)
            else columns.get_identifiers()
        )

        sqlid_re = r'((\w+|"[^"]+")\.)?(\w+|"[^"]+")'
        return table.value, [
            ident.value if re.fullmatch(sqlid_re, ident.value) else None
            for ident in columns_idents
        ]

def _strip_comments(sql):
    return re.sub(r'--.*', '',
        re.sub(r'(?s)/\*.*?\*/', '', sql)
    )
