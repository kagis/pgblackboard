

use regex::Regex;

 
pub fn next_statement(input: &str) -> &str {
    let re = Regex::new(
        //r"^\"[^\"]*\"", // ident
        //r"^'[^']*'", // literal
        r"^([eE]'(\\.|[^'])*'|.)", // extended literal
        //r"^--.*", // line comment
        //r"^\/\*[^]*?\*\/", // block comment
        //r"^(\$\w*\$)[^]*?\1", // dollar quoted literal
    ).unwrap();
    let mut tail = input;
    while !tail.is_empty() && !tail.starts_with(';') {
        let pos = re.find(tail).expect("unable to split sql sqript").end();
        tail = &tail[pos..];
    }
    &input[0..input.len() - tail.len() + 1]
}
 
//  function nextStatement(input) {
//     let tail = input
//     while (tail && tail[0] != ';') {
//       tail = tail.substr([
//           /^"[^"]*"/, // ident
//           /^'[^']*'/, // literal
//           /^[eE]'(\\.|[^'])*'/, // extended literal
//           /^--.*/, // line comment
//           /^\/\*[^]*?\*\//, // block comment
//           /^(\$\w*\$)[^]*?\1/, // dollar quoted literal
//         ].map(re => tail.match(re))
//           .filter(Boolean)
//           .map(m => m[0].length)[0] || 1
//       );
//     }
//     return input.substr(0, input.length - tail.length + 1);
//   }

#[cfg(test)]
mod tests {
    use super::next_statement;
    
    #[test]
    fn test_split_statements() {
      assert_eq!(next_statement("SELECT 1; SELECT 2;"), "SELECT 1;");
    }
    
    #[test]
    fn test_ignore_semicolon_within_extended_literal() {
      assert_nosplit("SELECT e'\\';\\'', ...");
      assert_nosplit("SELECT E'\\';\\'', ...");
    }
    
    #[test]
    fn test_ignore_semicolon_within_ident() {
      assert_nosplit("SELECT 1 AS \";\", ...");
    }
    
    #[test]
    fn test_ignore_semicolon_within_dollar_literal() {
      assert_nosplit("SELECT 1 AS $$;$$, ...");
    }
    
    #[test]
    fn test_ignore_semicolon_within_dollar_literal_with_named_tag() {
      assert_nosplit("SELECT 1 AS $foo_1$\n;$foo_1$, ...");
    }
    
    #[test]
    fn test_ignore_semicolon_within_dollar_literal_with_nested_dollar() {
      assert_nosplit("SELECT 1 AS $foo_1$ $bar\n; $foo_1$");
    }
    
    #[test]
    fn test_ignore_semicolon_within_block_comment() {
      assert_nosplit("SELECT 1/*\n;*/, ...");
    }
    
    #[test]
    fn test_ignore_semicolon_within_line_comment() {
      assert_nosplit("SELECT 1 -- one;\n, ...");
    }
    
    fn assert_nosplit(input: &str) {
        assert_eq!(next_statement(input), input);   
    }
}
