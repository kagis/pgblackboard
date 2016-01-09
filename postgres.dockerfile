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
