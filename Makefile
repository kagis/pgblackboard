NPM = cd ui && npm
CARGO = cd server && PGBB_UI_DIR=$(realpath ./ui/dist) cargo

UI_FILES := ui/dist/index.html \
			ui/dist/bundle-index.js.gz \
			ui/dist/bundle-index.js.md5 \
			ui/dist/bundle-map.js.gz \
			ui/dist/bundle-map.js.md5 \
			ui/dist/favicon.ico \
			ui/dist/favicon.ico.md5 \
			ui/dist/err.html

.PHONY: all
all: output/pgblackboard

output/pgblackboard: $(UI_FILES)
	$(CARGO) build --release
	mkdir -p output
	cp server/target/release/pgblackboard output/pgblackboard



.PHONY: build-ui
build-ui: $(UI_FILES)

$(UI_FILES):
	$(NPM) run build

.PHONY: test
test: test-ui test-server

.PHONY: test-server
test-server: build-ui
	$(CARGO) test --package postgres
	$(CARGO) test --package http
	$(CARGO) test

.PHONY: test-ui
test-ui:
	$(NPM) run test


run: build-ui
	$(CARGO) run

.PHONY: run-ui
run-ui:
	$(NPM) run start


.PHONY: lint
lint: lint-ui

.PHONY: lint-ui
lint-ui:
	$(NPM) run lint


.PHONY: clean
clean: clean-server clean-ui
	rm -r output

.PHONY: clean-server
clean-server:
	$(CARGO) clean

.PHONY: clean-ui
clean-ui:
	$(NPM) run clean


output/pgblackboard_0.2-1_amd64.deb: output/pgblackboard
	mkdir -p output/pgblackboard_0.2-1_amd64/DEBIAN
	cp debian/control output/pgblackboard_0.2-1_amd64/DEBIAN/control
	mkdir -p output/pgblackboard_0.2-1_amd64/usr/bin
	cp output/pgblackboard output/pgblackboard_0.2-1_amd64/usr/bin/pgblackboard
	dpkg-deb --build output/pgblackboard_0.2-1_amd64
	rm -r output/pgblackboard_0.2-1_amd64

deb: output/pgblackboard_0.2-1_amd64.deb
