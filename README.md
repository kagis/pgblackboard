# Minimalistic GIS enabled interface for PostgreSQL

![screenshot](https://raw.githubusercontent.com/exe-dealer/pgblackboard/master/screenshot.png)


## Install

```bash
sudo apt-get install python3-pip
sudo pip3 install git+https://github.com/exe-dealer/pgblackboard.git
```

## Run

By default pgBlackboard expects PostgreSQL is listening on localhost:5432.

```bash
python3 -m pgblackboard.server
```

Open http://yourserver:7890 in browser.

## TODO

    - Digest auth
    - Table editing
    - Map editing
    - Map drawing wkt/geojson
    - Extensions in tree
    - Tree node icon title
