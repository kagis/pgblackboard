use rustc_serialize::{Decoder, Decodable};


pub fn decode_form<T>(form: Vec<(String, String)>) -> DecodeResult<T>
    where T: Decodable
{
    let mut decoder = FormDecoder::new(form);
    Decodable::decode(&mut decoder)
}

pub type DecodeResult<T> = Result<T, DecodeError>;

#[derive(Debug)]
pub enum DecodeError {
    MissingField,
    MissingValue,
    ParseError,
}



type FormEntry = (String, String);


struct FormDecoder {
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


#[allow(unused_variables)]
impl Decoder for FormDecoder {
    type Error = DecodeError;

    fn read_nil(&mut self) -> DecodeResult<()> { unimplemented!() }
    fn read_usize(&mut self) -> DecodeResult<usize> { unimplemented!() }
    fn read_u64(&mut self) -> DecodeResult<u64> { unimplemented!() }
    fn read_u32(&mut self) -> DecodeResult<u32> { unimplemented!() }
    fn read_u16(&mut self) -> DecodeResult<u16> { unimplemented!() }
    fn read_u8(&mut self) -> DecodeResult<u8> { unimplemented!() }
    fn read_isize(&mut self) -> DecodeResult<isize> { unimplemented!() }
    fn read_i64(&mut self) -> DecodeResult<i64> { unimplemented!() }
    fn read_i32(&mut self) -> DecodeResult<i32> { unimplemented!() }
    fn read_i16(&mut self) -> DecodeResult<i16> { unimplemented!() }
    fn read_i8(&mut self) -> DecodeResult<i8> { unimplemented!() }
    fn read_bool(&mut self) -> DecodeResult<bool> { unimplemented!() }
    fn read_f64(&mut self) -> DecodeResult<f64> { unimplemented!() }
    fn read_f32(&mut self) -> DecodeResult<f32> { unimplemented!() }
    fn read_char(&mut self) -> DecodeResult<char> { unimplemented!() }

    fn read_str(&mut self) -> DecodeResult<String> {
        self.reading_values
            .pop()
            .ok_or(DecodeError::MissingValue)
    }

    fn read_enum<T, F>(&mut self, name: &str, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> { unimplemented!() }
    fn read_enum_variant<T, F>(&mut self, names: &[&str], f: F) -> DecodeResult<T> where F: FnMut(&mut Self, usize) -> DecodeResult<T> { unimplemented!() }
    fn read_enum_variant_arg<T, F>(&mut self, a_idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> { unimplemented!() }
    fn read_enum_struct_variant<T, F>(&mut self, names: &[&str], f: F) -> DecodeResult<T> where F: FnMut(&mut Self, usize) -> DecodeResult<T> { unimplemented!() }
    fn read_enum_struct_variant_field<T, F>(&mut self, f_name: &str, f_idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> { unimplemented!() }
    fn read_struct<T, F>(&mut self, s_name: &str, len: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        // if (len != self.len) {
        //     panic!("Fields count mismatch.");
        // }
        f(self)
    }

    fn read_struct_field<T, F>(&mut self, f_name: &str, f_idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> {
        let mut i = self.form.len();
        while i > 0 {
            i -= 1;
            if self.form[i].0 == f_name {
                let (_, val) = self.form.swap_remove(i);
                self.reading_values.push(val);
            }
        }

        f(self)
    }

    fn read_tuple<T, F>(&mut self, len: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> { unimplemented!() }
    fn read_tuple_arg<T, F>(&mut self, a_idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> { unimplemented!() }
    fn read_tuple_struct<T, F>(&mut self, s_name: &str, len: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> { unimplemented!() }
    fn read_tuple_struct_arg<T, F>(&mut self, a_idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> { unimplemented!() }
    fn read_option<T, F>(&mut self, mut f: F) -> DecodeResult<T> where F: FnMut(&mut Self, bool) -> DecodeResult<T> {
        let has_values = !self.reading_values.is_empty();
        f(self, has_values)
    }

    fn read_seq<T, F>(&mut self, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self, usize) -> DecodeResult<T> { unimplemented!() }
    fn read_seq_elt<T, F>(&mut self, idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> { unimplemented!() }
    fn read_map<T, F>(&mut self, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self, usize) -> DecodeResult<T> { unimplemented!() }
    fn read_map_elt_key<T, F>(&mut self, idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> { unimplemented!() }
    fn read_map_elt_val<T, F>(&mut self, idx: usize, f: F) -> DecodeResult<T> where F: FnOnce(&mut Self) -> DecodeResult<T> { unimplemented!() }
    fn error(&mut self, err: &str) -> DecodeError { unimplemented!() }
}




mod test {
    use super::{
        decode_form,
        DecodeError
    };

    #[test]
    fn decode_two_strings() {

        #[derive(RustcDecodable, Debug, PartialEq)]
        struct FooBar {
            database: String,
            sql_script: String,
        }

        let decoded: FooBar = decode_form(vec![
            ("database".to_string(), "postgres".to_string()),
            ("sql_script".to_string(), "select 'hello'".to_string()),
        ]).unwrap();


        assert_eq!(decoded, FooBar {
            database: "postgres".to_string(),
            sql_script: "select 'hello'".to_string(),
        });
    }

    // #[test]
    // fn decode_optional_strings() {

    //      #[derive(RustcDecodable, Debug, PartialEq)]
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
