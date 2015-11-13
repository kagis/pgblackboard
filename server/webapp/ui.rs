use std::fmt::Display;
use std::io::{self, Write};

pub const FAVICON_ICO: &'static [u8] = include_bytes!(concat!(
    env!("OUT_DIR"), "/favicon.ico"));

pub const FAVICON_ICO_MD5: &'static str = include_str!(concat!(
    env!("OUT_DIR"), "/favicon.ico.etag"));

pub const BUNDLE_INDEX: &'static [u8] = include_bytes!(concat!(
    env!("OUT_DIR"), "/pgblackboard.js.gz"));

pub const BUNDLE_INDEX_MD5: &'static str = include_str!(concat!(
    env!("OUT_DIR"), "/pgblackboard.js.gz.etag"));

pub const BUNDLE_MAP: &'static [u8] = include_bytes!(concat!(
    env!("OUT_DIR"), "/pgblackboard.js.gz"));

pub const BUNDLE_MAP_MD5: &'static str = include_str!(concat!(
    env!("OUT_DIR"), "/pgblackboard.js.gz.etag"));



pub fn render_home_page<TWriter, TInitData>(
    writer: &mut TWriter,
    initial_data: TInitData)
    -> io::Result<()>
    where
    TWriter: Write,
    TInitData: Display
{
    let html = include_str!(concat!(
        env!("OUT_DIR"), "/index.html"
    ));

    let html = html.replace(
        "/*INITIAL-DATA-PLACEHOLDER*/",
        &format!("{}", initial_data)
    );

    write!(writer, "{}", html)
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
