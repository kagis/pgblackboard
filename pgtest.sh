DOCKER_IMAGE=postgres-9.4 #pgblackboard_test_postgres
sudo docker build --tag $DOCKER_IMAGE - < postgres.dockerfile
CONTAINERID=$(sudo docker run --detach $DOCKER_IMAGE)

PGHOST=$(sudo docker inspect --format='{{.NetworkSettings.IPAddress}}' $CONTAINERID) \
PGPORT=5432 \
PGUSER=postgres \
PGPASSWORD=postgres \
cargo test -- --ignored

sudo docker rm --force $CONTAINERID
