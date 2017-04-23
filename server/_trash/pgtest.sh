DOCKER_IMAGE=postgres-9.5 #pgblackboard_test_postgres
sudo docker build --tag $DOCKER_IMAGE - < postgres.dockerfile
CONTAINERID=$(sudo docker run --publish 5432 --detach $DOCKER_IMAGE)

PGHOST=localhost \
PGPORT=$(sudo docker inspect --format='{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}' $CONTAINERID) \
PGUSER=postgres \
PGPASSWORD=postgres \
cargo test -- --ignored

sudo docker logs $CONTAINERID
sudo docker rm --force $CONTAINERID
