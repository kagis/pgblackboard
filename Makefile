NPM = cd ui && npm
CARGO = cd server && PGBB_UI_DIR=$(realpath ui/dist) cargo

.PHONY: all \
		build-ui \
		test \
		test-server \
		test-ui \
		run-ui \
		lint \
		lint-ui \
		clean \
		clean-server \
		clean-ui \
		deb

all: build-ui
	$(CARGO) build --release --verbose
	mkdir -p output
	cp server/target/release/pgblackboard output/pgblackboard

build-ui:
	$(NPM) run build

test: test-ui test-server

test-server: build-ui
	$(CARGO) test --package postgres
	$(CARGO) test --package http
	$(CARGO) test

test-ui:
	$(NPM) run test


run: build-ui
	$(CARGO) run

run-ui:
	$(NPM) run start


lint: lint-ui

lint-ui:
	$(NPM) run lint


clean: clean-server clean-ui
	rm -r output

clean-server:
	$(CARGO) clean

clean-ui:
	$(NPM) run clean

PGBB_VERSION := 0.2.0
DEB_PACKAGE_ROOT := output/pgblackboard_$(PGBB_VERSION)-1_amd64

deb: all
	mkdir -p $(DEB_PACKAGE_ROOT)/DEBIAN
	mkdir -p $(DEB_PACKAGE_ROOT)/usr/bin
	cp debian/control $(DEB_PACKAGE_ROOT)/DEBIAN/control
	cp output/pgblackboard $(DEB_PACKAGE_ROOT)/usr/bin/pgblackboard
	dpkg-deb --build $(DEB_PACKAGE_ROOT)
	rm -r $(DEB_PACKAGE_ROOT)
