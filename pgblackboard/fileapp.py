import pkgutil, mimetypes, gzip


class ResourceFileApp:
    def __init__(self, path):

        cache_control = '' #'max-age=86400, public' # 1 day cache

        contenttype, _ = mimetypes.guess_type(path)
        if contenttype in ('application/javascript', 'text/css'):
            contenttype += '; charset=utf-8'

        self._content = pkgutil.get_data('pgblackboard', path)
        self._headers = [
            ('Content-Type', contenttype),
            ('Content-Length', str(len(self._content))),
            ('Cache-Control', cache_control)
        ]

        self._gzipped_content = gzip.compress(self._content)
        self._gzipped_headers = [
            ('Content-Type', contenttype),
            ('Content-Length', str(len(self._gzipped_content))),
            ('Cache-Control', cache_control),
            ('Content-Encoding', 'gzip')
        ]

    def __call__(self, environ, start_response):
        if 'gzip' in environ.get('HTTP_ACCEPT_ENCODING', '').split(','):
            start_response('200 OK', self._gzipped_headers)
            yield self._gzipped_content
        else:
            start_response('200 OK', self._headers)
            yield self._content
