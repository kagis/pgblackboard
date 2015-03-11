SHELL=/bin/bash

BUILDDIR=target/build
KNOCKOUT=http://knockoutjs.com/downloads/knockout-3.2.0.js
CODEMIRROR_DIR=http://cdnjs.cloudflare.com/ajax/libs/codemirror/4.12.0

JS_FILES=$(BUILDDIR)/knockout.js \
		$(BUILDDIR)/codemirror.js \
		$(BUILDDIR)/codemirror-searchcursor.js \
		$(BUILDDIR)/codemirror-sublime.js \
		$(BUILDDIR)/codemirror-matchbrackets.js \
		$(BUILDDIR)/codemirror-closebrackets.js \
		$(BUILDDIR)/codemirror-sql.js

CSS_FILES=$(BUILDDIR)/codemirror.css


all: index.html favicon.ico bundle-index.js bundle-map.js bundle-table.js



$(BUILDDIR)/thirdparty.js: src/static/bundle-index.js
	-rm $@.tmp
	(for url in $$(nodejs -p "require('./src/static/bundle-index').jsLib.join('\\n')"); do \
	 echo downloading $$url; \
	 curl --silent $$url >> $@.tmp; \
	 done)
	mv $@.tmp $@



$(BUILDDIR)/bundle.js: $(JS_FILES) $(CSS_FILES)
	{ \
		echo "document.write('<style>"; \
		cat $(CSS_FILES) | sed -e 's/\\/\\\\/'  -e "s/'/\\\'/g"; \
		echo "</style>');"; \
		cat $(JS_FILES); \
	} > $@


$(BUILDDIR)/knockout.js:
	curl $(KNOCKOUT) > $@

$(BUILDDIR)/codemirror.css:
	curl $(CODEMIRROR_DIR)/codemirror.min.css > $@

$(BUILDDIR)/codemirror.js:
	curl $(CODEMIRROR_DIR)/codemirror.min.js > $@

$(BUILDDIR)/codemirror-searchcursor.js:
	curl $(CODEMIRROR_DIR)/addon/search/searchcursor.min.js > $@

$(BUILDDIR)/codemirror-sublime.js:
	curl $(CODEMIRROR_DIR)/keymap/sublime.min.js > $@

$(BUILDDIR)/codemirror-matchbrackets.js:
	curl $(CODEMIRROR_DIR)/addon/edit/matchbrackets.min.js > $@

$(BUILDDIR)/codemirror-closebrackets.js:
	curl $(CODEMIRROR_DIR)/addon/edit/closebrackets.min.js > $@

$(BUILDDIR)/codemirror-sql.js:
	curl $(CODEMIRROR_DIR)/mode/sql/sql.min.js > $@



$(BUILDDIR)/pgblackboard.js: $(BUILDDIR)/pgblackboard.src.js
	closure-compiler --compilation_level SIMPLE_OPTIMIZATIONS $^ > $@
	# curl -d compilation_level=SIMPLE_OPTIMIZATIONS \
	# 	-d output_format=json \
	# 	-d output_info=errors \
	# 	-d output_info=compiled_code \
	# 	--data-urlencode "js_code@$^" \
	# 	http://closure-compiler.appspot.com/compile \
	# 	> $@

$(BUILDDIR)/pgblackboard.src.js: \
	src/static/tree/tree.js \
	src/static/splitpanel/splitpanel.js \
	src/static/myqueries/myqueries.js \
	src/static/editor/editor.js
	{ echo "(function(){"; cat $^; echo "})();"; } > $@



