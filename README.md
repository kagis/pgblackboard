# pgBlackboard

[![Build Status](https://travis-ci.org/exe-dealer/pgblackboard.svg?branch=rust)](https://travis-ci.org/exe-dealer/pgblackboard)

[Dockerhub repo](https://hub.docker.com/r/exedealer/pgblackboard/)

## Run in foreground

```
docker run -it --rm -e PGBB_POSTGRES=PGHOST:PGPORT -p 7890:7890 exedealer/pgblackboard
```

## Run in background

```
docker run -d --restart unless-stopped -e PGBB_POSTGRES=PGHOST:PGPORT -p 7890:7890 exedealer/pgblackboard
```
