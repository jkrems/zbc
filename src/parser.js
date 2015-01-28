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

function literal(state) {
  const value = state.read();
  let type;
  switch (value.type) {
    case Tokens.STRING: type = 'String'; break;
    case Tokens.INT: type = 'Int'; break;
    case Tokens.FLOAT: type = 'Float'; break;
    default:
      throw new Error(
        `Invalid literal: ${value.type.toString()}`
      );
  }
  // TODO: parse the value properly
  return new ZB.Literal(value.text, type);
}

function valueExpr(state) {
  const peek = state.next.type;
  if (peek === Tokens.IDENTIFIER) {
    return identifier(state);
  } else if (peek === Tokens.STRING ||
             peek === Tokens.INT ||
             peek === Tokens.FLOAT) {
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

function block(state) {
  state.read(Tokens.LBRACE);

  const content = [];
  while (state.next.type !== Tokens.RBRACE) {
    content.push(expression(state));
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
  const id = identifier(state);
  const params = parameterList(state);
  const body = block(state);
  return new ZB.FunctionDeclaration(id, params, body);
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
