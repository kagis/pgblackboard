for (;;) {
  x == '{';
  x == '}';
  x == '[';
  x == ']';
  x == ',';
  x == ':';
}

function tokenize_value(inp) {
  x == '{';
  x == '[';
  x == '"';
  x == 'true';
  x == 'false';
  x == /-\d+/;
  x == 'null';
}

function tokenize_object(inp) {
}

function tokenize_array(inp) {
}



[{ "1": 2}, true, [1, 2]];

[
  {
    "1": 2
  },
  true,
  [
    1,
    2
  ]
]
