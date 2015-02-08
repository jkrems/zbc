'use strict';

const Tokens = require('./tokens');
const ZB = require('./nodes');
// const TypeSystem = require('./type-system');
const registerBuiltIns = require('./built-ins');

class LocationTracker {
  constructor(state) {
    this.state = state;
    this.start = state.next.position;
  }

  get() {
    return this.start;
  }
}

class ParseState {
  constructor(tokens) {
    this.tokens = tokens;
    this.idx = 0;
    this.next = tokens[0];
    this.noTry = false;
  }

  track() {
    return new LocationTracker(this);
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

  tryRead() {
    const allowed = [].slice.apply(arguments);
    const idx = allowed.indexOf(this.next.type);
    if (idx !== -1) {
      return this.read(allowed[idx]);
    } else {
      return null;
    }
  }

  endTry() {
    this.noTry = true;
  }

  try(attempt, orElse) {
    const tmpState = new ParseState(this.tokens);
    tmpState.idx = this.idx;
    tmpState.next = this.next;
    let result;
    try {
      result = attempt(tmpState);
      this.idx = tmpState.idx;
      this.next = tmpState.next;
    } catch (err) {
      if (tmpState.noTry) { throw err; }
      result = orElse(this);
    }
    return result;
  }
}

function tracked(fn) {
  return function(state) {
    const loc = state.track();
    const result = fn(state);
    if (result === null) { return result; }
    return result.setLocation(loc.get());
  };
};

const valueDeclaration = tracked(function valueDeclaration(state) {
  const name = state.read(Tokens.IDENTIFIER).text;
  const hint = state.tryRead(Tokens.COLON) ? typeHint(state) : null;
  return new ZB.ValueDeclaration(name, hint, null);
});

const identifier = tracked(function identifier(state) {
  const name = state.read(Tokens.IDENTIFIER).text;
  return new ZB.Identifier(name, null);
});

const stringLiteral = tracked(function stringLiteral(state) {
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
      typeof parsedElements[0].value !== 'string') {
    parsedElements.unshift(new ZB.Literal('', 'String'));
  }

  // TODO: collapse string literals (?)

  if (parsedElements.length === 1) {
    return new ZB.Literal(elements[0], 'String');
  }

  return new ZB.Interpolation(parsedElements);
});

const literal = tracked(function literal(state) {
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
});

const valueExpr = tracked(function valueExpr(state) {
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
});

const fcallExpr = tracked(function fcallExpr(state) {
  let lOperand = valueExpr(state);
  while (true) {
    let op, rOperand;
    switch (state.next.type) {
      case Tokens.MEMBER_ACCESS:
        op = state.read(Tokens.MEMBER_ACCESS);
        rOperand = state.read(Tokens.IDENTIFIER).text;
        lOperand = new ZB.MemberAccess(lOperand, op.text, rOperand);
        break;

      case Tokens.LPAREN:
        state.read(Tokens.LPAREN);
        var arg = expression(state);
        state.read(Tokens.RPAREN);
        lOperand = new ZB.FCallExpression(lOperand, [ arg ]);
        break;

      default:
        return lOperand;
    }
  }
});

const unaryExpr = tracked(function unaryExpr(state) {
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
});

const expression = tracked(function expression(state) {
  // See: http://en.cppreference.com/w/cpp/language/operator_precedence
  // unaryExpr [ ( binaryOp | unaryOp ) unaryExpr ]*
  let lOperand = unaryExpr(state);
  while (state.next.type === Tokens.BINARY || state.next.type === Tokens.UNARY_OR_BINARY) {
    const op = state.read();
    const rOperand = unaryExpr(state);
    lOperand = new ZB.BinaryExpression(lOperand, op.text, rOperand);
  }
  return lOperand;
});

function block(state) {
  state.read(Tokens.LBRACE);

  const content = [];
  while (state.next.type !== Tokens.RBRACE) {
    const loc = state.track();
    if (state.tryRead(Tokens.RETURN)) {
      const returnValue = expression(state);
      content.push(
        new ZB.Return(returnValue).setLocation(loc.get()));
    } else {
      state.try(
        function(s) {
          const target = valueDeclaration(s);
          if (target.typeHint !== null) {
            s.endTry(); // Yep, it's an assignment
          }
          s.read(Tokens.ASSIGN);
          s.endTry(); // Yep, it's an assignment
          const value = expression(s);
          s.read(Tokens.EOL);
          content.push(new ZB.ValueDeclaration(
            target.name, target.typeHint, value
          ).setLocation(loc.get()));
        },
        function(s) {
          const expr = expression(s);
          s.read(Tokens.EOL);
          content.push(expr);
        }
      );
    }
  }

  state.read(Tokens.RBRACE);
  return content;
}

const typeHint = tracked(function typeHint(state) {
  const loc = state.track();

  const args = [];
  const name = state.read(Tokens.IDENTIFIER).text;
  if (state.tryRead(Tokens.LESS)) {
    do {
      args.push(typeHint(state));
    } while (state.tryRead(Tokens.SEP));
    state.read(Tokens.MORE);
  } else if (state.tryRead(Tokens.LSQUARE)) {
    state.read(Tokens.RSQUARE);
    return new ZB.TypeHint('Array', [
      new ZB.TypeHint(name, []).setLocation(loc.get())
    ]);
  }
  if (args.length) {
    return new ZB.TypeHint(name, args);
  } else {
    return new ZB.TypeHint(name, []);
  }
});

const parameter = tracked(function parameter(state) {
  return valueDeclaration(state);
});

function parameterList(state) {
  state.read(Tokens.LPAREN);
  if (state.next.type === Tokens.RPAREN) {
    state.read(Tokens.RPAREN);
    return [];
  }
  const params = [];
  do {
    params.push(parameter(state));
  } while (state.tryRead(Tokens.SEP));
  state.read(Tokens.RPAREN);

  return params;
}

const externDeclaration = tracked(function externDeclaration(state) {
  // Extern considered already read
  state.read(Tokens.EXTERN);
  const id = valueDeclaration(state);

  state.read(Tokens.EOL);
  return new ZB.ExternDeclaration(id);
});

const propertyDeclaration = tracked(function propertyDeclaration(state) {
  let name = state.read(Tokens.IDENTIFIER).text;

  let isFunction = false, params = null;

  if (name === 'operator') {
    const op = state.tryRead(Tokens.BINARY, Tokens.UNARY_OR_BINARY);
    if (op) {
      name += op.text;
      isFunction = true;
    }
  } else if (name === 'unary') {
    const op = state.tryRead(Tokens.UNARY, Tokens.UNARY_OR_BINARY);
    if (op) {
      name += op.text;
      isFunction = true;
    }
  }

  if (state.next.type === Tokens.LPAREN) {
    isFunction = true;
    params = parameterList(state);
  } else if (isFunction) {
    throw new Error(`Expected parameter list for property ${name}`);
  }

  const hint = state.tryRead(Tokens.COLON) ? typeHint(state) : null;
  state.read(Tokens.EOL);

  return new ZB.PropertyDeclaration(name, params, hint);
});

const interfaceDeclaration = tracked(function interfaceDeclaration(state) {
  state.read(Tokens.INTERFACE);
  const name = state.read(Tokens.IDENTIFIER).text;
  let typeParams = [];
  if (state.tryRead(Tokens.LESS)) {
    // read type params
    do {
      const typeParam = state.read(Tokens.IDENTIFIER).text;
      typeParams.push(typeParam);
    } while (state.tryRead(Tokens.SEP));
    state.read(Tokens.MORE);
  }

  const body = [];
  state.read(Tokens.LBRACE);

  while (state.next && state.next.type !== Tokens.RBRACE) {
    const prop = propertyDeclaration(state);
    body.push(prop);
  }
  state.read(Tokens.RBRACE);
  return new ZB.InterfaceDeclaration(name, typeParams, body);
});

const declaration = tracked(function declaration(state) {
  switch (state.next.type) {
    case Tokens.EXTERN:
      return externDeclaration(state);

    case Tokens.INTERFACE:
      return interfaceDeclaration(state);
  }
  const loc = state.track();

  let visibility = 'private';

  let modifier = state.tryRead(Tokens.VISIBILITY);

  if (modifier !== null) {
    visibility = modifier.text;
  }

  const name = state.read(Tokens.IDENTIFIER).text;
  const params = parameterList(state);

  const returnType = state.tryRead(Tokens.COLON) ? typeHint(state) : null;

  const paramTypes = params.map(function(param) {
    return param.type;
  });

  const statements = block(state);
  const last = statements[statements.length - 1];
  const nonVoid = returnType === null || returnType.name !== 'Void';
  const lastType = (last && nonVoid) ? last.type : null;

  const body = (nonVoid && last && last.getNodeType() !== 'Return') ?
    // Auto-return last statement for non-void functions
    statements.slice(0, statements.length - 1).concat(
      new ZB.Return(last)
        .setLocation(last.getLocation())
    ) : statements;

  return new ZB.FunctionDeclaration(name, params, body, visibility, returnType)
    .setLocation(loc.get());
});

function declarations(state) {
  const decls = [];
  while (state.next) {
    decls.push(declaration(state));
  }
  return decls;
}

const rootRule = tracked(function rootRule(state) {
  const decls = declarations(state);
  return new ZB.Module(decls);
});

function parse(tokens) {
  const state = new ParseState(tokens);
  const loc = state.track();
  return rootRule(state);
}

module.exports = parse;
module.exports.default = parse;
