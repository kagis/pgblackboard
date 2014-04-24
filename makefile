all: static/dist/app.js static/dist/index.html static/dist/style.css static/dist/map.js static/dist/map.css static/dist/table.js static/dist/table.css

static/dist/app.js: static/sqlqueries.sql static/main.js static/splitpanel.js static/tree.js static/queries.js
	{ \
		echo '(function (undefined) {'; \
		python3 -c "import json; \
			import itertools; \
			parts = open('static/sqlqueries.sql').read().split('---')[1:]; \
			print('var sqlQueries = ', json.dumps(dict(zip(parts[::2], parts[1::2]))), ';');"; \
		cat static/splitpanel.js; \
		cat static/tree.js; \
		cat static/queries.js; \
		cat static/main.js; \
		echo '})()'; \
	} > static/dist/app.js

static/dist/index.html: static/index.html
	cp static/index.html static/dist/index.html

static/dist/style.css: static/fontello/css/fontello-embedded.css static/layout.css static/tree.css static/splitpanel.css static/queries.css static/dark.css
	{ \
		cat static/fontello/css/fontello-embedded.css; \
		cat static/layout.css; \
		cat static/tree.css; \
		cat static/splitpanel.css; \
		cat static/queries.css; \
		cat static/dark.css; \
	} > static/dist/style.css

static/dist/map.js: static/map.js
	cp static/map.js static/dist/map.js

static/dist/map.css: static/map.css
	cp static/map.css static/dist/map.css

static/dist/table.js: static/table.js
	cp static/table.js static/dist/table.js

static/dist/table.css: static/table.css
	cp static/table.css static/dist/table.css
