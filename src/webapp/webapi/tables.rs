use http;
use dbms;
use super::JsonResponse;
use std::collections::BTreeMap;
use rustc_serialize::json;


pub struct TableResource<'dbms, TDbms: dbms::Dbms + 'dbms> {
    pub dbms: &'dbms TDbms,
    pub user: String,
    pub password: String,
    pub table_path: Vec<String>,
}

impl<'dbms, TDbms: dbms::Dbms + 'dbms> http::Resource for TableResource<'dbms, TDbms> {
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

        let ref table_path = self.table_path
                                 .iter()
                                 .map(|seg| &seg[..])
                                 .collect::<Vec<_>>();

        let modify_result = match form.action {
            PatchAction::Update => self.dbms.update_row(
                &self.user,
                &self.password,
                table_path,
                &form.key,
                &form.changes,
            ),
            PatchAction::Insert => self.dbms.insert_row(
                &self.user,
                &self.password,
                table_path,
                &form.changes,
            ),
            PatchAction::Delete => self.dbms.insert_row(
                &self.user,
                &self.password,
                table_path,
                &form.key,
            ),
        };

        match modify_result {
            Ok(affected_row) => Box::new(JsonResponse {
                status: http::Status::Ok,
                content: affected_row,
            }),
            Err(err) => Box::new(JsonResponse {
                content: err.message,
                status: match err.kind {
                    dbms::ErrorKind::InvalidCredentials => http::Status::Unauthorized,
                    dbms::ErrorKind::UnexistingPath => http::Status::NotFound,
                    dbms::ErrorKind::UnexistingRow => http::Status::Conflict,
                    dbms::ErrorKind::AmbiguousKey => http::Status::Conflict,
                    dbms::ErrorKind::InvalidInput { .. } => http::Status::BadRequest,
                    dbms::ErrorKind::InternalError => http::Status::InternalServerError,
                },
            }),
        }
    }
}
