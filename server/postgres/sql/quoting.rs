use std::fmt::{self, Display, Formatter};

pub fn quote_literal(raw: &str) -> SqlEscape {
    SqlEscape { raw: raw, quote: '\'' }
}

pub fn quote_ident(raw: &str) -> SqlEscape {
    SqlEscape { raw: raw, quote: '"' }
}

pub struct SqlEscape<'a> {
    quote: char,
    raw: &'a str
}

impl<'a> Display for SqlEscape<'a> {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        use std::iter;

        let dup_quote = |c| iter::repeat(c).take(if c == self.quote {2} else {1});
        let escaped_chars = iter::once(self.quote)
                              .chain(self.raw.chars().flat_map(dup_quote))
                              .chain(iter::once(self.quote));

        for c in escaped_chars {
            try!(write!(f, "{}", c));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::{quote_literal, quote_ident};

    #[test]
    fn literal() {
        assert_eq!(
            &quote_literal("value").to_string()[..],
            "'value'"
        );
    }

    #[test]
    fn literal_containing_quote() {
        assert_eq!(
            &quote_literal("I'm string").to_string()[..],
            "'I''m string'"
        );
    }

    #[test]
    fn ident() {
        assert_eq!(
            &quote_ident("value").to_string()[..],
            "\"value\""
        );
    }

    #[test]
    fn ident_with_double_quote() {
        assert_eq!(
            &quote_ident("a\"b").to_string()[..],
            "\"a\"\"b\""
        );
    }
}
