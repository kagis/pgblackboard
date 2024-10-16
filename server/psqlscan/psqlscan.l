/*
  original file https://raw.githubusercontent.com/postgres/postgres/refs/tags/REL_17_0/src/fe_utils/psqlscan.l
*/

%top{
/*-------------------------------------------------------------------------
 *
 * psqlscan.l
 *	  lexical scanner for SQL commands
 *
 * This lexer used to be part of psql, and that heritage is reflected in
 * the file name as well as function and typedef names, though it can now
 * be used by other frontend programs as well.  It's also possible to extend
 * this lexer with a compatible add-on lexer to handle program-specific
 * backslash commands.
 *
 * This code is mainly concerned with determining where the end of a SQL
 * statement is: we are looking for semicolons that are not within quotes,
 * comments, or parentheses.  The most reliable way to handle this is to
 * borrow the backend's flex lexer rules, lock, stock, and barrel.  The rules
 * below are (except for a few) the same as the backend's, but their actions
 * are just ECHO whereas the backend's actions generally do other things.
 *
 * XXX The rules in this file must be kept in sync with the backend lexer!!!
 *
 * XXX Avoid creating backtracking cases --- see the backend lexer for info.
 *
 * See psqlscan_int.h for additional commentary.
 *
 *
 * Portions Copyright (c) 1996-2024, PostgreSQL Global Development Group
 * Portions Copyright (c) 1994, Regents of the University of California
 *
 * IDENTIFICATION
 *	  src/fe_utils/psqlscan.l
 *
 *-------------------------------------------------------------------------
 */

#include <ctype.h>

}

%{

/* LCOV_EXCL_START */

typedef void *yyscan_t;

/*
 * All working state of the lexer must be stored in PsqlScanStateData
 * between calls.  This allows us to have multiple open lexer operations,
 * which is needed for nested include files.  The lexer itself is not
 * recursive, but it must be re-entrant.
 */
typedef struct PsqlScanStateData
{
	yyscan_t	scanner;		/* Flex's state for this PsqlScanState */

	int			state_before_str_stop;	/* start cond. before end quote */
	int			paren_depth;	/* depth of nesting in parentheses */
	int			xcdepth;		/* depth of nesting in slash-star comments */
	char	   *dolqstart;		/* current $foo$ quote start string */

	/*
	 * State to track boundaries of BEGIN ... END blocks in function
	 * definitions, so that semicolons do not send query too early.
	 */
	int			identifier_count;	/* identifiers since start of statement */
	char		identifiers[4]; /* records the first few identifiers */
	int			begin_depth;	/* depth of begin/end pairs */

  int start_pos;
  int end_pos;
} PsqlScanStateData;


/* Abstract type for lexer's internal state */
typedef struct PsqlScanStateData *PsqlScanState;

/*
 * We must have a typedef YYSTYPE for yylex's first argument, but this lexer
 * doesn't presently make use of that argument, so just declare it as int.
 */
typedef int YYSTYPE;

/*
 * Set the type of yyextra; we use it as a pointer back to the containing
 * PsqlScanState.
 */
#define YY_EXTRA_TYPE PsqlScanState


/* Return values from yylex() */
#define LEXRES_EOL			0	/* end of input */
#define LEXRES_SEMI			1	/* command-terminating semicolon found */

#define ECHO ;

%}

%option reentrant
%option bison-bridge
%option 8bit
%option never-interactive
%option nodefault
%option noinput
%option nounput
%option noyywrap
%option warn
%option prefix="psql_yy"

/*
 * All of the following definitions and rules should exactly match
 * src/backend/parser/scan.l so far as the flex patterns are concerned.
 * The rule bodies are just ECHO as opposed to what the backend does,
 * however.  (But be sure to duplicate code that affects the lexing process,
 * such as BEGIN() and yyless().)  Also, psqlscan uses a single <<EOF>> rule
 * whereas scan.l has a separate one for each exclusive state.
 */

/*
 * OK, here is a short description of lex/flex rules behavior.
 * The longest pattern which matches an input string is always chosen.
 * For equal-length patterns, the first occurring in the rules list is chosen.
 * INITIAL is the starting state, to which all non-conditional rules apply.
 * Exclusive states change parsing rules while the state is active.  When in
 * an exclusive state, only those rules defined for that state apply.
 *
 * We use exclusive states for quoted strings, extended comments,
 * and to eliminate parsing troubles for numeric strings.
 * Exclusive states:
 *  <xb> bit string literal
 *  <xc> extended C-style comments
 *  <xd> delimited identifiers (double-quoted identifiers)
 *  <xh> hexadecimal byte string
 *  <xq> standard quoted strings
 *  <xqs> quote stop (detect continued strings)
 *  <xe> extended quoted strings (support backslash escape sequences)
 *  <xdolq> $foo$ quoted strings
 *  <xui> quoted identifier with Unicode escapes
 *  <xus> quoted string with Unicode escapes
 *
 * Note: we intentionally don't mimic the backend's <xeu> state; we have
 * no need to distinguish it from <xe> state, and no good way to get out
 * of it in error cases.  The backend just throws yyerror() in those
 * cases, but that's not an option here.
 */

%x xb
%x xc
%x xd
%x xh
%x xq
%x xqs
%x xe
%x xdolq
%x xui
%x xus

/*
 * In order to make the world safe for Windows and Mac clients as well as
 * Unix ones, we accept either \n or \r as a newline.  A DOS-style \r\n
 * sequence will be seen as two successive newlines, but that doesn't cause
 * any problems.  Comments that start with -- and extend to the next
 * newline are treated as equivalent to a single whitespace character.
 *
 * NOTE a fine point: if there is no newline following --, we will absorb
 * everything to the end of the input as a comment.  This is correct.  Older
 * versions of Postgres failed to recognize -- as a comment if the input
 * did not end with a newline.
 *
 * non_newline_space tracks all space characters except newlines.
 *
 * XXX if you change the set of whitespace characters, fix scanner_isspace()
 * to agree.
 */

space				[ \t\n\r\f\v]
non_newline_space	[ \t\f\v]
newline				[\n\r]
non_newline			[^\n\r]

comment			("--"{non_newline}*)

whitespace		({space}+|{comment})

/*
 * SQL requires at least one newline in the whitespace separating
 * string literals that are to be concatenated.  Silly, but who are we
 * to argue?  Note that {whitespace_with_newline} should not have * after
 * it, whereas {whitespace} should generally have a * after it...
 */

special_whitespace		({space}+|{comment}{newline})
non_newline_whitespace	({non_newline_space}|{comment})
whitespace_with_newline	({non_newline_whitespace}*{newline}{special_whitespace}*)

quote			'
/* If we see {quote} then {quotecontinue}, the quoted string continues */
quotecontinue	{whitespace_with_newline}{quote}

/*
 * {quotecontinuefail} is needed to avoid lexer backup when we fail to match
 * {quotecontinue}.  It might seem that this could just be {whitespace}*,
 * but if there's a dash after {whitespace_with_newline}, it must be consumed
 * to see if there's another dash --- which would start a {comment} and thus
 * allow continuation of the {quotecontinue} token.
 */
quotecontinuefail	{whitespace}*"-"?

/* Bit string
 * It is tempting to scan the string for only those characters
 * which are allowed. However, this leads to silently swallowed
 * characters if illegal characters are included in the string.
 * For example, if xbinside is [01] then B'ABCD' is interpreted
 * as a zero-length string, and the ABCD' is lost!
 * Better to pass the string forward and let the input routines
 * validate the contents.
 */
xbstart			[bB]{quote}
xbinside		[^']*

/* Hexadecimal byte string */
xhstart			[xX]{quote}
xhinside		[^']*

/* National character */
xnstart			[nN]{quote}

/* Quoted string that allows backslash escapes */
xestart			[eE]{quote}
xeinside		[^\\']+
xeescape		[\\][^0-7]
xeoctesc		[\\][0-7]{1,3}
xehexesc		[\\]x[0-9A-Fa-f]{1,2}
xeunicode		[\\](u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})
xeunicodefail	[\\](u[0-9A-Fa-f]{0,3}|U[0-9A-Fa-f]{0,7})

/* Extended quote
 * xqdouble implements embedded quote, ''''
 */
xqstart			{quote}
xqdouble		{quote}{quote}
xqinside		[^']+

/* $foo$ style quotes ("dollar quoting")
 * The quoted string starts with $foo$ where "foo" is an optional string
 * in the form of an identifier, except that it may not contain "$",
 * and extends to the first occurrence of an identical string.
 * There is *no* processing of the quoted text.
 *
 * {dolqfailed} is an error rule to avoid scanner backup when {dolqdelim}
 * fails to match its trailing "$".
 */
dolq_start		[A-Za-z\200-\377_]
dolq_cont		[A-Za-z\200-\377_0-9]
dolqdelim		\$({dolq_start}{dolq_cont}*)?\$
dolqfailed		\${dolq_start}{dolq_cont}*
dolqinside		[^$]+

/* Double quote
 * Allows embedded spaces and other special characters into identifiers.
 */
dquote			\"
xdstart			{dquote}
xdstop			{dquote}
xddouble		{dquote}{dquote}
xdinside		[^"]+

/* Quoted identifier with Unicode escapes */
xuistart		[uU]&{dquote}

/* Quoted string with Unicode escapes */
xusstart		[uU]&{quote}

/* error rule to avoid backup */
xufailed		[uU]&


/* C-style comments
 *
 * The "extended comment" syntax closely resembles allowable operator syntax.
 * The tricky part here is to get lex to recognize a string starting with
 * slash-star as a comment, when interpreting it as an operator would produce
 * a longer match --- remember lex will prefer a longer match!  Also, if we
 * have something like plus-slash-star, lex will think this is a 3-character
 * operator whereas we want to see it as a + operator and a comment start.
 * The solution is two-fold:
 * 1. append {op_chars}* to xcstart so that it matches as much text as
 *    {operator} would. Then the tie-breaker (first matching rule of same
 *    length) ensures xcstart wins.  We put back the extra stuff with yyless()
 *    in case it contains a star-slash that should terminate the comment.
 * 2. In the operator rule, check for slash-star within the operator, and
 *    if found throw it back with yyless().  This handles the plus-slash-star
 *    problem.
 * Dash-dash comments have similar interactions with the operator rule.
 */
xcstart			\/\*{op_chars}*
xcstop			\*+\/
xcinside		[^*/]+

ident_start		[A-Za-z\200-\377_]
ident_cont		[A-Za-z\200-\377_0-9\$]

identifier		{ident_start}{ident_cont}*

/* Assorted special-case operators and operator-like tokens */
typecast		"::"
dot_dot			\.\.
colon_equals	":="

/*
 * These operator-like tokens (unlike the above ones) also match the {operator}
 * rule, which means that they might be overridden by a longer match if they
 * are followed by a comment start or a + or - character. Accordingly, if you
 * add to this list, you must also add corresponding code to the {operator}
 * block to return the correct token in such cases. (This is not needed in
 * psqlscan.l since the token value is ignored there.)
 */
equals_greater	"=>"
less_equals		"<="
greater_equals	">="
less_greater	"<>"
not_equals		"!="

/*
 * "self" is the set of chars that should be returned as single-character
 * tokens.  "op_chars" is the set of chars that can make up "Op" tokens,
 * which can be one or more characters long (but if a single-char token
 * appears in the "self" set, it is not to be returned as an Op).  Note
 * that the sets overlap, but each has some chars that are not in the other.
 *
 * If you change either set, adjust the character lists appearing in the
 * rule for "operator"!
 */
self			[,()\[\].;\:\+\-\*\/\%\^\<\>\=]
op_chars		[\~\!\@\#\^\&\|\`\?\+\-\*\/\%\<\>\=]
operator		{op_chars}+

/*
 * Numbers
 *
 * Unary minus is not part of a number here.  Instead we pass it separately to
 * the parser, and there it gets coerced via doNegate().
 *
 * {numericfail} is used because we would like "1..10" to lex as 1, dot_dot, 10.
 *
 * {realfail} is added to prevent the need for scanner
 * backup when the {real} rule fails to match completely.
 */
decdigit		[0-9]
hexdigit		[0-9A-Fa-f]
octdigit		[0-7]
bindigit		[0-1]

decinteger		{decdigit}(_?{decdigit})*
hexinteger		0[xX](_?{hexdigit})+
octinteger		0[oO](_?{octdigit})+
bininteger		0[bB](_?{bindigit})+

hexfail			0[xX]_?
octfail			0[oO]_?
binfail			0[bB]_?

numeric			(({decinteger}\.{decinteger}?)|(\.{decinteger}))
numericfail		{decinteger}\.\.

real			({decinteger}|{numeric})[Ee][-+]?{decinteger}
realfail		({decinteger}|{numeric})[Ee][-+]

/* Positional parameters don't accept underscores. */
param			\${decdigit}+

/*
 * An identifier immediately following an integer literal is disallowed because
 * in some cases it's ambiguous what is meant: for example, 0x1234 could be
 * either a hexinteger or a decinteger "0" and an identifier "x1234".  We can
 * detect such problems by seeing if integer_junk matches a longer substring
 * than any of the XXXinteger patterns (decinteger, hexinteger, octinteger,
 * bininteger).  One "junk" pattern is sufficient because
 * {decinteger}{identifier} will match all the same strings we'd match with
 * {hexinteger}{identifier} etc.
 *
 * Note that the rule for integer_junk must appear after the ones for
 * XXXinteger to make this work correctly: 0x1234 will match both hexinteger
 * and integer_junk, and we need hexinteger to be chosen in that case.
 *
 * Also disallow strings matched by numeric_junk, real_junk and param_junk
 * for consistency.
 */
integer_junk	{decinteger}{identifier}
numeric_junk	{numeric}{identifier}
real_junk		{real}{identifier}
param_junk		\${decdigit}+{identifier}

/* psql-specific: characters allowed in variable names */
variable_char	[A-Za-z\200-\377_0-9]

other			.

/*
 * Dollar quoted strings are totally opaque, and no escaping is done on them.
 * Other quoted strings must allow some special characters such as single-quote
 *  and newline.
 * Embedded single-quotes are implemented both in the SQL standard
 *  style of two adjacent single quotes "''" and in the Postgres/Java style
 *  of escaped-quote "\'".
 * Other embedded escaped characters are matched explicitly and the leading
 *  backslash is dropped from the string.
 * Note that xcstart must appear before operator, as explained above!
 *  Also whitespace (comment) must appear before operator.
 */

%%

%{
		/* Declare some local variables inside yylex(), for convenience */
		PsqlScanState cur_state = yyextra;
    cur_state->start_pos = (int)yytext;
%}

{whitespace}	{
						ECHO;
				}

{xcstart}		{
					cur_state->xcdepth = 0;
					BEGIN(xc);
					/* Put back any characters past slash-star; see above */
					yyless(2);
					ECHO;
				}

<xc>{
{xcstart}		{
					cur_state->xcdepth++;
					/* Put back any characters past slash-star; see above */
					yyless(2);
					ECHO;
				}

{xcstop}		{
					if (cur_state->xcdepth <= 0)
						BEGIN(INITIAL);
					else
						cur_state->xcdepth--;
					ECHO;
				}

{xcinside}		{
					ECHO;
				}

{op_chars}		{
					ECHO;
				}

\*+				{
					ECHO;
				}
} /* <xc> */

{xbstart}		{
					BEGIN(xb);
					ECHO;
				}
<xh>{xhinside}	|
<xb>{xbinside}	{
					ECHO;
				}

{xhstart}		{
					/* Hexadecimal bit type.
					 * At some point we should simply pass the string
					 * forward to the parser and label it there.
					 * In the meantime, place a leading "x" on the string
					 * to mark it for the input routine as a hex string.
					 */
					BEGIN(xh);
					ECHO;
				}

{xnstart}		{
					yyless(1);	/* eat only 'n' this time */
					ECHO;
				}

{xqstart}		{
					// if (cur_state->std_strings)
						// BEGIN(xq);
					// else
						BEGIN(xe);
					ECHO;
				}
{xestart}		{
					BEGIN(xe);
					ECHO;
				}
{xusstart}		{
					BEGIN(xus);
					ECHO;
				}

<xb,xh,xq,xe,xus>{quote} {
					/*
					 * When we are scanning a quoted string and see an end
					 * quote, we must look ahead for a possible continuation.
					 * If we don't see one, we know the end quote was in fact
					 * the end of the string.  To reduce the lexer table size,
					 * we use a single "xqs" state to do the lookahead for all
					 * types of strings.
					 */
					cur_state->state_before_str_stop = YYSTATE;
					BEGIN(xqs);
					ECHO;
				}
<xqs>{quotecontinue} {
					/*
					 * Found a quote continuation, so return to the in-quote
					 * state and continue scanning the literal.  Nothing is
					 * added to the literal's contents.
					 */
					BEGIN(cur_state->state_before_str_stop);
					ECHO;
				}
<xqs>{quotecontinuefail} |
<xqs>{other}	{
					/*
					 * Failed to see a quote continuation.  Throw back
					 * everything after the end quote, and handle the string
					 * according to the state we were in previously.
					 */
					yyless(0);
					BEGIN(INITIAL);
					/* There's nothing to echo ... */
				}

<xq,xe,xus>{xqdouble} {
					ECHO;
				}
<xq,xus>{xqinside}  {
					ECHO;
				}
<xe>{xeinside}  {
					ECHO;
				}
<xe>{xeunicode} {
					ECHO;
				}
<xe>{xeunicodefail}	{
					ECHO;
				}
<xe>{xeescape}  {
					ECHO;
				}
<xe>{xeoctesc}  {
					ECHO;
				}
<xe>{xehexesc}  {
					ECHO;
				}
<xe>.			{
					/* This is only needed for \ just before EOF */
					ECHO;
				}

{dolqdelim}		{
					cur_state->dolqstart = strdup(yytext);
					BEGIN(xdolq);
					ECHO;
				}
{dolqfailed}	{
					/* throw back all but the initial "$" */
					yyless(1);
					ECHO;
				}
<xdolq>{dolqdelim} {
					if (strcmp(yytext, cur_state->dolqstart) == 0)
					{
						free(cur_state->dolqstart);
						cur_state->dolqstart = NULL;
						BEGIN(INITIAL);
					}
					else
					{
						/*
						 * When we fail to match $...$ to dolqstart, transfer
						 * the $... part to the output, but put back the final
						 * $ for rescanning.  Consider $delim$...$junk$delim$
						 */
						yyless(yyleng - 1);
					}
					ECHO;
				}
<xdolq>{dolqinside} {
					ECHO;
				}
<xdolq>{dolqfailed} {
					ECHO;
				}
<xdolq>.		{
					/* This is only needed for $ inside the quoted text */
					ECHO;
				}

{xdstart}		{
					BEGIN(xd);
					ECHO;
				}
{xuistart}		{
					BEGIN(xui);
					ECHO;
				}
<xd>{xdstop}	{
					BEGIN(INITIAL);
					ECHO;
				}
<xui>{dquote}	{
					BEGIN(INITIAL);
					ECHO;
				}
<xd,xui>{xddouble}	{
					ECHO;
				}
<xd,xui>{xdinside}	{
					ECHO;
				}

{xufailed}	{
					/* throw back all but the initial u/U */
					yyless(1);
					ECHO;
				}

{typecast}		{
					ECHO;
				}

{dot_dot}		{
					ECHO;
				}

{colon_equals}	{
					ECHO;
				}

{equals_greater} {
					ECHO;
				}

{less_equals}	{
					ECHO;
				}

{greater_equals} {
					ECHO;
				}

{less_greater}	{
					ECHO;
				}

{not_equals}	{
					ECHO;
				}

	/*
	 * These rules are specific to psql --- they implement parenthesis
	 * counting and detection of command-ending semicolon.  These must
	 * appear before the {self} rule so that they take precedence over it.
	 */

"("				{
					cur_state->paren_depth++;
					ECHO;
				}

")"				{
					if (cur_state->paren_depth > 0)
						cur_state->paren_depth--;
					ECHO;
				}

";"				{
					ECHO;
					if (cur_state->paren_depth == 0 && cur_state->begin_depth == 0)
					{
						/* Terminate lexing temporarily */
						cur_state->identifier_count = 0;
            cur_state->end_pos = (int)yytext + yyleng - cur_state->start_pos;
						return LEXRES_SEMI;
					}
				}


	/*
	 * Back to backend-compatible rules.
	 */

{self}			{
					ECHO;
				}

{operator}		{
					/*
					 * Check for embedded slash-star or dash-dash; those
					 * are comment starts, so operator must stop there.
					 * Note that slash-star or dash-dash at the first
					 * character will match a prior rule, not this one.
					 */
					int			nchars = yyleng;
					char	   *slashstar = strstr(yytext, "/*");
					char	   *dashdash = strstr(yytext, "--");

					if (slashstar && dashdash)
					{
						/* if both appear, take the first one */
						if (slashstar > dashdash)
							slashstar = dashdash;
					}
					else if (!slashstar)
						slashstar = dashdash;
					if (slashstar)
						nchars = slashstar - yytext;

					/*
					 * For SQL compatibility, '+' and '-' cannot be the
					 * last char of a multi-char operator unless the operator
					 * contains chars that are not in SQL operators.
					 * The idea is to lex '=-' as two operators, but not
					 * to forbid operator names like '?-' that could not be
					 * sequences of SQL operators.
					 */
					if (nchars > 1 &&
						(yytext[nchars - 1] == '+' ||
						 yytext[nchars - 1] == '-'))
					{
						int			ic;

						for (ic = nchars - 2; ic >= 0; ic--)
						{
							char c = yytext[ic];
							if (c == '~' || c == '!' || c == '@' ||
								c == '#' || c == '^' || c == '&' ||
								c == '|' || c == '`' || c == '?' ||
								c == '%')
								break;
						}
						if (ic < 0)
						{
							/*
							 * didn't find a qualifying character, so remove
							 * all trailing [+-]
							 */
							do {
								nchars--;
							} while (nchars > 1 &&
								 (yytext[nchars - 1] == '+' ||
								  yytext[nchars - 1] == '-'));
						}
					}

					if (nchars < yyleng)
					{
						/* Strip the unwanted chars from the token */
						yyless(nchars);
					}
					ECHO;
				}

{param}			{
					ECHO;
				}
{param_junk}	{
					ECHO;
				}

{decinteger}	{
					ECHO;
				}
{hexinteger}	{
					ECHO;
				}
{octinteger}	{
					ECHO;
				}
{bininteger}	{
					ECHO;
				}
{hexfail}		{
					ECHO;
				}
{octfail}		{
					ECHO;
				}
{binfail}		{
					ECHO;
				}
{numeric}		{
					ECHO;
				}
{numericfail}	{
					/* throw back the .., and treat as integer */
					yyless(yyleng - 2);
					ECHO;
				}
{real}			{
					ECHO;
				}
{realfail}		{
					ECHO;
				}
{integer_junk}	{
					ECHO;
				}
{numeric_junk}	{
					ECHO;
				}
{real_junk}		{
					ECHO;
				}


{identifier}	{
					/*
					 * We need to track if we are inside a BEGIN .. END block
					 * in a function definition, so that semicolons contained
					 * therein don't terminate the whole statement.  Short of
					 * writing a full parser here, the following heuristic
					 * should work.  First, we track whether the beginning of
					 * the statement matches CREATE [OR REPLACE]
					 * {FUNCTION|PROCEDURE}
					 */

					if (cur_state->identifier_count == 0)
						memset(cur_state->identifiers, 0, sizeof(cur_state->identifiers));

					if (strcasecmp(yytext, "create") == 0 ||
						strcasecmp(yytext, "function") == 0 ||
						strcasecmp(yytext, "procedure") == 0 ||
						strcasecmp(yytext, "or") == 0 ||
						strcasecmp(yytext, "replace") == 0)
					{
						if (cur_state->identifier_count < sizeof(cur_state->identifiers))
							cur_state->identifiers[cur_state->identifier_count] = tolower((unsigned char) yytext[0]);
					}

					cur_state->identifier_count++;

					if (cur_state->identifiers[0] == 'c' &&
						(cur_state->identifiers[1] == 'f' || cur_state->identifiers[1] == 'p' ||
						 (cur_state->identifiers[1] == 'o' && cur_state->identifiers[2] == 'r' &&
						  (cur_state->identifiers[3] == 'f' || cur_state->identifiers[3] == 'p'))) &&
						cur_state->paren_depth == 0)
					{
						if (strcasecmp(yytext, "begin") == 0)
							cur_state->begin_depth++;
						else if (strcasecmp(yytext, "case") == 0)
						{
							/*
							 * CASE also ends with END.  We only need to track
							 * this if we are already inside a BEGIN.
							 */
							if (cur_state->begin_depth >= 1)
								cur_state->begin_depth++;
						}
						else if (strcasecmp(yytext, "end") == 0)
						{
							if (cur_state->begin_depth > 0)
								cur_state->begin_depth--;
						}
					}

					ECHO;
				}

{other}			{
					ECHO;
				}

<<EOF>>			{
          cur_state->end_pos = (int)yytext - cur_state->start_pos;
					return LEXRES_EOL;		/* end of input reached */
				}

%%

/* LCOV_EXCL_STOP */


// This is the function that will be called from WebAssembly
int psql_stmt_len(const char *sql, yy_size_t len) {
	PsqlScanStateData state;
  state.start_pos = 0;
  state.end_pos = -1;
	state.paren_depth = 0;
	state.xcdepth = 0;
	state.dolqstart = NULL;
	state.identifier_count = 0;
	state.begin_depth = 0;

	yylex_init(state.scanner);
	yyset_extra(&state, state.scanner);
  yy_scan_bytes(sql, len, state.scanner);
  yylex(NULL, state.scanner);

	if (state.dolqstart)
		free(state.dolqstart);
	yylex_destroy(state.scanner);

  // consume trailing whitespaces
  while (state.end_pos < len && strchr(" \t\n\r\f\v", sql[state.end_pos])) {
    state.end_pos++;
  }

	return state.end_pos;  // Return position after semicolon
}
