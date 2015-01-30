'use strict';

const Tokens = require('./tokens');
const ZB = require('./nodes');
const TypeSystem = require('./type-system');

class ParseState {
  constructor(tokens) {
    this.tokens = tokens;
    this.idx = 0;
    this.next = tokens[0];
  }

  read(type) {
    const token = this.next;
    if (type !== undefined && token.type !== type) {
      throw new Error(
        `Unexpected ${token.type.toString()}, expected ${type.toString()} at ${token.position}`);
    }
    this.next = this.tokens[++this.idx];
    return token;
  }

  tryRead(type) {
    if (this.next.type === type) {
      return this.read(type);
    } else {
      return null;
    }
  }
}

function identifier(state, types) {
  const id = state.read(Tokens.IDENTIFIER);
  return new ZB.Identifier(id.text);
}

function stringLiteral(state, types) {
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

function literal(state, types) {
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

function valueExpr(state, types) {
  const peek = state.next.type;
  if (peek === Tokens.IDENTIFIER) {
    return identifier(state, types);
  } else if (peek === Tokens.STRING) {
    return stringLiteral(state, types);
  } else if (peek === Tokens.INT ||
             peek === Tokens.FLOAT ||
             peek === Tokens.CHAR) {
    return literal(state, types);
  } else if (peek === Tokens.LPAREN) {
    state.read(Tokens.LPAREN);
    const inner = expression(state, types);
    state.read(Tokens.RPAREN);
    return inner;
  }
  throw new Error(`Unexpected ${peek.toString()}`);
}

function fcallExpr(state, types) {
  let lOperand = valueExpr(state, types);
  while (true) {
    let op, rOperand;
    switch (state.next.type) {
      case Tokens.MEMBER_ACCESS:
        op = state.read(Tokens.MEMBER_ACCESS);
        rOperand = identifier(state, types);
        lOperand = new ZB.BinaryExpression(lOperand, op.text, rOperand);
        break;

      case Tokens.LPAREN:
        state.read(Tokens.LPAREN);
        var arg = expression(state, types);
        state.read(Tokens.RPAREN);
        lOperand = new ZB.FCallExpression(lOperand, [ arg ]);

      default:
        return lOperand;
    }
  }
}

function unaryExpr(state, types) {
  const peek = state.next.type;
  let op;
  if (peek === Tokens.UNARY || peek === Tokens.UNARY_OR_BINARY) {
    op = state.read();
  }
  const value = fcallExpr(state, types);

  if (op !== undefined) {
    return new ZB.UnaryExpression(op, value);
  } else {
    return value;
  }
}

function expression(state, types) {
  // See: http://en.cppreference.com/w/cpp/language/operator_precedence
  // unaryExpr [ ( binaryOp | unaryOp ) unaryExpr ]*
  let lOperand = unaryExpr(state, types);
  while (state.next.type === Tokens.BINARY || state.next.type === Tokens.UNARY_OR_BINARY) {
    const op = state.read();
    const rOperand = unaryExpr(state, types);
    lOperand = new ZB.BinaryExpression(lOperand, op.text, rOperand);
  }
  return lOperand;
}

function isLExpr(node) {
  return node.getNodeType() === 'Identifier';
}

function block(state, types) {
  state.read(Tokens.LBRACE);

  const content = [];
  while (state.next.type !== Tokens.RBRACE) {
    const left = expression(state, types);
    let hint = null;

    if (state.tryRead(Tokens.COLON)) {
      hint = typeHint(state, types);
    }

    if (state.next.type === Tokens.ASSIGN) {
      state.read(Tokens.ASSIGN);
      if (!isLExpr(left)) {
        throw new Error('Invalid l-expr: ' + left);
      }
      const right = expression(state, types);
      left.setType(hint);
      content.push(new ZB.Assignment(left, right));
    } else if (hint === null) {
      content.push(left);
    } else {
      throw new Error('Unexpected type hint');
    }
    state.read(Tokens.EOL);
  }

  state.read(Tokens.RBRACE);
  return content;
}

function typeHint(state, types) {
  const args = [];
  const name = state.read(Tokens.IDENTIFIER).text;
  if (state.tryRead(Tokens.LESS)) {
    do {
      args.push(typeHint(state, types));
    } while (state.tryRead(Tokens.SEP));
    state.read(Tokens.MORE);
  }
  return types.createReference(name, args);
}

function parameter(state, types) {
  const id = identifier(state, types);
  if (state.tryRead(Tokens.COLON)) {
    id.setType(typeHint(state, types));
  }
  return id;
}

function parameterList(state, types) {
  state.read(Tokens.LPAREN);
  if (state.next.type === Tokens.RPAREN) {
    state.read(Tokens.RPAREN);
    return [];
  }
  const params = [];
  do {
    params.push(parameter(state, types));
  } while (state.next.type === Tokens.SEP);
  state.read(Tokens.RPAREN);

  return params;
}

function declaration(state, types) {
  let visibility = 'private';

  if (state.next.type === Tokens.VISIBILITY) {
    visibility = state.read(Tokens.VISIBILITY).text;
  }

  const id = identifier(state, types);
  const params = parameterList(state, types);

  let returnType = null;
  if (state.tryRead(Tokens.COLON)) {
    returnType = typeHint(state, types);
  }

  const body = block(state, types);
  return new ZB.FunctionDeclaration(id, params, body, visibility);
}

function declarations(state, types) {
  const decls = [];
  decls.push(declaration(state, types));
  return decls;
}

function parse(tokens) {
  const state = new ParseState(tokens);
  const types = new TypeSystem();
  const decls = declarations(state, types);
  return new ZB.Module(decls);
}

module.exports = parse;
module.exports.default = parse;
