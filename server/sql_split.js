export function sql_split(input) {
  // https://www.postgresql.org/docs/15/sql-syntax-lexical.html
  // https://github.com/postgres/postgres/blob/REL_15_1/src/fe_utils/psqlscan.l
  // https://github.com/postgres/postgres/blob/REL_15_1/src/backend/parser/scan.l
  const opaque_patterns = [
    /--[^\r\n]*/uy, // line comment
    /\/\*[^]*?(\*\/|$)/uy, // block comment
    /"[^"]*("|$)/uy, // ident
    /'[^']*('|$)/uy, // literal
    // TODO между сегментами литерала могут быть коменты
    /\b[eE]'(\\.|'\s*'|[^'])*('|$)/uy, // slash-escape literal
    // TODO пустой тэг
    /(?<![\w\u0080-\uffff])(\$[_a-zA-Z\u0080-\uffff][\w\u0080-\uffff]*\$)[^]*?(\1|$)/uy, // dollar quoted literal
  ];

  scan: for (let i = 0, depth = 0; i < input.length;) {

    for (const re of opaque_patterns) {
      re.lastIndex = i;
      if (re.test(input)) {
        i = re.lastIndex;
        continue scan;
      }
    }

    switch (input[i++]) {
      case '(':
        depth++;
        break;

      case ')':
        depth--;
        depth = Math.max(0, depth);
        break;

      case ';':
        if (depth) break;
        return i;
    }
  }

  return input.length;
}

// const sql = String.raw `
//  select "$aa$ ; $aa$

//  ;

// `;
// const s = sql_split(sql);
// console.log(sql.slice(0, s + 1));

// Deno.test('a', _ => {
//   sql_split()
// });

// сложно парсить самому
// select e'a'
// 'b\''  ;

// https://github.com/postgres/postgres/blob/REL_15_1/src/fe_utils/psqlscan.l
// https://github.com/postgres/postgres/blob/REL_15_1/src/backend/parser/scan.l
// https://pganalyze.com/blog/parse-postgresql-queries-in-ruby



// # не нужно разделять
// сложно парсить
// опасно выполнять следующий стейтмент если предыдущий не выполнился до конца (suspended);

// # нужно разделять
// указать limit стейтментам в simple query
// нужен режим автокомита
// резолвить имена пользовательских типов перед выводом
// simple query буферизует ответ, не видно прогресс выполнения



