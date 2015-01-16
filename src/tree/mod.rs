use super::postgres;
use std::io::IoResult;
use std::io::Stream;

pub struct NodeService<T: Stream> {
    pub dbconn: postgres::DatabaseConnection<T>,
    pub nodeid: String,
    pub nodetype: String,
}



#[derive(Decodable, Encodable)]
struct Node {
    nodeid: String,
    nodetype: String,
    name: String,
    comment: Option<String>,
}



impl<T: Stream> NodeService<T> {

    pub fn get_children(&mut self) -> IoResult<Vec<Node>> {
        let query = include_str!("children/database.sql");
        //let query = query.replace()
        self.dbconn.query(query)
        //let
    }

    // pub fn get_definition(&mut self) -> IoResult<Json> {

    // }
}


