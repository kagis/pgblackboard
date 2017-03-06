use http;
use dbms;
use super::JsonResponse;
use super::get_req_credentials;
use super::error_response;

pub fn handle_def_req<TDbms: dbms::Dbms>(
    dbms: &TDbms,
    obj_path: &[&str],
    req: &http::Request)
    -> Box<http::Response>
{
    http::Handler::handle_http_req(
        &DbObjDefinitionResource {
            dbms: dbms,
            obj_path: obj_path,
        },
        &[],
        req,
    )
}

struct DbObjDefinitionResource<'dbms, 'p, TDbms: dbms::Dbms + 'dbms> {
    dbms: &'dbms TDbms,
    obj_path: &'p [&'p str],
}

impl<'dbms, 'p, TDbms: dbms::Dbms + 'dbms> http::Resource for DbObjDefinitionResource<'dbms, 'p, TDbms> {
    fn get(&self, req: &http::Request) -> Box<http::Response> {

        let credentials = match get_req_credentials(req) {
            Ok(credentials) => credentials,
            Err(err_resp) => return err_resp,
        };

        let dbobj_def_result = self.dbms.get_dbobj_script(
            credentials,
            self.obj_path,
        );

        match dbobj_def_result {
            Ok(dbobj_def) => Box::new(JsonResponse {
                status: http::Status::Ok,
                content: dbobj_def
            }),
            Err(ref err) => error_response(err),
        }
    }
}
