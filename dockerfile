FROM node:10.6-alpine
COPY package.json package-lock.json /usr/src/app/
WORKDIR /usr/src/app
RUN npm install
COPY ui /usr/src/app/ui
RUN mkdir -p ui/_dist && npm run build

FROM rust:1.29
COPY Cargo.toml Cargo.lock /usr/src/app/
WORKDIR /usr/src/app
RUN cargo fetch
RUN rustup target add x86_64-unknown-linux-musl
COPY server /usr/src/app/server
COPY --from=0 /usr/src/app/ui/_dist /usr/src/app/ui/_dist
ARG CARGO_ARGS="--release --features uibuild"
RUN cargo build --target=x86_64-unknown-linux-musl $CARGO_ARGS

FROM scratch
EXPOSE 7890
ENV PGBB_POSTGRES host.docker.internal:5432
WORKDIR /opt/pgblackboard
CMD ["/opt/pgblackboard/pgblackboard"]
COPY --from=1 /usr/src/app/target/x86_64-unknown-linux-musl/*/pgblackboard ./
