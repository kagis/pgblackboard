/// http://www.w3.org/Protocols/rfc2616/rfc2616-sec6.html#sec6.1
#[derive(Debug, Clone, Copy)]
#[derive(PartialEq)]
#[allow(dead_code)]
pub enum Status {
    Continue                     = 100,
    SwitchingProtocols           = 101,

    Ok                           = 200,
    Created                      = 201,
    Accepted                     = 202,
    NonAuthoritativeInformation  = 203,
    NoContent                    = 204,
    ResetContent                 = 205,
    PartialContent               = 206,

    MultipleChoices              = 300,
    MovedPermanently             = 301,
    Found                        = 302,
    SeeOther                     = 303,
    NotModified                  = 304,
    UseProxy                     = 305,
    TemporaryRedirect            = 307,

    BadRequest                   = 400,
    Unauthorized                 = 401,
    PaymentRequired              = 402,
    Forbidden                    = 403,
    NotFound                     = 404,
    MethodNotAllowed             = 405,
    NotAcceptable                = 406,
    ProxyAuthenticationRequired  = 407,
    RequestTimeout               = 408,
    Conflict                     = 409,
    Gone                         = 410,
    LengthRequired               = 411,
    PreconditionFailed           = 412,
    RequestEntityTooLarge        = 413,
    RequestUriTooLarge           = 414,
    UnsupportedMediaType         = 415,
    RequestedRangeNotSatisfiable = 416,
    ExpectationFailed            = 417,

    InternalServerError          = 500,
    NotImplemented               = 501,
    BadGateway                   = 502,
    ServiceUnavailable           = 503,
    GatewayTimeout               = 504,
    HttpVersionNotSupported      = 505,
}

impl Status {
    pub fn phrase(self) -> &'static str {
        match self {
            Status::Continue                     => "Continue",
            Status::SwitchingProtocols           => "Switching Protocols",

            Status::Ok                           => "OK",
            Status::Created                      => "Created",
            Status::Accepted                     => "Accepted",
            Status::NonAuthoritativeInformation  => "Non Authoritative Information",
            Status::NoContent                    => "No Content",
            Status::ResetContent                 => "Reset Content",
            Status::PartialContent               => "Partial Content",

            Status::MultipleChoices              => "Multiple Choices",
            Status::MovedPermanently             => "Moved Permanently",
            Status::Found                        => "Found",
            Status::SeeOther                     => "See Other",
            Status::NotModified                  => "Not Modified",
            Status::UseProxy                     => "Use Proxy",
            Status::TemporaryRedirect            => "Temporary Redirect",

            Status::BadRequest                   => "Bad Request",
            Status::Unauthorized                 => "Unauthorized",
            Status::PaymentRequired              => "Payment Required",
            Status::Forbidden                    => "Forbidden",
            Status::NotFound                     => "Not Found",
            Status::MethodNotAllowed             => "Method Not Allowed",
            Status::NotAcceptable                => "Not Acceptable",
            Status::ProxyAuthenticationRequired  => "Proxy Authentication Required",
            Status::RequestTimeout               => "Request Timeout",
            Status::Conflict                     => "Conflict",
            Status::Gone                         => "Gone",
            Status::LengthRequired               => "Length Required",
            Status::PreconditionFailed           => "Precondition Failed",
            Status::RequestEntityTooLarge        => "Request Entity To Large",
            Status::RequestUriTooLarge           => "Request Uri Too Large",
            Status::UnsupportedMediaType         => "Unsupported Media Type",
            Status::RequestedRangeNotSatisfiable => "Requested Range Not Satisfiable",
            Status::ExpectationFailed            => "Expectation Failed",

            Status::InternalServerError          => "Internal Server Error",
            Status::NotImplemented               => "Not Implemented",
            Status::BadGateway                   => "Bad Gateway",
            Status::ServiceUnavailable           => "Service Unavailable",
            Status::GatewayTimeout               => "Gateway Timeout",
            Status::HttpVersionNotSupported      => "Http Version Not Supported",
        }
    }
}
