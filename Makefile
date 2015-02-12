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

$(BUILDDIR)/bundle.js: $(JS_FILES) $(CSS_FILES)
	{ \
		printf "document.write('<style>%q</style>');" "$$(cat $(CSS_FILES))"; \
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
