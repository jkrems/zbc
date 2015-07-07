/**
 * # Zoigberg Grammar
 */
{
  var ZB = require('../lib/nodes');

  function extractList(list, index) {
    var result = new Array(list.length), i;

    for (i = 0; i < list.length; i++) {
      result[i] = list[i][index];
    }

    return result;
  }

  function buildList(first, rest, index) {
    return [first].concat(extractList(rest, index));
  }
}

/**
 * ## Modules
 *
 * Zoidberg code is organized into "Modules". Every file contains exactly one
 * Module consisting of `imports` and a `body`, both of which are optional.
 *
 * The `body` is a collection of declarations. There is no top-level code.
 */

Start
  = __ mod:Module __ { return mod; }

Module
  = imports:Imports? __ body:(Declarations)? {
    return new ZB.Module(imports || [], body || []);
  }

/**
 * ### Imports
 */

Imports
  = "an#import"

/**
 * ### Declarations
 *
 * There are two general classes of declarations:
 *
 * 1. Function Declaration
 * 2. Value Declaration
 *
 * They can appear in any order in the module.
 */

Declarations
  = first:Declaration rest:(__ Declaration)* {
    return buildList(first, rest, 1);
  }

Declaration
  = FunctionDeclaration

/**
 * #### FunctionDeclaration
 */

FunctionDeclaration
  = name:Identifier "(" params:ParameterList? ")" _ body:Block {
    return new ZB.FunctionDeclaration(name, params || [], body);
  }

ParameterList
  = first:Parameter rest:(_ "," _ Parameter)* {
    return buildList(first, rest, 3);
  }

Parameter
  = name:Identifier { return new ZB.Parameter(name); }

Block
  = "{" __ body:Statements? __ "}" { return body || []; }

Statements
  = first:Statement rest:( __ Statement)* {
    return buildList(first, rest, 1);
  }

Statement
  = expr:Expression ";" { return expr; }

/**
 * ## Expressions
 *
 * Precendence:
 * 1. ConcatExpression (++)
 * 2. SumExpression (+, -)
 * 3. MulExpression (*, /, %)
 * 4. UnaryExpression (unary-&, unary-*, etc.)
 * 5. AccessExpression (property access, method calls, function calls)
 * 6. AtomExpression (literals, parenthesis, identifiers)
 */

Expression
  = ConcatExpression

ConcatExpression
  = SumExpression

SumExpression
  = MulExpression

MulExpression
  = UnaryExpression

UnaryOperator "unary operator"
  = [&]

UnaryExpression
  = op:(UnaryOperator _)? operand:AccessExpression {
    if (op) {
      return new ZB.UnaryExpression(op[0], operand);
    } else {
      return operand;
    }
  }

AccessExpression
  = AtomExpression

AtomExpression
  = Literal

Literal
  = StringLiteral

StringLiteralPart
  = text:([^"])+ { return { text: text.join('') }; }

StringLiteral
  = ["] parts:( StringLiteralPart )* ["] {
    const textTokens = [], expressions = [];
    (parts || []).forEach(function(part) {
      if (part.text) { textTokens.push(part.text); }
      else { throw new Error('Unknown part type'); }
    });
    return new ZB.StringLiteral(textTokens, expressions);
  }

/**
 * ## Common Elements: Identifiers & Keywords
 */

Identifier
  = !Keyword name:IdentifierName { return name; }

Keyword
  = UsingToken
UsingToken = "using" !IdentifierPart

IdentifierName "identifier"
  = first:IdentifierStart rest:IdentifierPart* {
      return first + rest.join("");
    }

IdentifierStart
  = [a-zA-Z]
  / "_"

IdentifierPart
  = IdentifierStart
  / [0-9]

/**
 * ## Common Elements: Whitespace & Comments
 *
 * There are two general classes of "whitespace" between other tokens:
 *
 * 1. `_`: "Conservative" whitespace that does not allow line breaks
 * 2. `__`: "Lenient" whitespace that does allow line breaks and comments
 */

_
  = ( Whitespace )*

__
  = ( Whitespace / LineTerminatorSequence )*

Whitespace "whitespace"
  = " "
  / "\t" { error("Tabs aren't valid whitespace in Zoidberg"); }

LineTerminatorSequence "end of line"
  = "\n"
