use http;
use dbms::{ Dbms, DbObjError };
use super::JsonResponse;


pub struct DbObjDir<'dbms, TDbms: Dbms + 'dbms> {
    pub dbms: &'dbms TDbms,
    pub user: String,
    pub password: String,
    pub database: String,
    pub objtype: String,
    pub objid: String,
}

impl<'dbms, TDbms: Dbms + 'dbms> http::Handler for DbObjDir<'dbms, TDbms> {
    fn handle_http_req(&self, path: &[&str], req: &http::Request) -> Box<http::Response> {
        match path {
            ["children"] => DbObjChildren {
                dbms: self.dbms,
                user: self.user.clone(),
                password: self.password.clone(),
                database: self.database.clone(),
                objtype: self.objtype.clone(),
                objid: self.objid.clone(),
            }.handle_http_req(&[], req),

            ["definition"] => DbObjDefinition {
                dbms: self.dbms,
                user: self.user.clone(),
                password: self.password.clone(),
                database: self.database.clone(),
                objtype: self.objtype.clone(),
                objid: self.objid.clone(),
            }.handle_http_req(&[], req),

            _ => Box::new(JsonResponse {
                status: http::Status::NotFound,
                content: "not found"
            }),
        }
    }
}

struct DbObjChildren<'dbms, TDbms: Dbms + 'dbms> {
    dbms: &'dbms TDbms,
    user: String,
    password: String,
    database: String,
    objtype: String,
    objid: String,
}

impl<'dbms, TDbms: Dbms + 'dbms> http::Resource for DbObjChildren<'dbms, TDbms> {
    fn get(&self, req: &http::Request) -> Box<http::Response> {

        let dbobj_children_result = self.dbms.get_child_dbobjs(
            &self.user,
            &self.password,
            &self.database,
            &self.objtype,
            &self.objid
        );

        match dbobj_children_result {
            Ok(dbobj_children) => Box::new(JsonResponse {
                status: http::Status::Ok,
                content: dbobj_children
            }),
            Err(ref dbobj_err) => handle_dbobj_error(dbobj_err)
        }

    }
}

struct DbObjDefinition<'dbms, TDbms: Dbms + 'dbms> {
    dbms: &'dbms TDbms,
    user: String,
    password: String,
    database: String,
    objtype: String,
    objid: String,
}

impl<'dbms, TDbms: Dbms + 'dbms> http::Resource for DbObjDefinition<'dbms, TDbms> {
    fn get(&self, req: &http::Request) -> Box<http::Response> {

        let dbobj_def_result = self.dbms.get_dbobj_script(
            &self.user,
            &self.password,
            &self.database,
            &self.objtype,
            &self.objid
        );

        match dbobj_def_result {
            Ok(dbobj_def) => Box::new(JsonResponse {
                status: http::Status::Ok,
                content: dbobj_def
            }),
            Err(ref dbobj_err) => handle_dbobj_error(dbobj_err)
        }
    }
}


fn handle_dbobj_error(dbobj_err: &DbObjError) -> Box<http::Response> {
    match *dbobj_err {
        DbObjError::DatabaseNotFound => Box::new(JsonResponse {
            status: http::Status::NotFound,
            content: "Database not exists."
        }),

        DbObjError::InvalidCredentials => Box::new(JsonResponse {
            status: http::Status::Unauthorized,
            content: "Invalid username or password."
        }),

        DbObjError::UnknownDbObjType => Box::new(JsonResponse {
            status: http::Status::NotFound,
            content: "Unknown type of database object."
        }),

        DbObjError::DbObjNotFound => Box::new(JsonResponse {
            status: http::Status::NotFound,
            content: "Database object was not found."
        }),

        DbObjError::InternalError(ref err) => Box::new(JsonResponse {
            status: http::Status::InternalServerError,
            content: err.to_string()
        }),
    }
}
