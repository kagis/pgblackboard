use http;
use dbms::{ Dbms, TableModifyError };
use super::JsonResponse;
use std::collections::BTreeMap;
use rustc_serialize::json;


pub struct TableResource<'dbms, TDbms: Dbms + 'dbms> {
    pub dbms: &'dbms TDbms,
    pub user: String,
    pub password: String,
    pub database: String,
    pub table: String,
}

impl<'dbms, TDbms: Dbms + 'dbms> http::Resource for TableResource<'dbms, TDbms> {
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

        let modify_result = match form.action {
            PatchAction::Update => self.dbms.update_row(
                &self.user,
                &self.password,
                &self.database,
                &self.table,
                &form.key,
                &form.changes,
            ),
            PatchAction::Insert => self.dbms.insert_row(
                &self.user,
                &self.password,
                &self.database,
                &self.table,
                &form.changes,
            ),
            PatchAction::Delete => self.dbms.insert_row(
                &self.user,
                &self.password,
                &self.database,
                &self.table,
                &form.key,
            ),
        };

        match modify_result {
            Ok(affected_row) => Box::new(JsonResponse {
                status: http::Status::Ok,
                content: affected_row,
            }),
            Err(TableModifyError::DatabaseNotFound) => Box::new(JsonResponse {
                status: http::Status::NotFound,
                content: "Database not exists.",
            }),
            Err(TableModifyError::InvalidCredentials) => Box::new(JsonResponse {
                status: http::Status::Unauthorized,
                content: "Invalid username or password."
            }),
            Err(TableModifyError::RowNotFound) => Box::new(JsonResponse {
                status: http::Status::Conflict,
                content: "Row was not found.",
            }),
            Err(TableModifyError::NotUniqueKey) => Box::new(JsonResponse {
                status: http::Status::Conflict,
                content: "Key is not unique.",
            }),
            Err(TableModifyError::EmptyKey) => Box::new(JsonResponse {
                status: http::Status::BadRequest,
                content: "Empty key specified.",
            }),
            Err(TableModifyError::InvalidInput { column, message }) => Box::new(JsonResponse {
                status: http::Status::BadRequest,
                content: message,
            }),
            Err(TableModifyError::UnknownTable) => Box::new(JsonResponse {
                status: http::Status::NotFound,
                content: "Unknown table.",
            }),
            Err(TableModifyError::InternalError(e)) => Box::new(JsonResponse {
                status: http::Status::InternalServerError,
                content: format!("{:#?}", e),
            }),
        }
    }
}
