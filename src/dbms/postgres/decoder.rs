#![allow(unused_variables)]

use rustc_serialize::{Decodable, Decoder};
use std::str::FromStr;

pub fn decode_row<T: Decodable>(row: Vec<Option<String>>) -> DecodeResult<T> {
    let mut decoder = RowDecoder::new(row);
    Decodable::decode(&mut decoder)
}

struct RowDecoder {
    row: ::std::vec::IntoIter<Option<String>>,
    reading_value: Option<String>,
}

impl RowDecoder {
    pub fn new(row: Vec<Option<String>>) -> RowDecoder {
        RowDecoder {
            reading_value: None,
            row: row.into_iter(),
        }
    }

    fn read_from_str<T: FromStr>(&mut self) -> DecodeResult<T> {
        self.read_str().and_then(|s| {
            s.parse().map_err(|err| DecodeError::ParseError)
        })
    }
}

#[derive(Debug)]
pub enum DecodeError {
    MissingField,
    MissingValue,
    ParseError,
}

impl ::std::error::Error for DecodeError {
    fn description(&self) -> &str {
        match *self {
            DecodeError::MissingField => "MissingField",
            DecodeError::MissingValue => "MissingValue",
            DecodeError::ParseError => "ParseError"
        }
    }
}

impl ::std::fmt::Display for DecodeError {
    fn fmt(&self, f: &mut ::std::fmt::Formatter) -> Result<(), ::std::fmt::Error> {
        write!(f, "{:?}", self)
    }
}


pub type DecodeResult<T> = Result<T, DecodeError>;


impl Decoder for RowDecoder {
    type Error = DecodeError;

    fn read_nil(&mut self) -> DecodeResult<()> {
        unimplemented!()
    }

    fn read_usize(&mut self) -> DecodeResult<usize> { self.read_from_str() }
    fn read_u64(&mut self) -> DecodeResult<u64> { self.read_from_str() }
    fn read_u32(&mut self) -> DecodeResult<u32> { self.read_from_str() }
    fn read_u16(&mut self) -> DecodeResult<u16> { self.read_from_str() }
    fn read_u8(&mut self) -> DecodeResult<u8> { self.read_from_str() }
    fn read_isize(&mut self) -> DecodeResult<isize> { self.read_from_str() }
    fn read_i64(&mut self) -> DecodeResult<i64> { self.read_from_str() }
    fn read_i32(&mut self) -> DecodeResult<i32> { self.read_from_str() }
    fn read_i16(&mut self) -> DecodeResult<i16> { self.read_from_str() }
    fn read_i8(&mut self) -> DecodeResult<i8> { self.read_from_str() }

    fn read_bool(&mut self) -> DecodeResult<bool> {
        self.read_str().and_then(|s| match &s[..] {
            "t" => Ok(true),
            "f" => Ok(false),
            nonbool => Err(DecodeError::ParseError),
        })
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
        self.reading_value.take().ok_or(DecodeError::MissingValue)
    }

    fn read_enum<T, F>(&mut self, name: &str, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self) -> DecodeResult<T>
    {
        unimplemented!()
    }

    fn read_enum_variant<T, F>(&mut self, names: &[&str], f: F) -> DecodeResult<T>
        where F: FnMut(&mut Self, usize) -> DecodeResult<T>
    {
        unimplemented!()
    }

    fn read_enum_variant_arg<T, F>(&mut self, a_idx: usize, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self) -> DecodeResult<T>
    {
        unimplemented!()
    }

    fn read_enum_struct_variant<T, F>(&mut self, names: &[&str], f: F) -> DecodeResult<T>
        where F: FnMut(&mut Self, usize) -> DecodeResult<T>
    {
        unimplemented!()
    }

    fn read_enum_struct_variant_field<T, F>(&mut self, f_name: &str, f_idx: usize, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self) -> DecodeResult<T>
    {
        unimplemented!()
    }

    fn read_struct<T, F>(&mut self, s_name: &str, len: usize, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self) -> DecodeResult<T>
    {
        f(self)
    }

    fn read_struct_field<T, F>(&mut self, f_name: &str, f_idx: usize, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self) -> DecodeResult<T>
    {
        self.reading_value = try!(self.row.next().ok_or(DecodeError::MissingField));
        f(self)
    }

    fn read_tuple<T, F>(&mut self, len: usize, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self) -> DecodeResult<T>
    {
        f(self)
    }

    fn read_tuple_arg<T, F>(&mut self, a_idx: usize, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self) -> DecodeResult<T>
    {
        self.reading_value = try!(self.row.next().ok_or(DecodeError::MissingField));
        f(self)
    }

    fn read_tuple_struct<T, F>(&mut self, s_name: &str, len: usize, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self) -> DecodeResult<T>
    {
        unimplemented!()
    }

    fn read_tuple_struct_arg<T, F>(&mut self, a_idx: usize, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self) -> DecodeResult<T>
    {
        unimplemented!()
    }

    fn read_option<T, F>(&mut self, mut f: F) -> DecodeResult<T>
        where F: FnMut(&mut Self, bool) -> DecodeResult<T>
    {
        let has_value = self.reading_value.is_some();
        f(self, has_value)
    }

    fn read_seq<T, F>(&mut self, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self, usize) -> DecodeResult<T>
    {
        unimplemented!()
    }

    fn read_seq_elt<T, F>(&mut self, idx: usize, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self) -> DecodeResult<T>
    {
        unimplemented!()
    }

    fn read_map<T, F>(&mut self, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self, usize) -> DecodeResult<T>
    {
        unimplemented!()
    }

    fn read_map_elt_key<T, F>(&mut self, idx: usize, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self) -> DecodeResult<T>
    {
        unimplemented!()
    }

    fn read_map_elt_val<T, F>(&mut self, idx: usize, f: F) -> DecodeResult<T>
        where F: FnOnce(&mut Self) -> DecodeResult<T>
    {
        unimplemented!()
    }

    fn error(&mut self, err: &str) -> DecodeError {
        unimplemented!()
    }

}



#[cfg(test)]
mod test {
    use super::{
        decode_row,
        DecodeError
    };


    #[test]
    fn decode_two_strings() {

        #[derive(RustcDecodable, Debug, PartialEq)]
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

        #[derive(RustcDecodable, Debug, PartialEq)]
        struct FooBar {
            foo: String,
            bar: Option<String>,
            buz: String,
        }

        let decoded: FooBar = decode_row(vec![
            Some("one".to_string()),
            None,
            Some("three".to_string()),
        ]).unwrap();

        assert_eq!(decoded, FooBar {
            foo: "one".to_string(),
            bar: None,
            buz: "three".to_string()
        });
    }
}
