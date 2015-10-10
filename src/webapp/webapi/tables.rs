use http;
use dbms::{ Dbms, TableModifyError };
use super::JsonResponse;


pub struct TableResource {
    pgaddr: String,
    dbname: String,
    schema_name: String,
    table_name: String,
}

impl http::Resource for TableResource {
    fn patch(&self, req: &http::Request) -> Box<http::Response> {
        let mut dbconn = match connectdb_for_dbdir(&self.pgaddr, &self.dbname, req) {
            Ok(dbconn) => dbconn,
            Err(resp) => return resp
        };

        #[derive(Debug)]
        #[derive(RustcDecodable)]
        enum PatchAction {
            Insert,
            Update,
            Delete
        }

        #[derive(Debug)]
        #[derive(RustcDecodable)]
        struct Form {
            action: PatchAction,
            changes: ::std::collections::BTreeMap<String, Option<String>>,
            key: ::std::collections::BTreeMap<String, Option<String>>
        }

        let content = match req.content.as_ref() {
            Some(x) => x,
            None => return Box::new(JsonResponse {
                content: "Missing content",
                status: http::Status::BadRequest
            })
        };

        let utf8_content = match ::std::str::from_utf8(content) {
            Ok(x) => x,
            Err(..) => return Box::new(JsonResponse {
                content: "Invalid UTF8 content",
                status: http::Status::BadRequest
            })
        };

        let form = match json::decode::<Form>(utf8_content) {
            Ok(x) => x,
            Err(..) => return Box::new(JsonResponse {
                content: "Cannot decode form",
                status: http::Status::BadRequest
            })
        };

        match form.action {
            PatchAction::Update => {
                let update_result = dbconn.update_row(
                    &self.schema_name,
                    &self.table_name,
                    &form.key,
                    &form.changes,
                );

                match update_result {
                    Ok(updated_row) => return Box::new(JsonResponse {
                        status: http::Status::Ok,
                        content: updated_row
                    }),
                    Err(pg::TableModifyError::RowNotFound) => return Box::new(JsonResponse {
                        status: http::Status::Conflict,
                        content: "Row was not found."
                    }),
                    Err(pg::TableModifyError::NotUniqueKey) => return Box::new(JsonResponse {
                        status: http::Status::Conflict,
                        content: "Key is not unique."
                    }),
                    Err(e) => return Box::new(JsonResponse {
                        status: http::Status::InternalServerError,
                        content: format!("{:#?}", e)
                    }),
                }
            }

            _ => return Box::new(JsonResponse {
                content: "Action is not implemented",
                status: http::Status::BadRequest
            })
        };


        Box::new(JsonResponse {
            content: "hello",
            status: http::Status::Ok
        })
    }
}
