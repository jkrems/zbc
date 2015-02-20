/**
 * Zoigberg Grammar
 */
{
  var ZB = require('../nodes');

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

// Entry point
Start
  = __ mod:Module __ { return mod; }

// Keywords & general character classes

SourceCharacter
  = .

WhiteSpace "whitespace"
  = " "
  / "\t" { error("Tabs aren't valid whitespace in Zoidberg"); }

LineTerminator
  = [\n]

LineTerminatorSequence "end of line"
  = "\n"

Comment "comment"
  = MultiLineComment
  / SingleLineComment

MultiLineComment
  = "/*" (!"*/" SourceCharacter)* "*/"

MultiLineCommentNoLineTerminator
  = "/*" (!("*/" / LineTerminator) SourceCharacter)* "*/"

SingleLineComment
  = "#" (!LineTerminator SourceCharacter)*

__
  = (WhiteSpace / LineTerminatorSequence / Comment)*

_
  = (WhiteSpace / MultiLineCommentNoLineTerminator)*

Declaration
  = Comment

Declarations
  = first:Declaration rest:(__ Declaration)* {
    return buildList(first, rest, 1);
  }

Module
  = body:(Declarations)? {
    return new ZB.Module([], []);
  }
