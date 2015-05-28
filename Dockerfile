FROM ubuntu:14.04

RUN apt-key adv --keyserver keyserver.ubuntu.com --recv C03264CD6CADC10BFD6E708B37FD5E80BD6B6386 \
 && echo 'deb http://ppa.launchpad.net/hansjorg/rust/ubuntu trusty main' >> /etc/apt/sources.list \
 && apt-get update \
 && apt-get install -y  nodejs \
                        nodejs-legacy \
                        npm \
                        rust-nightly \
                        cargo-nightly

COPY / /usr/local/src/pgblackboard
RUN cd /usr/local/src/pgblackboard \
 && make


CMD /usr/local/src/pgblackboard/output/pgblackboard
