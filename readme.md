# pgBlackboard

Minimalistic GIS-enabled webadmin interface for PostgreSQL

## Features

### Mapbox GL powered map

- screenshot

### Edit queryed dataset

- video here

### Multi statement scripts

pgBalckboard can execute scripts with multiple statements and
view result of each statement

- screenshot

### Memory efficient backend

### Extremely lightweight

- 2Mb compressed docker image
- 20Mb max mem per user

## Run

[Dockerhub repo](https://hub.docker.com/r/kagiskz/pgblackboard/)

### Run in foreground

```
docker run -it --rm -e PGBB_POSTGRES=PGHOST:PGPORT -p 7890:7890 kagiskz/pgblackboard
```

### Run in background

```
docker run -d --restart unless-stopped -e PGBB_POSTGRES=PGHOST:PGPORT -p 7890:7890 kagiskz/pgblackboard
```
