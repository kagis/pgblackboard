select format(e'select %s\nfrom %s\nlimit 1000;'
    ,string_agg(quote_ident(attname), e',\n    ' order by attnum)
    ,$1::int::regclass) as def
from pg_attribute
where attrelid = $1 and attnum > 0 and not attisdropped
