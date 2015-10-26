use http;
use dbms;
use super::JsonResponse;


pub struct DbObjDir<'dbms, TDbms: dbms::Dbms + 'dbms> {
    pub dbms: &'dbms TDbms,
    pub user: String,
    pub password: String,
    pub database: String,
    pub objtype: String,
    pub objid: String,
}

impl<'dbms, TDbms: dbms::Dbms + 'dbms> http::Handler for DbObjDir<'dbms, TDbms> {
    fn handle_http_req(&self, path: &[&str], req: &http::Request) -> Box<http::Response> {
        match path {
            ["children"] => DbObjChildren {
                dbms: self.dbms,
                user: self.user.clone(),
                password: self.password.clone(),
                obj_path: vec![self.database.clone(), self.objtype.clone(), self.objid.clone()],
            }.handle_http_req(&[], req),

            ["definition"] => DbObjDefinition {
                dbms: self.dbms,
                user: self.user.clone(),
                password: self.password.clone(),
                obj_path: vec![self.database.clone(), self.objtype.clone(), self.objid.clone()],
            }.handle_http_req(&[], req),

            _ => Box::new(JsonResponse {
                status: http::Status::NotFound,
                content: "not found"
            }),
        }
    }
}

struct DbObjChildren<'dbms, TDbms: dbms::Dbms + 'dbms> {
    dbms: &'dbms TDbms,
    user: String,
    password: String,
    obj_path: Vec<String>,
}

impl<'dbms, TDbms: dbms::Dbms + 'dbms> http::Resource for DbObjChildren<'dbms, TDbms> {
    fn get(&self, req: &http::Request) -> Box<http::Response> {

        let ref obj_path = self.obj_path
                                 .iter()
                                 .map(|seg| &seg[..])
                                 .collect::<Vec<_>>();

        let dbobj_children_result = self.dbms.get_child_dbobjs(
            &self.user,
            &self.password,
            obj_path,
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

struct DbObjDefinition<'dbms, TDbms: dbms::Dbms + 'dbms> {
    dbms: &'dbms TDbms,
    user: String,
    password: String,
    obj_path: Vec<String>,
}

impl<'dbms, TDbms: dbms::Dbms + 'dbms> http::Resource for DbObjDefinition<'dbms, TDbms> {
    fn get(&self, req: &http::Request) -> Box<http::Response> {

        let ref obj_path = self.obj_path
                                 .iter()
                                 .map(|seg| &seg[..])
                                 .collect::<Vec<_>>();

        let dbobj_def_result = self.dbms.get_dbobj_script(
            &self.user,
            &self.password,
            obj_path,
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


fn handle_dbobj_error(dbobj_err: &dbms::Error) -> Box<http::Response> {
    Box::new(JsonResponse {
        status: match dbobj_err.kind {
            dbms::ErrorKind::UnexistingPath => http::Status::NotFound,
            dbms::ErrorKind::InvalidCredentials => http::Status::Unauthorized,
            _ => http::Status::InternalServerError
        },
        content: dbobj_err.message.clone(),
    })
}
