use std::process::{exit, Command};

fn main() {
    let status = Command::new("npm")
        .args(&["run", "build-ui"])
        .status()
        .unwrap();

    exit(status.code().unwrap_or(0));
}
