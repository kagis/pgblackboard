select pg_get_functiondef(%(oid)s::int::regproc) as def
