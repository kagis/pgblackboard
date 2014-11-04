#!/usr/bin/env python3
import setuptools


setuptools.setup(
    name='pgblackboard',
    version='0.1',
    description='Minimalistic GIS enabled interface for PostgreSQL',
    author='exe-dealer',
    author_email='exe-dealer@yandex.ru',
    url='https://github.com/exe-dealer/pgblackboard',
    install_requires=['psycopg2', 'shapely', 'cherrypy'],
    packages=['pgblackboard'],
    keywords=['PostgreSQL', 'Postgres'],
    include_package_data=True,
    test_suite='test',
)
