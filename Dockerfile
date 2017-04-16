FROM ubuntu:16.04
RUN apt-get update && apt-get install -y curl # file build-essential
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --verbose
RUN curl -sL https://deb.nodesource.com/setup_7.x | bash -
RUN apt-get install -y nodejs
RUN apt-get install -y build-essential
ENV PATH=$PATH:~/.cargo/bin
WORKDIR /root/pgblackboard
CMD cargo build