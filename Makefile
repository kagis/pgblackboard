.PHONY: all
all: ui
	docker run -it --rm \
		--volume $$PWD:/source \
		--volume pgblackboard_cargo_reg:/root/.cargo/registry \
		jimmycuadra/rust \
		cargo build --release --features uibuild

.PHONY: ui
ui:
	mkdir -p ui/_dist
	docker run -it --rm \
		--volume $$PWD:/source \
		--workdir /source \
		--env OUT_DIR=/source/ui/_dist \
		node:7-alpine \
		npm run installdep-and-build

.PHONY: run
run:
	docker run -it --rm \
		--volume $$PWD:/source \
		--volume pgblackboard_cargo_reg:/root/.cargo/registry \
		--publish 7890:7890 \
		jimmycuadra/rust \
		sh -c "cargo run -- $(args)"

.PHONY: cargo
cargo:
	docker run -it --rm \
		--volume $$PWD:/source \
		--volume pgblackboard_cargo_reg:/root/.cargo/registry \
		jimmycuadra/rust \
		sh -c "cargo $(args)"

PGBB_VERSION := 0.2.0
DEB_PACKAGE_DIR := target/release/pgblackboard_$(PGBB_VERSION)-1_amd64

deb: all
	mkdir -p $(DEB_PACKAGE_DIR)/DEBIAN \
		$(DEB_PACKAGE_DIR)/usr/bin
	cp debian/control $(DEB_PACKAGE_DIR)/DEBIAN/control
	cp target/release/pgblackboard $(DEB_PACKAGE_DIR)/usr/bin/pgblackboard
	docker run -it --rm \
		--volume $$PWD:/source \
		--workdir /source \
		debian:8 \
		dpkg-deb --build $(DEB_PACKAGE_DIR)
	rm -r $(DEB_PACKAGE_DIR)
