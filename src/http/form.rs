type FormEntry = (String, String);

pub struct FormDecoder {
    form: Vec<FormEntry>,
    reading_values: Vec<String>,
}

impl FormDecoder {
    pub fn new(form: Vec<FormEntry>) -> FormDecoder {
        FormDecoder {
            form: form,
            reading_values: vec![]
        }
    }
}

#[derive(Show)]
enum DecodeError {
    MissingField,
    MissingValue,
    ParseError,
}

impl ::serialize::Decoder for FormDecoder {
    type Error = DecodeError;

    fn read_nil(&mut self) -> Result<(), DecodeError> { unimplemented!() }
    fn read_uint(&mut self) -> Result<usize, DecodeError> { unimplemented!() }
    fn read_u64(&mut self) -> Result<u64, DecodeError> { unimplemented!() }
    fn read_u32(&mut self) -> Result<u32, DecodeError> { unimplemented!() }
    fn read_u16(&mut self) -> Result<u16, DecodeError> { unimplemented!() }
    fn read_u8(&mut self) -> Result<u8, DecodeError> { unimplemented!() }
    fn read_int(&mut self) -> Result<isize, DecodeError> { unimplemented!() }
    fn read_i64(&mut self) -> Result<i64, DecodeError> { unimplemented!() }
    fn read_i32(&mut self) -> Result<i32, DecodeError> { unimplemented!() }
    fn read_i16(&mut self) -> Result<i16, DecodeError> { unimplemented!() }
    fn read_i8(&mut self) -> Result<i8, DecodeError> { unimplemented!() }
    fn read_bool(&mut self) -> Result<bool, DecodeError> { unimplemented!() }
    fn read_f64(&mut self) -> Result<f64, DecodeError> { unimplemented!() }
    fn read_f32(&mut self) -> Result<f32, DecodeError> { unimplemented!() }
    fn read_char(&mut self) -> Result<char, DecodeError> { unimplemented!() }

    fn read_str(&mut self) -> Result<String, DecodeError> {
        match self.reading_values.pop() {
            Some(val) => Ok(val),
            None => Err(DecodeError::MissingValue),
        }
    }

    fn read_enum<T, F>(&mut self, name: &str, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> { unimplemented!() }
    fn read_enum_variant<T, F>(&mut self, names: &[&str], f: F) -> Result<T, DecodeError> where F: FnMut(&mut Self, usize) -> Result<T, DecodeError> { unimplemented!() }
    fn read_enum_variant_arg<T, F>(&mut self, a_idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> { unimplemented!() }
    fn read_enum_struct_variant<T, F>(&mut self, names: &[&str], f: F) -> Result<T, DecodeError> where F: FnMut(&mut Self, usize) -> Result<T, DecodeError> { unimplemented!() }
    fn read_enum_struct_variant_field<T, F>(&mut self, f_name: &str, f_idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> { unimplemented!() }
    fn read_struct<T, F>(&mut self, s_name: &str, len: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        // if (len != self.len) {
        //     panic!("Fields count mismatch.");
        // }
        f(self)
    }

    fn read_struct_field<T, F>(&mut self, f_name: &str, f_idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> {
        let mut i = self.form.len();
        while (i > 0) {
            i -= 1;
            if self.form[i].0 == f_name {
                let val = self.form.swap_remove(i).1;
                self.reading_values.push(val);
            }
        }

        f(self)
    }

    fn read_tuple<T, F>(&mut self, len: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> { unimplemented!() }
    fn read_tuple_arg<T, F>(&mut self, a_idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> { unimplemented!() }
    fn read_tuple_struct<T, F>(&mut self, s_name: &str, len: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> { unimplemented!() }
    fn read_tuple_struct_arg<T, F>(&mut self, a_idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> { unimplemented!() }
    fn read_option<T, F>(&mut self, mut f: F) -> Result<T, DecodeError> where F: FnMut(&mut Self, bool) -> Result<T, DecodeError> {
        let has_values = !self.reading_values.is_empty();
        f(self, has_values)
    }

    fn read_seq<T, F>(&mut self, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self, usize) -> Result<T, DecodeError> { unimplemented!() }
    fn read_seq_elt<T, F>(&mut self, idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> { unimplemented!() }
    fn read_map<T, F>(&mut self, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self, usize) -> Result<T, DecodeError> { unimplemented!() }
    fn read_map_elt_key<T, F>(&mut self, idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> { unimplemented!() }
    fn read_map_elt_val<T, F>(&mut self, idx: usize, f: F) -> Result<T, DecodeError> where F: FnOnce(&mut Self) -> Result<T, DecodeError> { unimplemented!() }
    fn error(&mut self, err: &str) -> DecodeError { unimplemented!() }
}

mod test {
    use super::{
        FormDecoder,
        DecodeError
    };

    #[test]
    fn decode_two_strings() {

        #[derive(Decodable, Show, PartialEq)]
        struct FooBar {
            database: String,
            sql_script: String,
        }

        let mut decoder = FormDecoder::new(vec![
            ("database".to_string(), "postgres".to_string()),
            ("sql_script".to_string(), "select 'hello'".to_string()),
        ]);

        let decoded: FooBar = ::serialize::Decodable::decode(&mut decoder).unwrap();


        assert_eq!(decoded, FooBar {
            database: "postgres".to_string(),
            sql_script: "select 'hello'".to_string(),
        });
    }

    // #[test]
    // fn decode_optional_strings() {

    //      #[derive(Decodable, Show, PartialEq)]
    //     struct FooBar {
    //         foo: String,
    //         bar: Option<String>,
    //     }

    //     let mut decoder = FormDecoder::new(vec![
    //         Some("postgres".to_string()),
    //         None,
    //     ]);

    //     let decoded: FooBar = ::serialize::Decodable::decode(&mut decoder).unwrap();

    //     assert_eq!(decoded, FooBar {
    //         foo: "postgres".to_string(),
    //         bar: None
    //     });
    // }
}
