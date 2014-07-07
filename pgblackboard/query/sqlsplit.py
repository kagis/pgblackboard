def sqlsplit(sql):
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
