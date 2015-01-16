pub struct RowDecoder {
    len: usize,
    row: ::std::iter::Peekable<Option<String>, ::std::vec::IntoIter<Option<String>>>,
}

impl RowDecoder {
    pub fn new(row: Vec<Option<String>>) -> RowDecoder {
        RowDecoder {
            len: row.len(),
            row: row.into_iter().peekable(),
        }
    }
}

#[derive(Show)]
enum DecodeError {
    MissingField,
    MissingValue,
    ParseError,
}

impl ::serialize::Decoder for RowDecoder {
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
        match self.row.next() {
            Some(maybe_val) => maybe_val.ok_or(DecodeError::MissingValue),
            None => Err(DecodeError::MissingField)
        }
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
        // if (len != self.len) {
        //     panic!("Fields count mismatch.");
        // }
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

    fn read_option<T, F>(&mut self, mut f: F) -> Result<T, DecodeError> where F: FnMut(&mut Self, bool) -> Result<T, DecodeError> {
        let next_is_some = match self.row.peek() {
            Some(maybe_val) => maybe_val.is_some(),
            None => return Err(DecodeError::MissingField),
        };

        f(self, next_is_some)
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

mod test {
    use super::{
        RowDecoder,
        DecodeError
    };

    #[test]
    fn decode_two_strings() {

        #[derive(Decodable, Show, PartialEq)]
        struct FooBar {
            foo: String,
            bar: String,
        }

        let mut decoder = RowDecoder::new(vec![
            Some("postgres".to_string()),
            Some("database".to_string()),
        ]);

        let decoded: FooBar = ::serialize::Decodable::decode(&mut decoder).unwrap();


        assert_eq!(decoded, FooBar {
            foo: "postgres".to_string(),
            bar: "database".to_string(),
        });
    }

    #[test]
    fn decode_optional_strings() {

         #[derive(Decodable, Show, PartialEq)]
        struct FooBar {
            foo: String,
            bar: Option<String>,
        }

        let mut decoder = RowDecoder::new(vec![
            Some("postgres".to_string()),
            None,
        ]);

        let decoded: FooBar = ::serialize::Decodable::decode(&mut decoder).unwrap();

        assert_eq!(decoded, FooBar {
            foo: "postgres".to_string(),
            bar: None
        });
    }
}
