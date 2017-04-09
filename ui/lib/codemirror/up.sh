DIR=https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.25.0
wget --cut-dirs 3 --force-directories --no-host-directories \
  $DIR/codemirror.js \
  $DIR/codemirror.min.js \
  $DIR/codemirror.css \
  $DIR/codemirror.min.css \
  $DIR/addon/search/searchcursor.js \
  $DIR/addon/search/searchcursor.min.js \
  $DIR/keymap/sublime.js \
  $DIR/keymap/sublime.min.js \
  $DIR/addon/edit/matchbrackets.js \
  $DIR/addon/edit/matchbrackets.min.js \
  $DIR/addon/edit/closebrackets.js \
  $DIR/addon/edit/closebrackets.min.js \
  $DIR/mode/sql/sql.js \
  $DIR/mode/sql/sql.min.js \
;