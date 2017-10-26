RUST_IMAGE := rust:1.21

.PHONY: all
all: ui
	$(DOCKER_RUN) $(RUST_IMAGE) sh -c "cargo build --release --features uibuild"

.PHONY: ui
ui: node_modules
	mkdir -p ui/_dist
	$(DOCKER_RUN) node:8.6-alpine sh -c "npm run build"

.PHONY: start
start:
	$(DOCKER_RUN) --publish 7890:7890 $(RUST_IMAGE) \
		sh -c "cargo run -- $(args)"

.PHONY: build_dev
build_dev:
	$(DOCKER_RUN) $(RUST_IMAGE) sh -c "cargo build"

.PHONY: lint
lint:
	$(DOCKER_RUN) node:8.6-alpine sh -c "npm run lint"

.PHONY: rust_shell
rust_shell:
	$(DOCKER_RUN) $(RUST_IMAGE) bash

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

node_modules:
	$(DOCKER_RUN) node:8.6-alpine npm install

.PHONY: clean
clean:
	rm -r target ui/_dist node_modules

DOCKER_RUN := docker run -it --rm \
	--volume $$PWD/.cargo_registry:/usr/local/cargo/registry \
	--volume $$PWD:/source \
	--workdir /source


FONTELLO_DIR  ?= ./ui/style/fontello

.PHONY: fontello-open
fontello-open:
	curl --silent --show-error --fail --output .fontello \
		--form "config=@${FONTELLO_DIR}/config.json" \
		http://fontello.com
	echo http://fontello.com/`cat .fontello`

.PHONY: fontello-save
fontello-save:
	@if test ! -e .fontello ; then \
		echo 'Run `make fontello-open` first.' >&2 ; \
		exit 128 ; \
		fi
	rm -rf .fontello.src .fontello.zip
	curl --silent --show-error --fail --output .fontello.zip \
		http://fontello.com/`cat .fontello`/get
	unzip .fontello.zip -d .fontello.src
	rm -rf ${FONTELLO_DIR}
	mv `find ./.fontello.src -maxdepth 1 -name 'fontello-*'` ${FONTELLO_DIR}
	rm -rf .fontello.src .fontello.zip

.PNONY: codemirror-up
codemirror-up:
	cd ui/lib/codemirror \
	&& find . -type f -exec \
		curl https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.30.0/{} \
			--output {} --verbose \; \
	&& sed -i.bak 's/^}(this,/}(window,/' codemirror.js \
	&& rm codemirror.js.bak

.PHONY: mapboxgl-up
mapboxgl-up:
	cd ui/lib/mapboxgl \
	&& find . -type f -exec \
		curl https://cdnjs.cloudflare.com/ajax/libs/mapbox-gl/0.41.0/{} \
			--output {} --verbose \;
