//use std::env;
//use std::path::Path;
use std::process::Command;

fn main() {

    // let manifest_dir = env::var("CARGO_MANIFEST_DIR")
    //     .expect("CARGO_MANIFEST_DIR is not set");
    //
    // let projdir = Path::new(&manifest_dir).parent()
    //     .expect("Cannot navigate to parent dir");

    let status = Command::new("npm")
                         .arg("run")
                         .arg("installdep-and-build")
                         //.current_dir(projdir)
                         .status()
                         .unwrap()
                         .code()
                         .unwrap();

    if status != 0 {
        panic!("`npm run build` failed.");
    }
}
