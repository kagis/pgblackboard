use http;
use dbms;
use super::JsonResponse;
use super::get_req_credentials;
use super::error_response;
use std::collections::BTreeMap;
use rustc_serialize::json;

pub fn handle_table_req<TDbms: dbms::Dbms>(
    dbms: &TDbms,
    table_path: &[&str],
    req: &http::Request)
    -> Box<http::Response>
{
    http::Handler::handle_http_req(
        &TableResource {
            dbms: dbms,
            table_path: table_path,
        },
        &[],
        req,
    )
}

struct TableResource<'dbms, 'p, TDbms: dbms::Dbms + 'dbms> {
    dbms: &'dbms TDbms,
    table_path: &'p [&'p str],
}

impl<'dbms, 'p, TDbms: dbms::Dbms + 'dbms> http::Resource for TableResource<'dbms, 'p, TDbms> {
    fn patch(&self, req: &http::Request) -> Box<http::Response> {

        #[derive(Debug)]
        #[derive(RustcDecodable)]
        enum PatchAction {
            Insert,
            Update,
            Delete,
        }

        #[derive(Debug)]
        #[derive(RustcDecodable)]
        struct Form {
            action: PatchAction,
            changes: BTreeMap<String, Option<String>>,
            key: BTreeMap<String, Option<String>>,
        }

        let credentials = match get_req_credentials(req) {
            Ok(credentials) => credentials,
            Err(err_resp) => return err_resp,
        };

        let content = match req.content.as_ref() {
            Some(x) => x,
            None => return Box::new(JsonResponse {
                content: "Missing content",
                status: http::Status::BadRequest
            }),
        };

        let utf8_content = match ::std::str::from_utf8(content) {
            Ok(x) => x,
            Err(..) => return Box::new(JsonResponse {
                content: "Invalid UTF8 content",
                status: http::Status::BadRequest
            }),
        };

        let form = match json::decode::<Form>(utf8_content) {
            Ok(x) => x,
            Err(..) => return Box::new(JsonResponse {
                content: "Cannot decode form",
                status: http::Status::BadRequest
            }),
        };

        let modify_result = match form.action {
            PatchAction::Update => self.dbms.update_row(
                credentials,
                self.table_path,
                &form.key,
                &form.changes,
            ),
            PatchAction::Insert => self.dbms.insert_row(
                credentials,
                self.table_path,
                &form.changes,
            ),
            PatchAction::Delete => self.dbms.insert_row(
                credentials,
                self.table_path,
                &form.key,
            ),
        };

        match modify_result {
            Ok(affected_row) => Box::new(JsonResponse {
                status: http::Status::Ok,
                content: affected_row,
            }),
            Err(ref err) => error_response(err),
        }
    }
}
