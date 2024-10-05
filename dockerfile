FROM denoland/deno:alpine-2.0.0-rc.10 AS deno
EXPOSE 7890
WORKDIR /app
CMD ["pgbb", "postgres://postgres:5432"]
RUN echo \
  $'#!/bin/sh\n' \
  exec deno run \
    --allow-read=/app/ui \
    --allow-net \
    --v8-flags=--stack_trace_limit=30 \
    --no-config \
    --no-remote\
    --no-npm \
    /app/server/pgbb.js \
    '"$@"' \
  | install -m 755 /dev/stdin /usr/local/bin/pgbb

FROM deno AS dev
RUN apk add --no-cache make esbuild
COPY . .

FROM dev AS build
RUN make build

FROM deno
COPY --from=build /app/.dist /app
USER deno
