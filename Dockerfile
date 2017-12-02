FROM debian:jessie
EXPOSE 7890
RUN apt-get update && apt-get install -y python3 python3-psycopg2
COPY pgblackboard /usr/src/app/pgblackboard
WORKDIR /usr/src/app
ENTRYPOINT ["python3", "-m", "pgblackboard"]
