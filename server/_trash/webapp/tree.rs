use http;
use dbms;
use super::JsonResponse;
use super::JsonpResponse;
use super::get_req_credentials;
use super::error_response;

pub fn handle_tree_req<TDbms: dbms::Dbms>(
    dbms: &TDbms,
    parent_obj_path: &[&str],
    req: &http::Request)
    -> Box<http::Response>
{
    http::Handler::handle_http_req(
        &DbObjChildren {
            dbms: dbms,
            parent_obj_path: parent_obj_path,
        },
        &[],
        req,
    )
}

pub fn handle_tree_root_req<TDbms: dbms::Dbms>(
    dbms: &TDbms,
    req: &http::Request)
    -> Box<http::Response>
{
    http::Handler::handle_http_req(&RootDbObjs { dbms: dbms }, &[], req)
}

struct DbObjChildren<'dbms, 'p, TDbms: dbms::Dbms + 'dbms> {
    dbms: &'dbms TDbms,
    parent_obj_path: &'p [&'p str],
}

impl<'dbms, 'p, TDbms: dbms::Dbms + 'dbms> http::Resource for DbObjChildren<'dbms, 'p, TDbms> {
    fn get(&self, req: &http::Request) -> Box<http::Response> {

        let credentials = match get_req_credentials(req) {
            Ok(credentials) => credentials,
            Err(err_resp) => return err_resp,
        };

        let dbobj_children_result = self.dbms.get_child_dbobjs(
            credentials,
            self.parent_obj_path,
        );

        match dbobj_children_result {
            Ok(dbobj_children) => Box::new(JsonResponse {
                status: http::Status::Ok,
                content: dbobj_children
            }),
            Err(ref err) => error_response(err)
        }

    }
}

struct RootDbObjs<'dbms, TDbms: dbms::Dbms + 'dbms> {
    dbms: &'dbms TDbms,
}

impl<'dbms, TDbms: dbms::Dbms + 'dbms> http::Resource for RootDbObjs<'dbms, TDbms> {
    fn get(&self, req: &http::Request) -> Box<http::Response> {

        let credentials = match get_req_credentials(req) {
            Ok(credentials) => credentials,
            Err(err_resp) => return err_resp,
        };

        let root_dbobjs_result = self.dbms.get_root_dbobjs(
            credentials,
        );

        match root_dbobjs_result {
            Ok(root_dbobjs) => Box::new(JsonpResponse {
                status: http::Status::Ok,
                content: root_dbobjs,
                callback: "acceptRootTreeNodes".to_owned(),
            }),
            Err(ref err) => error_response(err)
        }

    }
}
