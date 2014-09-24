import re

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


def extract_dbname(sql):
    m = re.match(r'''(?ixs)^ \s* \\c(?:onnect)? \s+
                    ({symbol}) [ \t]* \n (.*)'''
                    .format(symbol=_symbol), sql)
    if m:
        db, query = m.groups()
        return _unquote_symbol(db), query, m.start(2)



_symbol    = r'(?: \w+ | (?: "[^"]*")+              )'
_ident     = r'(?: (?:{symbol}\.)?({symbol})        )'.format(symbol=_symbol)
_identlist = r'(?: {ident} (?: \s*,\s* {ident} )*   )'.format(ident=_ident)
_query     = r'''SELECT \s+ (?P<columns>\*|{identlist})
                 \s+ FROM   \s+ (?P<table>{ident})
                 (?: \s+ (?:WHERE|LIMIT|OFFSET) .* )?'''.format(
                    identlist=_identlist,
                    ident=_ident)

_updatable_query_pattern = re.compile(r'(?ixs)^{query}$'.format(query=_query))
_ident_pattern = re.compile(r'(?ixs){ident}'.format(ident=_ident))


def parse_updatable_query(q):
    match = _updatable_query_pattern.match(q.strip(';\n '))
    return match and (
        match.group('table'),
        list(map(_unquote_symbol, _ident_pattern.findall(match.group('columns'))))
    )


def _unquote_symbol(ident):
    return ident[1:-1].replace('""', '"') \
        if ident.startswith('"') and ident.endswith('"') \
        else ident


def _strip_comments(sql):
    return re.sub(r'--.*', '',
        re.sub(r'(?s)/\*.*?\*/', '', sql)
    )
