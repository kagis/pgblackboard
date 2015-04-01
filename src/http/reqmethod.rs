use std::fmt::{Display, Formatter};
use std::str::FromStr;
use std::io::Read;
use reqerror::RequestError;
use respstatus::ResponseStatus;
use grammar::is_token;

macro_rules! define_request_methods {
    ( $(($s:expr, $i:ident)),*) => {
        #[derive(Debug, Copy)]
        pub enum RequestMethod {
            $($i,)*
        }

        impl Display for RequestMethod {
            fn fmt(&self, f: &mut Formatter) -> ::std::fmt::Result {
                write!(f, "{}", match *self {
                    $(RequestMethod::$i => $s,)*
                })
            }
        }

        impl FromStr for RequestMethod {
            type Err = RequestError;

            fn from_str(s: &str) -> Result<Self, RequestError> {
                match s {
                    $($s => Ok(RequestMethod::$i),)*
                    _ => Err(RequestError {
                        status: ResponseStatus::BadRequest,
                        desc: "Invalid method requested."
                    })
                }
            }
        }

    }
}

define_request_methods! {
    ("GET"    , Get    ),
    ("POST"   , Post   ),
    ("PUT"    , Put    ),
    ("PATCH"  , Patch  ),
    ("DELETE" , Delete )
}

// pub enum RequestMethod {
//     Get,
//     Post,
//     Put,
//     Delete,
//     Patch,
// }

// Reads method until whitespace
// fn read_request_method<R: Read>(input: R) -> Result<RequestMethod, RequestError> {
//     let mut limit = 10;
//     let mut method_name = Vec::with_capacity(limit);
//     while limit > 0 {
//         match try!(input.read_u8()) {
//             token if is_token(token) => method_name.push(token),
//             b' ' => return parse_request_method(method_name),
//             _ => return Err(RequestError {
//                 status: RequestMethod::BadRequest,
//                 desc: "Invalid symbol in method name.",
//             })
//         }
//     }

//     Err(RequestError {
//         status: RequestMethod::NotImplemented,
//         desc: "Requested method too long.",
//     })
// }

// fn parse_request_method(raw: Vec<u8>) -> RequestMethod {

// }
