use super::*;
use dbms::*;
use std::env;

#[test] #[ignore]
fn update_one_row() {

    let database = create_database().unwrap();

    let foo_table_oid = pgexec(
        &database,
        "CREATE TABLE public.foo(id INT, bar TEXT);
         INSERT INTO public.foo (id, bar) VALUES (1, 'hello'), (2, 'world');
         SELECT 'public.foo'::regclass::oid;"
     ).unwrap();

    get_dbms().update_row(
        &get_pguser(),
        &get_pgpassword(),
        &[&database, &format!("{}", foo_table_oid)],
        &dictrow(&[("id", Some("1"))]),
        &dictrow(&[("bar", Some("hi"))]),
    ).unwrap();

    assert_eq!(
        pgexec(&database, "SELECT * FROM public.foo ORDER BY id").unwrap(),
        "1|hi\n\
         2|world"
    );
}

#[test] #[ignore]
fn update_more_than_one_row() {

    let database = create_database().unwrap();
    let foo_table_oid = pgexec(
        &database,
        "CREATE TABLE public.foo(id INT, bar TEXT);
         INSERT INTO public.foo (id, bar) VALUES (1, 'hello'), (1, 'world');
         SELECT 'public.foo'::regclass::oid;"
     ).unwrap();

    assert_eq!(
        get_dbms().update_row(
            &get_pguser(),
            &get_pgpassword(),
            &[&database, &format!("{}", foo_table_oid)],
            &dictrow(&[("id", Some("1"))]),
            &dictrow(&[("bar", Some("hi"))]),
        ).unwrap_err().kind,
        ErrorKind::AmbiguousKey
    );

    assert_eq!(
        pgexec(&database, "SELECT * FROM public.foo ORDER BY id").unwrap(),
        "1|hello\n\
         1|world"
    );
}

#[test] #[ignore]
fn update_unexisting_row() {
    let database = create_database().unwrap();
    let foo_table_oid = pgexec(
        &database,
        "CREATE TABLE public.foo(id INT, bar TEXT);
         INSERT INTO public.foo (id, bar) VALUES (2, 'hello');
         SELECT 'public.foo'::regclass::oid;"
     ).unwrap();

     assert_eq!(
        get_dbms().update_row(
            &get_pguser(),
            &get_pgpassword(),
            &[&database, &format!("{}", foo_table_oid)],
            &dictrow(&[("id", Some("1"))]),
            &dictrow(&[("bar", Some("hi"))]),
        ).unwrap_err().kind,
        ErrorKind::UnexistingRow
    );

    assert_eq!(
        pgexec(&database, "SELECT * FROM public.foo ORDER BY id").unwrap(),
        "2|hello"
    );
}

#[test] #[ignore]
fn update_unexisting_table() {
    let database = create_database().unwrap();
    assert_eq!(
        get_dbms().update_row(
            &get_pguser(),
            &get_pgpassword(),
            &[&database, "0", /* unexisting OID */],
            &dictrow(&[("id", Some("1"))]),
            &dictrow(&[("bar", Some("hi"))]),
        ).unwrap_err().kind,
        ErrorKind::UnexistingPath
    );
}

#[test] #[ignore]
fn delete_one_row() {
    let database = create_database().unwrap();

    let foo_table_oid = pgexec(
        &database,
        "CREATE TABLE public.foo(id INT, bar TEXT);
         INSERT INTO public.foo (id, bar) VALUES (1, 'hello'), (2, 'world');
         SELECT 'public.foo'::regclass::oid;"
     ).unwrap();

    get_dbms().delete_row(
        &get_pguser(),
        &get_pgpassword(),
        &[&database, &format!("{}", foo_table_oid)],
        &dictrow(&[("id", Some("1"))]),
    ).unwrap();

    assert_eq!(
        pgexec(&database, "SELECT * FROM public.foo ORDER BY id").unwrap(),
        "2|world"
    );
}

#[test] #[ignore]
fn delete_more_than_one_row() {

    let database = create_database().unwrap();

    let foo_table_oid = pgexec(
        &database,
        "CREATE TABLE public.foo(id INT, bar TEXT);
         INSERT INTO public.foo (id, bar) VALUES (1, 'hello'), (1, 'world');
         SELECT 'public.foo'::regclass::oid;"
     ).unwrap();

    assert_eq!(
        get_dbms().delete_row(
            &get_pguser(),
            &get_pgpassword(),
            &[&database, &format!("{}", foo_table_oid)],
            &dictrow(&[("id", Some("1"))]),
        ).unwrap_err().kind,
        ErrorKind::AmbiguousKey
    );

    assert_eq!(
        pgexec(&database, "SELECT * FROM public.foo ORDER BY id").unwrap(),
        "1|hello\n\
         1|world"
    );
}

#[test] #[ignore]
fn delete_unexisting_row() {
    let database = create_database().unwrap();

    let foo_table_oid = pgexec(
        &database,
        "CREATE TABLE public.foo(id INT, bar TEXT);
         INSERT INTO public.foo (id, bar) VALUES (2, 'hello');
         SELECT 'public.foo'::regclass::oid;"
    ).unwrap();

    assert_eq!(
        get_dbms().delete_row(
            &get_pguser(),
            &get_pgpassword(),
            &[&database, &format!("{}", foo_table_oid)],
            &dictrow(&[("id", Some("1"))]),
        ).unwrap_err().kind,
        ErrorKind::UnexistingRow
    );

    assert_eq!(
        pgexec(&database, "SELECT * FROM public.foo ORDER BY id").unwrap(),
        "2|hello"
    );
}



fn get_dbms() -> PgDbms {
    PgDbms {
        addr: format!("{}:{}", get_pghost(), get_pgport())
    }
}

fn get_pguser() -> String { env::var("PGUSER").unwrap() }
fn get_pgpassword() -> String { env::var("PGPASSWORD").unwrap() }
fn get_pghost() -> String { env::var("PGHOST").unwrap() }
fn get_pgport() -> String { env::var("PGPORT").unwrap() }

fn pgexec(database: &str, script: &str) -> ::std::result::Result<String, String> {
    use std::process::Command;

    let output = Command::new("psql")
            .arg("--dbname").arg(database)
            .arg("--host").arg(&get_pghost())
            .arg("--port").arg(&get_pgport())
            .arg("--username").arg(&get_pguser())
            .arg("--command").arg(script)
            .arg("--tuples-only")
            .arg("--no-align")
            .arg("--no-password")
            .output()
            .unwrap();

    if output.status.success() {
        String::from_utf8(output.stdout)
                .map_err(|e| e.to_string())
                .map(|s| s.trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn dictrow(pairs: &[(&str, Option<&str>)]) -> DictRow {
    pairs.iter()
         .map(|&(key, val)| (key.to_string(), val.map(|val| val.to_string())))
         .collect()
}

fn create_database() -> ::std::result::Result<String, String> {
    let database_name = try!(pgexec(
        "postgres",
        "SELECT 'pgbbtest_' || md5(random()::text || now()::text)"
    ));
    try!(pgexec("postgres", &format!("CREATE DATABASE {}", database_name)));
    Ok(database_name)
}


#[test] #[ignore]
fn list_databases() {

    let _ = pgexec("postgres", "CREATE DATABASE test_list_databases");

    let root_dbobjs = get_dbms().get_root_dbobjs(
        &get_pguser(),
        &get_pgpassword(),
    ).unwrap();

    assert!(root_dbobjs.iter().any(|it| it.name == "test_list_databases"));

}

#[test] #[ignore]
fn list_schemas() {

    let _ = pgexec("postgres", "DROP DATABASE test_list_schemas_db");
    pgexec("postgres", "CREATE DATABASE test_list_schemas_db").unwrap();
    pgexec("test_list_schemas_db", "CREATE SCHEMA test_list_schemas_schema").unwrap();

    let child_dbobjs = get_dbms().get_child_dbobjs(
        &get_pguser(),
        &get_pgpassword(),
        &["test_list_schemas_db",
        "database",
        "test_list_schemas_db"],
    ).unwrap();

    assert!(child_dbobjs.iter().any(|it| it.name == "test_list_schemas_schema"));

}

#[test] #[ignore]
fn list_tables() {

    // let _ = pgexec("postgres", "DROP DATABASE test_list_tables_db");
    // pgexec("postgres", "CREATE DATABASE test_list_tables_db").unwrap();
    // pgexec("test_list_tables_db", "CREATE TABLE test_list_tables_table(foo INT)").unwrap();
    //
    // let schemas = get_dbms().get_child_dbobjs(
    //     &get_pguser(),
    //     &get_pgpassword(),
    //     "test_list_tables_db",
    //     "database",
    //     "test_list_tables_db",
    // ).unwrap();
    //
    // let child_dbobjs = get_dbms().get_child_dbobjs(
    //     &get_pguser(),
    //     &get_pgpassword(),
    //     "test_list_tables_db",
    //     "schema",
    //     "public",
    // ).unwrap();
    //
    // assert!(child_dbobjs.iter().any(|it| it.name == "test_list_tables_table"));

}
