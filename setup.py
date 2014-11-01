#!/usr/bin/env python3

from distutils.command.build import build as _build
from setuptools.command.bdist_egg import bdist_egg as _bdist_egg

import setuptools



class bdist_egg(_bdist_egg):
    def run(self):
        self.run_command('build_css')
        _bdist_egg.run(self)


class build_css(setuptools.Command):
    description = 'build CSS from SCSS'

    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):
        import pdb; pdb.set_trace();
        print('---------------------' + self.distribution)
        pass # Here goes CSS compilation.


class build(_build):
    sub_commands = _build.sub_commands + [('build_css', None)]



import os

static_files = [
    os.path.join(os.path.relpath(root, 'pgblackboard'), fn)
    for root, dirs, filenames in os.walk('pgblackboard/static')
    for fn in filenames
]

setuptools.setup(name='pgblackboard',
    version='0.1',
    description='Minimalistic GIS enabled interface for PostgreSQL',
    author='exe-dealer',
    author_email='exe-dealer@yandex.ru',
    url='https://github.com/exe-dealer/pgblackboard',
    install_requires=['psycopg2', 'shapely', 'cherrypy'],
    packages=['pgblackboard'],
    keywords=['PostgreSQL', 'Postgres'],
    package_data={ 'pgblackboard': [
         'index.html'

        ,'sql/def/*'
        ,'sql/children/*'
    ] + static_files },

    cmdclass={
        #'bdist_egg': bdist_egg,
        #'build': build,
        #'build_css': build_css,
    },
)
