FROM frolvlad/alpine-glibc
COPY target/release/pgblackboard /usr/local/bin/
RUN chmod a+x /usr/local/bin/pgblackboard
CMD /usr/local/bin/pgblackboard --postgres $PGBB_POSTGRES
