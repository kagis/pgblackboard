FROM node:9.4-alpine
COPY package.json package-lock.json /usr/src/app/
WORKDIR /usr/src/app
RUN npm install
COPY ui /usr/src/app/ui
RUN mkdir -p ui/_dist && npm run build

FROM rust:1.27
COPY Cargo.toml Cargo.lock /usr/src/app/
WORKDIR /usr/src/app
RUN cargo fetch
COPY server /usr/src/app/server
COPY --from=0 /usr/src/app/ui/_dist /usr/src/app/ui/_dist
ARG CARGO_ARG="--release --features uibuild"
RUN cargo build $CARGO_ARGS

FROM frolvlad/alpine-glibc
EXPOSE 7890
ENV PGBB_POSTGRES host.docker.internal:5432
WORKDIR /opt/pgblackboard
CMD ["/opt/pgblackboard/pgblackboard"]
COPY --from=1 /usr/src/app/target/*/pgblackboard ./
