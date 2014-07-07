select format(e'select %%1$s\nfrom %%2$s\nlimit 1000;\n\n'
           || e'/*\n CREATE MATERIALIZED VIEW %%2$s AS\n%%3$s\n*/'
    ,string_agg(quote_ident(attname), e',\n    ' order by attnum)
    ,%(oid)s::int::regclass
    ,pg_get_viewdef(%(oid)s)) as def
from pg_attribute
where attrelid = %(oid)s and attnum > 0 and not attisdropped
