.PHONY: all _all
all: ui
	$(DOCKER_RUN) jimmycuadra/rust sh -c "make _all"
_all:
	cargo build --release --features uibuild

.PHONY: ui _ui
ui:
	$(DOCKER_RUN) node:7 sh -c "make _ui"
_ui: node_modules
	mkdir -p ui/_dist
	OUT_DIR=ui/_dist npm run build

.PHONY: run
run:
	$(DOCKER_RUN) --publish 7890:7890 jimmycuadra/rust \
		sh -c "cargo run -- $(args)"

.PHONY: lint
lint:
	$(DOCKER_RUN) node:7 sh -c "npm run lint"

.PHONY: rust_shell
rust_shell:
	$(DOCKER_RUN) jimmycuadra/rust bash

PGBB_VERSION := 0.2.0
DEB_PACKAGE_DIR := target/release/pgblackboard_$(PGBB_VERSION)-1_amd64

.PHONY: deb _deb
deb: all
	$(DOCKER_RUN) node:7 sh -c "make _deb"
_deb:
	mkdir -p $(DEB_PACKAGE_DIR)/DEBIAN $(DEB_PACKAGE_DIR)/usr/bin
	cp -r debian $(DEB_PACKAGE_DIR)/
	cp target/release/pgblackboard $(DEB_PACKAGE_DIR)/usr/bin/pgblackboard
	dpkg-deb --build $(DEB_PACKAGE_DIR)
	rm -r $(DEB_PACKAGE_DIR)

node_modules: package.json
	npm install

.PHONY: clean
clean:
	rm -r target ui/_dist node_modules

DOCKER_RUN := docker run -it --rm \
	--volume pgblackboard_cargo_reg:/root/.cargo/registry \
	--volume $$PWD:/source \
	--workdir /source