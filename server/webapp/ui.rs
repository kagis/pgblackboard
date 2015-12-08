use std::fmt::Display;
use std::io::{self, Write};


pub fn render_home_page<TWriter, TInitData>(
    writer: &mut TWriter,
    initial_data: TInitData)
    -> io::Result<()>
    where
    TWriter: Write,
    TInitData: Display
{
    write!(
      writer,
      include_str!(concat!(env!("OUT_DIR"), "/index.html")),
      initial_data = initial_data
    )
}

pub fn render_error_page<TWriter, TStatus, TPhrase, TMessage>(
    writer: &mut TWriter,
    status: TStatus,
    phrase: TPhrase,
    message: TMessage)
    -> io::Result<()>
    where
    TWriter: Write,
    TStatus: Display,
    TPhrase: Display,
    TMessage: Display
{
    write!(
        writer,
        include_str!(concat!(env!("OUT_DIR"), "/error.html")),
        code = status,
        phrase = phrase,
        message = message
    )
}
