import html, binascii, json


def isnum(typeid):
    return any(n
        for name, tid, arr_tid, n, renderer
        in PGTYPES
        if tid == typeid)

def get_type_name(typeid):
    for name, tid, arr_tid, n, renderer in PGTYPES:
        if tid == typeid:
            return name
        if arr_tid == typeid:
            return name + '[]';
    return str(typeid)

def get_type_renderer(typeid):
    for name, tid, arr_tid, n, renderer in PGTYPES:
        if tid == typeid:
            return renderer
        if arr_tid == typeid:
            return array_renderer(renderer)
    return render_unknown


def render_unknown(val):
    if isinstance(val, list):
        return array_renderer(render_unknown)(val)
    return render_text(val)


def array_renderer(render_elem):
    def fn(val):
        return '{' + ', '.join(render_elem(el) for el in val) + '}'
    return fn


def render_bytea(val):
    # if is_jpeg(obj):
    #     return '<img src="data:image/jpeg;base64,' + \
    #             base64.b64encode(obj).decode() + \
    #             '" alt="" />'
    return '\\x' + binascii.hexlify(bytes(val)).decode()

def is_jpeg(b):
    return b[:2] == b'\xFF\xD8' and b[-2:] == b'\xFF\xD9'


def render_bool(val):
    return 'true' if val else 'false'


def render_json(val):
    if type(val) is str:
        val = json.loads(val)

    return json.dumps(val, ensure_ascii=False, indent=2, default=str)


def render_text(val):
    return html.escape(str(val)).replace(' ', '&nbsp;')



PGTYPES = (
   #('typename'                      ,    oid, typarr, isnum, renderer   ),
    ('abstime'                       ,    702,   1023, False, render_text),
    ('aclitem'                       ,   1033,   1034, False, render_text),
    ('any'                           ,   2276,   None, False, render_text),
    ('anyarray'                      ,   2277,   None, False, render_text),
    ('anyelement'                    ,   2283,   None, False, render_text),
    ('anyenum'                       ,   3500,   None, False, render_text),
    ('anynonarray'                   ,   2776,   None, False, render_text),
    ('anyrange'                      ,   3831,   None, False, render_text),
    ('bit'                           ,   1560,   1561, False, render_text),
    ('bool'                          ,     16,   1000, False, render_bool),  ######
    ('box'                           ,    603,   1020, False, render_text),
    ('bpchar'                        ,   1042,   1014, False, render_text),
    ('bytea'                         ,     17,   1001, False, render_bytea), ######
    ('cardinal_number'               ,  11535,   None, False, render_text),
    ('char'                          ,     18,   1002, False, render_text),
    ('cid'                           ,     29,   1012, False, render_text),
    ('cidr'                          ,    650,    651, False, render_text),
    ('circle'                        ,    718,    719, False, render_text),
    ('cstring'                       ,   2275,   1263, False, render_text),
    ('date'                          ,   1082,   1182, False, render_text),
    ('daterange'                     ,   3912,   3913, False, render_text),
    ('float4'                        ,    700,   1021,  True, render_text),
    ('float8'                        ,    701,   1022,  True, render_text),
    ('gtsvector'                     ,   3642,   3644, False, render_text),
    ('inet'                          ,    869,   1041, False, render_text),
    ('int2'                          ,     21,   1005,  True, render_text),
    ('int4'                          ,     23,   1007,  True, render_text),
    ('int4range'                     ,   3904,   3905, False, render_text),
    ('int8'                          ,     20,   1016,  True, render_text),
    ('int8range'                     ,   3926,   3927, False, render_text),
    ('internal'                      ,   2281,   None, False, render_text),
    ('interval'                      ,   1186,   1187, False, render_text),
    ('json'                          ,    114,    199, False, render_json),  ######
    ('line'                          ,    628,    629, False, render_text),
    ('lseg'                          ,    601,   1018, False, render_text),
    ('macaddr'                       ,    829,   1040, False, render_text),
    ('money'                         ,    790,    791, False, render_text),
    ('name'                          ,     19,   1003, False, render_text),
    ('numeric'                       ,   1700,   1231,  True, render_text),
    ('numrange'                      ,   3906,   3907, False, render_text),
    ('oid'                           ,     26,   1028, False, render_text),
    ('opaque'                        ,   2282,   None, False, render_text),
    ('path'                          ,    602,   1019, False, render_text),
    ('point'                         ,    600,   1017, False, render_text),
    ('polygon'                       ,    604,   1027, False, render_text),
    ('record'                        ,   2249,   2287, False, render_text),
    ('refcursor'                     ,   1790,   2201, False, render_text),
    ('regclass'                      ,   2205,   2210, False, render_text),
    ('regconfig'                     ,   3734,   3735, False, render_text),
    ('regdictionary'                 ,   3769,   3770, False, render_text),
    ('regoper'                       ,   2203,   2208, False, render_text),
    ('regoperator'                   ,   2204,   2209, False, render_text),
    ('regproc'                       ,     24,   1008, False, render_text),
    ('regprocedure'                  ,   2202,   2207, False, render_text),
    ('regtype'                       ,   2206,   2211, False, render_text),
    ('reltime'                       ,    703,   1024, False, render_text),
    ('smgr'                          ,    210,   None, False, render_text),
    ('text'                          ,     25,   1009, False, render_text),
    ('tid'                           ,     27,   1010, False, render_text),
    ('time'                          ,   1083,   1183, False, render_text),
    ('time_stamp'                    ,  11542,   None, False, render_text),
    ('timestamp'                     ,   1114,   1115, False, render_text),
    ('timestamptz'                   ,   1184,   1185, False, render_text),
    ('timetz'                        ,   1266,   1270, False, render_text),
    ('tinterval'                     ,    704,   1025, False, render_text),
    ('trigger'                       ,   2279,   None, False, render_text),
    ('tsquery'                       ,   3615,   3645, False, render_text),
    ('tsrange'                       ,   3908,   3909, False, render_text),
    ('tstzrange'                     ,   3910,   3911, False, render_text),
    ('tsvector'                      ,   3614,   3643, False, render_text),
    ('txid_snapshot'                 ,   2970,   2949, False, render_text),
    ('udt_privileges'                ,  11704,   None, False, render_text),
    ('unknown'                       ,    705,   None, False, render_text),
    ('usage_privileges'              ,  11711,   None, False, render_text),
    ('user_defined_types'            ,  11718,   None, False, render_text),
    ('user_mapping_options'          ,  11785,   None, False, render_text),
    ('user_mappings'                 ,  11789,   None, False, render_text),
    ('uuid'                          ,   2950,   2951, False, render_text),
    ('varbit'                        ,   1562,   1563, False, render_text),
    ('varchar'                       ,   1043,   1015, False, render_text),
    ('void'                          ,   2278,   None, False, render_text),
    ('xid'                           ,     28,   1011, False, render_text),
    ('xml'                           ,    142,    143, False, render_text),
)
