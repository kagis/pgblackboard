from postgresql.driver import dbapi20
import psycopg2 as dbapi20

try:
    conn = dbapi20.connect(
        user='xed',
        password='pa$$pa$$',
        host='team.obl.kz',
        port=6433,
        database='geoportalkz'
    )
except Exception as e:
    print(e)

cur = conn.cursor()

try:
    print(cur.execute('select 1/0'))
    print(cur.statusmessage)
    print(cur.description)
    print(cur.fetchall())
except Exception as e:
    print(e)




print(cur.execute('select 1'))
print(cur.statusmessage)
print(cur.description)
print(cur.fetchall())
