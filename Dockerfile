FROM node:8.6-alpine
COPY package.json package-lock.json /usr/src/app/
COPY ui /usr/src/app/ui
WORKDIR /usr/src/app
RUN npm install && npm run build

FROM rust:1.21
COPY Cargo.toml Cargo.lock /usr/src/app/
COPY server /usr/src/app/server
WORKDIR /usr/src/app
RUN cargo fetch
COPY --from=0 /usr/src/app/ui/_dist /usr/src/app/ui/_dist
RUN cargo build --release --features uibuild

FROM frolvlad/alpine-glibc
COPY --from=1 /usr/src/app/target/release/pgblackboard /usr/local/bin/
RUN chmod a+x /usr/local/bin/pgblackboard
CMD /usr/local/bin/pgblackboard --postgres $PGBB_POSTGRES
