NPM = cd ui && npm
CARGO = cd server && PGBB_UI_DIR=$(realpath ./ui/dist) cargo

.PHONY: all
all: build-ui
	$(CARGO) build --release
	mkdir -p

.PHONY: build-ui
build-ui:
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

.PHONY: clean-server
clean-server:
	$(CARGO) clean

.PHONY: clean-ui
clean-ui:
	$(NPM) run clean
