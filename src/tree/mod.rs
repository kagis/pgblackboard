// use super::postgres;
// use serialize::json::{ Json, ToJson };
//use ::std::io::IoError;
// struct NodeService<T: ::std::io::Stream> {
//     dbconn: postgres::DatabaseConnection<T>,
//     nodeid: String,
//     nodetype: String,
// }



#[derive(Decodable)]
struct Node {
    nodeid: String,
    nodetype: String,
}



// impl<T: ::std::io::Stream> NodeController<T> {

//     pub fn get_children(&mut self) -> IoResult<Json> {
//         //let rows = try!(self.dbconn.execute_query("select 1"));
//         //let
//     }

//     pub fn get_definition(&mut self) -> IoResult<Json> {

//     }
// }


struct RowDecoder<TRow: Iterator<Item=String>> {
    row: TRow,
}


type DecodeError = String;

impl<TRow: Iterator<Item=String>> ::serialize::Decoder for RowDecoder<TRow> {
    type Error = DecodeError;

    fn read_nil(&mut self) -> Result<(), DecodeError> {
        unimplemented!()
    }

    fn read_uint(&mut self) -> Result<usize, DecodeError> {
        unimplemented!()
    }

    fn read_u64(&mut self) -> Result<u64, DecodeError> {
        unimplemented!()
    }

    fn read_u32(&mut self) -> Result<u32, DecodeError> {
        unimplemented!()
    }

    fn read_u16(&mut self) -> Result<u16, DecodeError> {
        unimplemented!()
    }

    fn read_u8(&mut self) -> Result<u8, DecodeError> {
        unimplemented!()
    }

    fn read_int(&mut self) -> Result<isize, DecodeError> {
        unimplemented!()
    }

    fn read_i64(&mut self) -> Result<i64, DecodeError> {
        unimplemented!()
    }

    fn read_i32(&mut self) -> Result<i32, DecodeError> {
        unimplemented!()
    }

    fn read_i16(&mut self) -> Result<i16, DecodeError> {
        unimplemented!()
    }

    fn read_i8(&mut self) -> Result<i8, DecodeError> {
        unimplemented!()
    }

    fn read_bool(&mut self) -> Result<bool, DecodeError> {
        unimplemented!()
    }

    fn read_f64(&mut self) -> Result<f64, DecodeError> {
        unimplemented!()
    }

    fn read_f32(&mut self) -> Result<f32, DecodeError> {
        unimplemented!()
    }

    fn read_char(&mut self) -> Result<char, DecodeError> {
        unimplemented!()
    }

    fn read_str(&mut self) -> Result<String, DecodeError> {
        self.row.next().ok_or("no more values".to_string())
    }

    fn read_enum<T, F>(&mut self, name: &str, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_enum_variant<T, F>(&mut self, names: &[&str], f: F) -> Result<T, DecodeError> where F: FnMut(&mut Self, usize) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_enum_variant_arg<T, F>(&mut self, a_idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_enum_struct_variant<T, F>(&mut self, names: &[&str], f: F) -> Result<T, DecodeError> where F: FnMut(&mut Self, usize) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_enum_struct_variant_field<T, F>(&mut self, f_name: &str, f_idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_struct<T, F>(&mut self, s_name: &str, len: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        f(self)
    }

    fn read_struct_field<T, F>(&mut self, f_name: &str, f_idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        f(self)
    }

    fn read_tuple<T, F>(&mut self, len: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_tuple_arg<T, F>(&mut self, a_idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_tuple_struct<T, F>(&mut self, s_name: &str, len: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_tuple_struct_arg<T, F>(&mut self, a_idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_option<T, F>(&mut self, f: F) -> Result<T, DecodeError> where F: FnMut(&mut Self, bool) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_seq<T, F>(&mut self, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self, usize) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_seq_elt<T, F>(&mut self, idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_map<T, F>(&mut self, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self, usize) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_map_elt_key<T, F>(&mut self, idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn read_map_elt_val<T, F>(&mut self, idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        unimplemented!()
    }

    fn error(&mut self, err: &str) -> DecodeError {
        unimplemented!()
    }

}


#[test]
fn test_row_decoder() {
    let mut row = vec![
        "postgres".to_string(),
        "database".to_string(),
    ];

    let mut decoder = RowDecoder { row: row.drain() };
    let node: Result<Node, DecodeError> = ::serialize::Decodable::decode(&mut decoder);

    let node = node.unwrap();

    assert_eq!(node.nodeid, "postgres");
    assert_eq!(node.nodetype, "database");
}
