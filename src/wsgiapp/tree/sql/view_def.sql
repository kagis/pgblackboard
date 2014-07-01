select format(e'select %1$s\nfrom %2$s\nlimit 1000;\n\n'
           || e'/*\n CREATE VIEW %2$s AS\n%3$s\n*/'
    ,string_agg(quote_ident(attname), e',\n    ' order by attnum)
    ,$1::int::regclass
    ,pg_get_viewdef($1)) as def
from pg_attribute
where attrelid = $1 and attnum > 0 and not attisdropped
