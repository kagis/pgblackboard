# Minimalistic GIS enabled interface for PostgreSQL

![screenshot](https://raw.githubusercontent.com/exe-dealer/pgblackboard/master/screenshot.png)

## Features

- Multistatement queries support
- Spatial data visualization
- Powerfull SQL editor
- Handy list of manually written queries
- Data oriented tree with materialized views and foreign tables support
- Query permalink sharing

## Install

```bash
sudo apt-get install python3-pip libpq-dev
sudo pip3 install https://github.com/exe-dealer/pgblackboard/archive/master.zip
```

## Run

By default pgBlackboard expects PostgreSQL is listening on localhost:5432.

```bash
python3 -m pgblackboard
```

Open http://yourserver:7890 in browser.

## Command line arguments

```
--http-host     HTTP host to listen, default is 0.0.0.0
--http-port     HTTP port to listen, default is 7890
--pg-host       PostgreSQL server host, default is localhost
--pg-port       PostgreSQL server port, default is 5432
--ssl-cert      SSL certificate filename (*.crt)
--ssl-privkey   SSL private key filename (*.key)
```

DO specify SSL certificate to prevent passwords and data capture by man in the middle.

## Run on boot

```bash
# Create linux user for server process
sudo adduser --gecos 'pgBlackboard' --disabled-login --disabled-password --no-create-home pgblackboard

# Download upstart configuration file
sudo wget -O /etc/init/pgblackboard.conf https://raw.githubusercontent.com/exe-dealer/pgblackboard/master/upstart/pgblackboard.conf

# Start server
sudo start pgblackboard
```

## Platform

pgBlackboard is tested on
- PostgreSQL 9.3
- Python 3.4
- Ubuntu 14.04
- Chromium 37
