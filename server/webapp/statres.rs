use super::ui;

use http;
use std::io;


pub const FAVICON_RESOURCE: StaticResource = StaticResource {
    content: ui::FAVICON_ICO,
    etag: ui::FAVICON_ICO_MD5,
    content_type: "image/vnd.microsoft.icon",
    gzipped: false
};

pub const BUNDLE_INDEX_RESOURCE: StaticResource = StaticResource {
    content: ui::BUNDLE_INDEX,
    etag: ui::BUNDLE_INDEX_MD5,
    content_type: "application/javascript; charset=utf-8",
    gzipped: true
};

pub const BUNDLE_MAP_RESOURCE: StaticResource = StaticResource {
    content: ui::BUNDLE_MAP,
    etag: ui::BUNDLE_MAP_MD5,
    content_type: "application/javascript; charset=utf-8",
    gzipped: true
};

pub struct StaticResource {
    pub content: &'static [u8],
    pub content_type: &'static str,
    pub etag: &'static str,
    pub gzipped: bool
}

impl http::Resource for StaticResource {
    fn get(&self, req: &http::Request) -> Box<http::Response> {
        match req.if_non_match.as_ref() {
            Some(req_etag) if req_etag == self.etag => {
                Box::new(NotModifiedResponse {
                    etag: self.etag,
                    content_type: self.content_type
                })
            }
            _ => Box::new(StaticResponse {
                content: self.content,
                content_type: self.content_type,
                etag: self.etag,
                gzipped: self.gzipped
            })
        }
    }
}

struct StaticResponse {
    content: &'static [u8],
    content_type: &'static str,
    etag: &'static str,
    gzipped: bool
}

impl http::Response for StaticResponse {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        let mut w = try!(w.start_ok());
        try!(w.write_content_type(self.content_type));
        if self.gzipped {
            try!(w.write_header("Content-Encoding", "gzip"));
        }
        try!(w.write_header("ETag", self.etag));
        //try!(w.write_header("Cache-Control", "no-cache"));
        w.write_content(self.content)
    }
}

struct NotModifiedResponse {
    content_type: &'static str,
    etag: &'static str,
}

impl http::Response for NotModifiedResponse {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        let mut w = try!(w.start(http::Status::NotModified));
        try!(w.write_content_type(self.content_type));
        try!(w.write_header("ETag", self.etag));
        //try!(w.write_header("Cache-Control", "no-cache"));
        w.finish_without_body()
    }
}
