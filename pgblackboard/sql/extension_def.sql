select 'CREATE EXTENSION IF NOT EXISTS ' || quote_ident(extname)  || ';' as def
from pg_extension
where oid = %(node)s
