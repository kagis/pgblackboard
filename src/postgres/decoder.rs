use ::serialize::Decodable;

struct RowDecoder {
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

type DecodeResult<T> = Result<T, DecodeError>;

impl ::serialize::Decoder for RowDecoder {
    type Error = DecodeError;

    fn read_nil(&mut self) -> DecodeResult<()> {
        unimplemented!()
    }

    fn read_uint(&mut self) -> DecodeResult<usize> {
        unimplemented!()
    }

    fn read_u64(&mut self) -> DecodeResult<u64> {
        unimplemented!()
    }

    fn read_u32(&mut self) -> DecodeResult<u32> {
        unimplemented!()
    }

    fn read_u16(&mut self) -> DecodeResult<u16> {
        unimplemented!()
    }

    fn read_u8(&mut self) -> DecodeResult<u8> {
        unimplemented!()
    }

    fn read_int(&mut self) -> DecodeResult<isize> {
        unimplemented!()
    }

    fn read_i64(&mut self) -> DecodeResult<i64> {
        unimplemented!()
    }

    fn read_i32(&mut self) -> DecodeResult<i32> {
        unimplemented!()
    }

    fn read_i16(&mut self) -> DecodeResult<i16> {
        unimplemented!()
    }

    fn read_i8(&mut self) -> DecodeResult<i8> {
        unimplemented!()
    }

    fn read_bool(&mut self) -> DecodeResult<bool> {
        unimplemented!()
    }

    fn read_f64(&mut self) -> DecodeResult<f64> {
        unimplemented!()
    }

    fn read_f32(&mut self) -> DecodeResult<f32> {
        unimplemented!()
    }

    fn read_char(&mut self) -> DecodeResult<char> {
        unimplemented!()
    }

    fn read_str(&mut self) -> DecodeResult<String> {
        self.row.next()
            .ok_or(DecodeError::MissingField)
            .and_then(|val_opt| val_opt.ok_or(DecodeError::MissingValue))
    }

    fn read_enum<T, F>(&mut self, name: &str, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        unimplemented!()
    }

    fn read_enum_variant<T, F>(&mut self, names: &[&str], f: F) -> DecodeResult<T> where F: FnMut(&mut Self, usize) -> DecodeResult<T> {
        unimplemented!()
    }

    fn read_enum_variant_arg<T, F>(&mut self, a_idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        unimplemented!()
    }

    fn read_enum_struct_variant<T, F>(&mut self, names: &[&str], f: F) -> DecodeResult<T> where F: FnMut(&mut Self, usize) -> DecodeResult<T> {
        unimplemented!()
    }

    fn read_enum_struct_variant_field<T, F>(&mut self, f_name: &str, f_idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        unimplemented!()
    }

    fn read_struct<T, F>(&mut self, s_name: &str, len: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        // if (len != self.len) {
        //     panic!("Fields count mismatch.");
        // }
        f(self)
    }

    fn read_struct_field<T, F>(&mut self, f_name: &str, f_idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        f(self)
    }

    fn read_tuple<T, F>(&mut self, len: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        unimplemented!()
    }

    fn read_tuple_arg<T, F>(&mut self, a_idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        unimplemented!()
    }

    fn read_tuple_struct<T, F>(&mut self, s_name: &str, len: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        unimplemented!()
    }

    fn read_tuple_struct_arg<T, F>(&mut self, a_idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        unimplemented!()
    }

    fn read_option<T, F>(&mut self, mut f: F) -> DecodeResult<T> where F: FnMut(&mut Self, bool) -> DecodeResult<T> {
        let next_is_some = match self.row.peek() {
            Some(maybe_val) => maybe_val.is_some(),
            None => return Err(DecodeError::MissingField),
        };

        f(self, next_is_some)
    }

    fn read_seq<T, F>(&mut self, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self, usize) -> DecodeResult<T> {
        unimplemented!()
    }

    fn read_seq_elt<T, F>(&mut self, idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        unimplemented!()
    }

    fn read_map<T, F>(&mut self, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self, usize) -> DecodeResult<T> {
        unimplemented!()
    }

    fn read_map_elt_key<T, F>(&mut self, idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        unimplemented!()
    }

    fn read_map_elt_val<T, F>(&mut self, idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        unimplemented!()
    }

    fn error(&mut self, err: &str) -> DecodeError {
        unimplemented!()
    }

}

pub fn decode_row<T: Decodable>(row: Vec<Option<String>>) -> DecodeResult<T> {
    let mut decoder = RowDecoder::new(row);
    Decodable::decode(&mut decoder)
}

mod test {
    use super::{
        decode_row,
        DecodeError
    };

    #[test]
    fn decode_two_strings() {

        #[derive(Decodable, Show, PartialEq)]
        struct FooBar {
            foo: String,
            bar: String,
        }

        let decoded: FooBar = decode_row(vec![
            Some("postgres".to_string()),
            Some("database".to_string()),
        ]).unwrap();


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

        let decoded: FooBar = decode_row(vec![
            Some("postgres".to_string()),
            None,
        ]).unwrap();

        assert_eq!(decoded, FooBar {
            foo: "postgres".to_string(),
            bar: None
        });
    }
}
