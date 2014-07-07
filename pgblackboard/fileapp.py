import pkgutil, mimetypes


class ResourceFileApp:
    def __init__(self, path):
        self._content = pkgutil.get_data('pgblackboard', path)
        self._contenttype, _ = mimetypes.guess_type(path)
        if type(self._content) is str:
            self._contenttype += '; charset=utf-8'
            self._content = self._content.encode()

    def __call__(self, environ, start_response):
        start_response('200 OK', [
            ('Content-type', self._contenttype)
        ])
        yield self._content
