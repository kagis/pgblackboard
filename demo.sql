create database hello;
\connect hello


create schema world;

set search_path to world, public;
comment on schema world is 'Demo schema description long long description long long';

create table foo (
  fooid int not null primary key,
  name text
);

create table multikey (
  col1 text,
  col2_key text,
  col3_key text,
  col4 text,
  primary key (col2_key, col3_key)
);

create table hasindexes (
  foo text,
  bar text,
  buz text
);

create index on hasindexes(foo);
