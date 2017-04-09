DIR=https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.0.3
wget --cut-dirs 3 --force-directories --no-host-directories \
  $DIR/leaflet-src.js \
  $DIR/leaflet.js \
  $DIR/leaflet.css \
;
