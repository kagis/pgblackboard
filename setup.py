#!/usr/bin/env python3

from setuptools import setup


setup(name='pgblackboard',
    version='0.1',
    description='Minimalistic GIS enabled interface for PostgreSQL',
    author='exe-dealer',
    author_email='exe-dealer@yandex.ru',
    url='https://github.com/exe-dealer/pgblackboard',
    install_requires=['psycopg2', 'shapely', 'cherrypy'],
    packages=['pgblackboard', 'pgblackboard.tree', 'pgblackboard.query'],
    keywords=['PostgreSQL', 'Postgres'],
    package_data={
        'pgblackboard': ['static/*.*', 'static/*/*', 'sql/*']
    },
)
