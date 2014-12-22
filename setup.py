#!/usr/bin/env python3

try:
    from setuptools import setup
except:
    from distutils.core import setup


setup(
    name='pgblackboard',
    version='0.1',
    description='Minimalistic GIS enabled interface for PostgreSQL',
    author='exe-dealer',
    author_email='exe-dealer@yandex.ru',
    url='https://github.com/exe-dealer/pgblackboard',
    install_requires=['psycopg2>=2.4.5'],
    packages=['pgblackboard', 'pgblackboard.wsgiserver'],
    keywords=['PostgreSQL', 'Postgres'],
    include_package_data=True,
    test_suite='test',
    package_data={ 'pgblackboard': [
         'index.html'

        ,'static/favicon.ico'
        ,'static/app.js'
        ,'static/app.css'
        ,'static/table.js'
        ,'static/table.css'
        ,'static/map.js'
        ,'static/map.css'
        ,'static/queryplan.js'
        ,'static/queryplan.css'

        ,'static/codemirror-pgsql.js'

        ,'static/lib/codemirror/4.6.0/codemirror.js'
        ,'static/lib/codemirror/4.6.0/mode/sql/sql.js'
        ,'static/lib/codemirror/4.6.0/addon/search/searchcursor.js'
        ,'static/lib/codemirror/4.6.0/keymap/sublime.js'
        ,'static/lib/codemirror/4.6.0/addon/edit/matchbrackets.js'
        ,'static/lib/codemirror/4.6.0/addon/edit/closebrackets.js'
        ,'static/lib/codemirror/4.6.0/codemirror.css'
        ,'static/lib/knockout/3.2.0/knockout.js'
        ,'static/lib/knockout-flatBindingProvider/1.0.0/knockout-flatBindingProvider.js'
        ,'static/lib/d3/3.4.11/d3.js'
        ,'static/lib/dagre-d3/0.2.9/dagre-d3.js'
        ,'static/lib/leaflet/0.7.3/leaflet.js'
        ,'static/lib/leaflet/0.7.3/leaflet.css'

        ,'sql/def/*.sql'
        ,'sql/children/*.sql'
    ]},
)
