'use strict';

const Tokens = require('./tokens');
const ZB = require('./nodes');

function ParseState(tokens) {
  this.tokens = tokens;
  this.idx = 0;
  this.next = tokens[0];
}

ParseState.prototype.read = function(type) {
  const token = this.next;
  if (type !== undefined && token.type !== type) {
    throw new Error(
      `Unexpected ${token.type.toString()}, expected ${type.toString()} at ${token.position}`);
  }
  this.next = this.tokens[++this.idx];
  return token;
};

function identifier(state) {
  const id = state.read(Tokens.IDENTIFIER);
  return new ZB.Identifier(id.text);
}

function stringLiteral(state) {
  const t = state.read();
  let value = t.text;
  let elements = [];
  let buffer = '';

  let start = 0, idx;
  while ((idx = value.indexOf('\\', start)) !== -1) {
    if (idx > start) {
      buffer += value.slice(start, idx);
    }

    let signal = value[idx + 1], interpolateEnd;
    switch (signal) {
      case 'n': buffer += '\n'; ++idx; break;
      case 't': buffer += '\t'; ++idx; break;
      case '"': buffer += '"'; ++idx; break;
      case '\\': buffer += '\\'; ++idx; break;
      case '{':
        interpolateEnd = value.indexOf('}', idx + 1);
        if (interpolateEnd === -1) {
          throw new Error('Could not find end of interpolation');
        }
        start = interpolateEnd + 1;
        if (buffer.length) {
          elements.push(buffer);
          buffer = '';
        }
        elements.push({ expr: value.slice(idx + 2, interpolateEnd) });
        continue;

      default:
        throw new Error('Invalid escape sequence: \\' + signal);
    }
    start = idx + 1;
  }

  if (start < value.length) {
    buffer += value.slice(start);
  }

  if (buffer.length) {
    elements.push(buffer);
  }

  const parsedElements = elements.map(function(e) {
    if (typeof e === 'string') {
      return new ZB.Literal(e, 'String');
    }
    // TODO: actually lex/parse the expression
    return new ZB.Identifier(e.expr);
  });

  if (parsedElements[0].getNodeType() !== 'Literal' ||
      parsedElements[0].type !== 'String') {
    parsedElements.unshift(new ZB.Literal('', 'String'));
  }

  // TODO: collapse string literals (?)

  if (parsedElements.length === 1) {
    return new ZB.Literal(elements[0], 'String');
  }

  return new ZB.Interpolation(parsedElements);
}

function literal(state) {
  const t = state.read();
  let type, value = t.text;
  switch (t.type) {
    case Tokens.INT: type = 'Int'; value = parseInt(value, 10); break;
    case Tokens.FLOAT: type = 'Float'; value = parseFloat(value); break;
    case Tokens.CHAR: type = 'Char'; break;
    default:
      throw new Error(`Invalid literal: ${t.type.toString()}`);
  }
  return new ZB.Literal(value, type);
}

function valueExpr(state) {
  const peek = state.next.type;
  if (peek === Tokens.IDENTIFIER) {
    return identifier(state);
  } else if (peek === Tokens.STRING) {
    return stringLiteral(state);
  } else if (peek === Tokens.INT ||
             peek === Tokens.FLOAT ||
             peek === Tokens.CHAR) {
    return literal(state);
  } else if (peek === Tokens.LPAREN) {
    state.read(Tokens.LPAREN);
    const inner = expression(state);
    state.read(Tokens.RPAREN);
    return inner;
  }
  throw new Error(`Unexpected ${peek.toString()}`);
}

function fcallExpr(state) {
  let lOperand = valueExpr(state);
  while (true) {
    let op, rOperand;
    switch (state.next.type) {
      case Tokens.MEMBER_ACCESS:
        op = state.read(Tokens.MEMBER_ACCESS);
        rOperand = identifier(state);
        lOperand = new ZB.BinaryExpression(lOperand, op.text, rOperand);
        break;

      case Tokens.LPAREN:
        state.read(Tokens.LPAREN);
        var arg = expression(state);
        state.read(Tokens.RPAREN);
        lOperand = new ZB.FCallExpression(lOperand, [ arg ]);

      default:
        return lOperand;
    }
  }
}

function unaryExpr(state) {
  const peek = state.next.type;
  let op;
  if (peek === Tokens.UNARY || peek === Tokens.UNARY_OR_BINARY) {
    op = state.read();
  }
  const value = fcallExpr(state);

  if (op !== undefined) {
    return new ZB.UnaryExpression(op, value);
  } else {
    return value;
  }
}

function expression(state) {
  // See: http://en.cppreference.com/w/cpp/language/operator_precedence
  // unaryExpr [ ( binaryOp | unaryOp ) unaryExpr ]*
  let lOperand = unaryExpr(state);
  while (state.next.type === Tokens.BINARY || state.next.type === Tokens.UNARY_OR_BINARY) {
    const op = state.read();
    const rOperand = unaryExpr(state);
    lOperand = new ZB.BinaryExpression(lOperand, op.text, rOperand);
  }
  return lOperand;
}

function isLExpr(node) {
  return node.getNodeType() === 'Identifier';
}

function block(state) {
  state.read(Tokens.LBRACE);

  const content = [];
  while (state.next.type !== Tokens.RBRACE) {
    const left = expression(state);
    if (state.next.type === Tokens.ASSIGN) {
      state.read(Tokens.ASSIGN);
      if (!isLExpr(left)) {
        throw new Error('Invalid l-expr: ' + left);
      }
      const right = expression(state);
      content.push(new ZB.Assignment(left, right));
    } else {
      content.push(left);
    }
    state.read(Tokens.EOL);
  }

  state.read(Tokens.RBRACE);
  return content;
}

function parameter(state) {
  return identifier(state);
}

function parameterList(state) {
  state.read(Tokens.LPAREN);
  if (state.next.type === Tokens.RPAREN) {
    state.read(Tokens.RPAREN);
    return [];
  }
  const params = [];
  do {
    params.push(parameter(state));
  } while (state.next.type === Tokens.SEP);
  state.read(Tokens.RPAREN);
  return params;
}

function declaration(state) {
  let visibility = 'private';

  if (state.next.type === Tokens.VISIBILITY) {
    visibility = state.read(Tokens.VISIBILITY).text;
  }

  const id = identifier(state);
  const params = parameterList(state);
  const body = block(state);
  return new ZB.FunctionDeclaration(id, params, body, visibility);
}

function declarations(state) {
  const decls = [];
  decls.push(declaration(state));
  return decls;
}

function parse(tokens) {
  const state = new ParseState(tokens);
  const decls = declarations(state);
  return new ZB.Module(decls);
}

module.exports = parse;
