.PHONY: build ui/_vendor/* server/_vendor/*

build: \
	.dist/ui/index.html \
	.dist/ui/favicon.ico \
	.dist/ui/ui.css \
	.dist/ui/ui.js \
	.dist/server/pgbb.js

.dist/ui/ui.css: .dist/ui
	esbuild ui/ui.css --outfile=$@ --bundle --loader:.svg=dataurl --loader:.woff2=dataurl --target=chrome100
.dist/ui/ui.js: .dist/ui
	esbuild ui/ui.js --outfile=$@ --bundle --format=esm
.dist/server/pgbb.js: .dist/ui
	esbuild server/pgbb.js --outfile=$@ --bundle --format=esm
.dist/ui/index.html: ui/index.html .dist/ui
	cp $< $@
.dist/ui/favicon.ico: ui/favicon.ico .dist/ui
	cp $< $@
.dist/ui:
	mkdir -p .dist/ui

ui/_vendor/vue.js:
	curl -o $@ 'https://unpkg.com/vue@3.5.11/dist/vue.esm-browser.js'
ui/_vendor/maplibre.css:
	curl -o $@ 'https://esm.sh/maplibre-gl@4.7.1/dist/maplibre-gl.css'
	# deno fmt $@
ui/_vendor/maplibre.js:
	curl -o $@ 'https://esm.sh/v135/maplibre-gl@4.7.1/es2022/dist/maplibre-gl-dev.development.bundle.js'
ui/_vendor/monaco.css:
	curl -o $@ 'https://esm.sh/v135/monaco-editor@0.52.0/es2022/monaco-editor.css'
	# deno fmt $@
ui/_vendor/monaco.js:
	curl -o $@ 'https://esm.sh/v135/monaco-editor@0.52.0/es2022/esm/vs/editor/editor.main.development.bundle.js'
ui/_vendor/monaco_worker.js:
	curl -o $@ 'https://esm.sh/v135/monaco-editor@0.52.0/es2022/esm/vs/editor/editor.worker.development.bundle.js?worker'
ui/_vendor/monaco_json_worker.js:
	curl -o $@ 'https://esm.sh/v135/monaco-editor@0.52.0/es2022/esm/vs/language/json/json.worker.development.bundle.js?worker'

server/_vendor/pgwire.js:
	curl -o $@ 'https://raw.githubusercontent.com/kagis/pgwire/b992f307097ac5bd350ba41ea4c85d194ccb611f/mod.js'
server/_vendor/parse_args.ts:
	curl -o $@ 'https://jsr.io/@std/cli/1.0.6/parse_args.ts'


# docker run -it --rm -v $PWD:/app -w /app alpine:3.20
# apk add --no-cache make clang17 wasi-sdk lld flex

server/psqlscan/psqlscan.wasm.js: server/psqlscan/.psqlscan.wasm
	base64 -w0 $< | awk '{ print "export default `" $$0 "`;"  }' > $@

server/psqlscan/.psqlscan.wasm: server/psqlscan/.psqlscan.c
	clang-17 --target=wasm32-wasi \
		--sysroot=/usr/share/wasi-sysroot \
		-nostartfiles \
		-Wl,--export,psql_stmt_len \
		-Wl,--export,malloc \
		-Wl,--export,free \
		-Wl,--no-entry \
		-o $@ \
		$<

server/psqlscan/.psqlscan.c: server/psqlscan/psqlscan.l
	flex -o $@ $<
