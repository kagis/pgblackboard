FROM denoland/deno:alpine-1.45.5
EXPOSE 7890
WORKDIR /app
CMD ["pgbb", "postgres://192.168.55.152:5432"]
COPY . /app
RUN deno install -g --name=pgbb --allow-net --allow-read --v8-flags=--stack_trace_limit=30 server/pgblackboard.js
USER deno
