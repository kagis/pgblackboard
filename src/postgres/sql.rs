fn split_next(script: &str) -> (&str, &str) {
    let mut escaping = false;
    let mut maybe_escape_ch = None;
    let mut maybe_close_token = None;
    for (pos, x) in script.char_indices() {
        let head = &script[..pos + x.len_utf8()];
        if escaping {
            escaping = false;
        } else if maybe_escape_ch == Some(x) {
            escaping = true;
        } else if let Some(close_token) = maybe_close_token {
            if head.ends_with(close_token) {
                maybe_escape_ch = None;
                maybe_close_token = None;
            }
        } else if head.ends_with("/*") {
            maybe_close_token = Some("*/");
        } else if x == ';' {
            return script.split_at(pos + x.len_utf8());
        }
    }
    (script, "")
}

#[test]
fn split_next_() {
    assert_eq!(("BEGIN;", "END"), split_next("BEGIN;END"));
    assert_eq!(("BEGIN/*/;*/;", "END"), split_next("BEGIN/*/;*/;END"));
}
