FROM debian:jessie

RUN apt-get update \
 && apt-get install -y wget tar gzip gcc make

ENV SOURCEURL=https://ftp.postgresql.org/pub/source/v9.5.0/postgresql-9.5.0.tar.gz

RUN mkdir postgresql \
 && cd postgresql \
 && wget --quiet --output-document - $SOURCEURL | tar xzv \
 && cd * \
 && ./configure --without-readline \
                --without-zlib \
                --bindir /usr/bin \
 && make \
 && make install \
 && adduser --disabled-login \
            --disabled-password \
            --no-create-home \
            --gecos postgres \
            postgres \
 && mkdir /postgresql/data \
 && chown postgres /postgresql/data

RUN wget --quiet --output-document - http://postgis.net/stuff/postgis-2.2.2dev.tar.gz | tar xzv --directory /usr/local/src

RUN wget --quiet --output-document - ftp://xmlsoft.org/libxml2/libxml2-git-snapshot.tar.gz | tar xzv --directory /usr/local/src
RUN (cd /usr/local/src/libxml2* && ./configure && make && make install)

RUN apt-get install -y bzip2
RUN wget --quiet --output-document - http://download.osgeo.org/geos/geos-3.5.0.tar.bz2 | tar xjv --directory /usr/local/src
RUN apt-get install -y build-essential
RUN (cd /usr/local/src/geos* && ./configure && make && make install)

RUN wget -qO- https://github.com/OSGeo/proj.4/archive/4.9.2.tar.gz | tar xzv --directory /usr/local/src
RUN (cd /usr/local/src/proj.4* && ./configure && make && make install)


# RUN wget -qO- https://github.com/json-c/json-c/archive/json-c-0.12-20140410.tar.gz | tar xzv --directory /usr/local/src
RUN apt-get install -y bsdtar autoconf automake libtool
RUN wget -qO- https://github.com/json-c/json-c/archive/3859e99f50abe11a8dade28efa9ea3d99dfaac11.zip | bsdtar -xzvf- --directory /usr/local/src
RUN (cd /usr/local/src/json-c* && sh autogen.sh && ./configure && make && make install)

RUN wget -qO- http://download.osgeo.org/gdal/2.0.2/gdal-2.0.2.tar.gz | tar xzv --directory /usr/local/src
RUN (cd /usr/local/src/gdal* && ./configure && make && make install)


ENV LD_LIBRARY_PATH /usr/local/pgsql/lib
RUN ldconfig
RUN (cd /usr/local/src/postgis* \
 && ./configure && make && make install)

RUN (cd /postgresql/postgresql*/contrib/hstore && make && make install)


USER postgres
RUN initdb -D /postgresql/data \
 && (echo "listen_addresses   = '*'"   \
  && echo "log_statement      = 'all'" \
  && echo "fsync              = off"   \
  && echo "full_page_writes   = off"   \
  && echo "synchronous_commit = off"   \
  && echo "autovacuum         = off"   \
 ) > /postgresql/data/postgresql.conf  \

 && echo "host all all all trust" > /postgresql/data/pg_hba.conf



EXPOSE 5432/tcp
CMD postgres -D /postgresql/data
