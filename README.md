# Minimalistic GIS enabled interface for PostgreSQL

[TRY DEMO](http://guest:guest@46.8.22.2:7890)

![screenshot](https://raw.githubusercontent.com/exe-dealer/pgblackboard/master/screenshot.png)

## Features

- Multistatement queries support
- Spatial data visualization by [Leaflet](http://leafletjs.com/)
- Powerfull SQL editor by [Ace](http://ace.c9.io)
- Handy list of manually written queries
- Data oriented tree with materialized views and foreign tables support
- Query permalink sharing

## Install

```bash
sudo apt-get install git python3-pip libpq-dev
sudo pip3 install git+https://github.com/exe-dealer/pgblackboard.git
```

## Run

By default pgBlackboard expects PostgreSQL is listening on localhost:5432.

```bash
python3 -m pgblackboard.server
```

Open http://yourserver:7890 in browser.

## Configure

Create configuration file

```bash
sudo wget -O /etc/pgblackboard.conf https://raw.githubusercontent.com/exe-dealer/pgblackboard/master/pgblackboard.conf.example
sudo nano /etc/pgblackboard.conf
```

DO specify SSL certificate to prevent passwords and data capture by man in the middle.

Run pgBlackboard with configuration file

```bash
python3 -m pgblackboard.server --conf /etc/pgblackboard.conf
```

## Run on boot

```bash
# Create linux user for server process
sudo adduser --gecos 'pgBlackboard' --disabled-login --disabled-password --no-create-home pgblackboard

# Download upstart configuration file
sudo wget -O /etc/init/pgblackboard.conf https://raw.githubusercontent.com/exe-dealer/pgblackboard/master/upstart/pgblackboard.conf

# Start server
sudo start pgblackboard
```

## TODO

- Digest auth
- Table editing
- Map editing
- Map drawing wkt/geojson
- Tree node icon title
- Connection pooling
