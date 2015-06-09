select 'CREATE EXTENSION IF NOT EXISTS ' || quote_ident(extname)  || e';\n' as def
from pg_extension
where oid = %(nodeid)s
