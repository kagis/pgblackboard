# Minimalistic GIS enabled interface for PostgreSQL

![screenshot](https://raw.githubusercontent.com/exe-dealer/pgblackboard/master/screenshot.png)


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

## Configurate

Create configuration file

```bash
sudo wget -O /etc/pgblackboard.conf https://raw.githubusercontent.com/exe-dealer/pgblackboard/master/pgblackboard.conf.example
sudo nano wget /etc/pgblackboard.conf
```

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
    - Extensions in tree
    - Tree node icon title
