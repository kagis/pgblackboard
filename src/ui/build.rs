// use std::env;
use std::process::Command;

fn main() {

    // let out_dir = env::var("OUT_DIR").unwrap();

    let status = Command::new("npm")
                        .arg("install")
                        .status()
                        .unwrap()
                        .code()
                        .unwrap();

    if status != 0 {
        panic!("`npm install` failed.");
    }


    let status = Command::new("npm")
                        .arg("run")
                        .arg("build")
                        .status()
                        .unwrap()
                        .code()
                        .unwrap();

    if status != 0 {
        panic!("`npm run build` failed.");
    }
}
