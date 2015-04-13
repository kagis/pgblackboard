use http;
use fs;

struct FileResource {
    filename: &str
}

impl FileResource {
    fn new(filename: &str) -> FileResource {
        FileResource { filename: filename }
    }
}

struct ReaderResponse<R: Read> {

}


impl http::Resource for fs::Path {
    fn get(&self, req: &http::Request) -> Box<http::Response> {

    }
}

impl http::Response for fs::File {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result {
        let ext = self.
    }
}
