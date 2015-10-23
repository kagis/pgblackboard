use super::*;
use dbms::*;
use std::env;

#[test] #[ignore]
fn should_update_row() {

    let foo_table_oid = resetdb_and_exec(
        "should_update_row",
        "CREATE TABLE public.foo(id INT, bar TEXT);
         INSERT INTO public.foo (id, bar) VALUES (1, 'hello');
         SELECT 'public.foo'::regclass::oid;"
     ).unwrap();

    get_dbms().update_row(
        &get_pguser(),
        &get_pgpassword(),
        "should_update_row",
        &format!("{}", foo_table_oid),
        &vec![("id".to_string(), Some("1".to_string()))].into_iter().collect(),
        &vec![("bar".to_string(), Some("updated".to_string()))].into_iter().collect(),
    ).unwrap();

    let updated_val = pgexec(
        "should_update_row",
        "SELECT bar FROM public.foo WHERE id = 1"
    ).unwrap();

    assert_eq!(updated_val, "updated");
}

#[test] #[ignore]
fn should_not_update_more_than_one_row() {

    let foo_table_oid = resetdb_and_exec(
        "should_not_update_more_than_one_row",
        "CREATE TABLE public.foo(id INT, bar TEXT);
         INSERT INTO public.foo (id, bar) VALUES (1, 'hello'), (1, 'world');
         SELECT 'public.foo'::regclass::oid;"
     ).unwrap();

    let update_result = get_dbms().update_row(
        &get_pguser(),
        &get_pgpassword(),
        "should_not_update_more_than_one_row",
        &format!("{}", foo_table_oid),
        &vec![("id".to_string(), Some("1".to_string()))].into_iter().collect(),
        &vec![("bar".to_string(), Some("updated".to_string()))].into_iter().collect(),
    );

    let row_count = pgexec(
        "should_not_update_more_than_one_row",
        "SELECT COUNT(*) FROM public.foo WHERE id = 1 AND bar IN ('hello', 'world')"
    ).unwrap();

    assert!(update_result.is_err());
    assert_eq!(row_count, "2");
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

fn pgexec(database: &str, script: &str) -> Result<String, String> {
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
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn resetdb_and_exec(database: &str, script: &str) -> Result<String, String> {
    let _ = pgexec("postgres", &format!("DROP DATABASE {}", database));
    try!(pgexec("postgres", &format!("CREATE DATABASE {}", database)));
    pgexec(database, script)
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
        "test_list_schemas_db",
        "database",
        "test_list_schemas_db",
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
