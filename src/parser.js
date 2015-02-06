'use strict';

const Tokens = require('./tokens');
const ZB = require('./nodes');
const TypeSystem = require('./type-system');
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
    const types = [].slice.apply(arguments);
    const idx = types.indexOf(this.next.type);
    if (idx !== -1) {
      return this.read(types[idx]);
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
  return function(state, types) {
    const loc = state.track();
    const result = fn(state, types);
    if (typeof result.setLocation !== 'function') {
      return result;
    }
    return result.setLocation(loc.get());
  };
};

const rawIdentifier = tracked(function rawIdentifier(state, types) {
  const name = state.read(Tokens.IDENTIFIER).text;
  return new ZB.Identifier(name);
});

const identifier = tracked(function identifier(state, types) {
  const name = state.read(Tokens.IDENTIFIER).text;
  return new ZB.Identifier(name).setType(types.resolveId(name));
});

const stringLiteral = tracked(function stringLiteral(state, types) {
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

  const strType = types.get('String').createInstance();

  const parsedElements = elements.map(function(e) {
    if (typeof e === 'string') {
      return new ZB.Literal(e).setType(strType);
    }
    // TODO: actually lex/parse the expression
    return new ZB.Identifier(e.expr).setType(types.resolveId(e.expr));
  });

  if (parsedElements[0].getNodeType() !== 'Literal' ||
      !parsedElements[0].type.equals(strType)) {
    parsedElements.unshift(new ZB.Literal('').setType(strType));
  }

  // TODO: collapse string literals (?)

  if (parsedElements.length === 1) {
    return new ZB.Literal(elements[0]).setType(strType);
  }

  return new ZB.Interpolation(parsedElements).setType(strType);
});

const literal = tracked(function literal(state, types) {
  const t = state.read();
  let type, value = t.text;
  switch (t.type) {
    case Tokens.INT: type = 'Int'; value = parseInt(value, 10); break;
    case Tokens.FLOAT: type = 'Float'; value = parseFloat(value); break;
    case Tokens.CHAR: type = 'Char'; break;
    default:
      throw new Error(`Invalid literal: ${t.type.toString()}`);
  }
  return new ZB.Literal(value)
    .setType(types.get(type).createInstance());
});

const valueExpr = tracked(function valueExpr(state, types) {
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
});

const fcallExpr = tracked(function fcallExpr(state, types) {
  let lOperand = valueExpr(state, types);
  while (true) {
    let op, rOperand;
    switch (state.next.type) {
      case Tokens.MEMBER_ACCESS:
        op = state.read(Tokens.MEMBER_ACCESS);
        rOperand = rawIdentifier(state, types);
        lOperand = new ZB.MemberAccess(lOperand, op.text, rOperand);
        break;

      case Tokens.LPAREN:
        state.read(Tokens.LPAREN);
        var arg = expression(state, types);
        state.read(Tokens.RPAREN);
        lOperand = new ZB.FCallExpression(lOperand, [ arg ]);
        break;

      default:
        return lOperand;
    }
  }
});

const unaryExpr = tracked(function unaryExpr(state, types) {
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
});

const expression = tracked(function expression(state, types) {
  // See: http://en.cppreference.com/w/cpp/language/operator_precedence
  // unaryExpr [ ( binaryOp | unaryOp ) unaryExpr ]*
  let lOperand = unaryExpr(state, types);
  while (state.next.type === Tokens.BINARY || state.next.type === Tokens.UNARY_OR_BINARY) {
    const op = state.read();
    const rOperand = unaryExpr(state, types);
    lOperand = new ZB.BinaryExpression(lOperand, op.text, rOperand);
  }
  return lOperand;
});

function block(state, types) {
  state.read(Tokens.LBRACE);

  const content = [];
  while (state.next.type !== Tokens.RBRACE) {
    const loc = state.track();
    if (state.tryRead(Tokens.RETURN)) {
      const returnValue = expression(state, types);
      content.push(
        new ZB.Return(returnValue).setLocation(loc.get()));
    } else {
      state.try(
        function(s) {
          const target = rawIdentifier(s, types);
          let hint = null;
          if (s.tryRead(Tokens.COLON)) {
            s.endTry(); // Yep, it's an assignment
            hint = typeHint(s, types);
          }
          s.read(Tokens.ASSIGN);
          s.endTry(); // Yep, it's an assignment
          const value = expression(s, types);
          s.read(Tokens.EOL);
          if (hint) { target.setType(hint); }
          types.registerId(target.name, target.type);
          content.push(
            new ZB.Assignment(target, value).setLocation(loc.get()));
        },
        function(s) {
          const expr = expression(s, types);
          s.read(Tokens.EOL);
          content.push(expr);
        }
      );
    }
  }

  state.read(Tokens.RBRACE);
  return content;
}

const typeHint = tracked(function typeHint(state, types) {
  const args = [];
  const name = state.read(Tokens.IDENTIFIER).text;
  if (state.tryRead(Tokens.LESS)) {
    do {
      args.push(typeHint(state, types));
    } while (state.tryRead(Tokens.SEP));
    state.read(Tokens.MORE);
  } else if (state.tryRead(Tokens.LSQUARE)) {
    state.read(Tokens.RSQUARE);
    return types.get('Array').createInstance(
      [ types.get(name) ]);
  }
  if (args.length) {
    return types.get(name).createInstance(args);
  } else {
    return types.get(name);
  }
});

const parameter = tracked(function parameter(state, types) {
  const id = rawIdentifier(state, types);
  if (state.tryRead(Tokens.COLON)) {
    id.setType(typeHint(state, types));
  }
  types.registerId(id.name, id.type);
  return id;
});

function parameterList(state, types) {
  state.read(Tokens.LPAREN);
  if (state.next.type === Tokens.RPAREN) {
    state.read(Tokens.RPAREN);
    return [];
  }
  const params = [];
  do {
    params.push(parameter(state, types));
  } while (state.tryRead(Tokens.SEP));
  state.read(Tokens.RPAREN);

  return params;
}

const externDeclaration = tracked(function externDeclaration(state, types) {
  // Extern considered already read
  state.read(Tokens.EXTERN);
  const id = rawIdentifier(state, types);

  if (state.tryRead(Tokens.COLON)) {
    id.setType(typeHint(state, types));
  }
  types.registerId(id.name, id.type);

  state.read(Tokens.EOL);
  return new ZB.ExternDeclaration(id).setType(id.type);
});

const propertyDeclaration = tracked(function propertyDeclaration(state, types) {
  const id = rawIdentifier(state, types);

  let isFunction = false, params;

  if (id.name === 'operator') {
    const op = state.tryRead(Tokens.BINARY, Tokens.UNARY_OR_BINARY);
    if (op) {
      id.name += op.text;
      isFunction = true;
    }
  } else if (id.name === 'unary') {
    const op = state.tryRead(Tokens.UNARY, Tokens.UNARY_OR_BINARY);
    if (op) {
      id.name += op.text;
      isFunction = true;
    }
  }

  if (state.next.type === Tokens.LPAREN) {
    isFunction = true;
    params = parameterList(state, types);
  } else if (isFunction) {
    throw new Error(`Expected parameter list for property ${id.name}`);
  }

  let returnType;
  if (state.tryRead(Tokens.COLON)) {
    returnType = typeHint(state, types);
  } else {
    returnType = types.createUnknown();
  }
  state.read(Tokens.EOL);

  if (isFunction) {
    const paramTypes = [
      types.get('%self')
    ].concat(
      params.map(function(p) { return p.type; })
    );
    const ftype = types.get('Function')
      .createInstance(paramTypes.concat([ returnType ]));

    id.setType(ftype);
    return id;
  } else {
    id.setType(returnType);
    return id;
  }
});

const interfaceDeclaration = tracked(function interfaceDeclaration(state, outer) {
  state.read(Tokens.INTERFACE);
  const id = rawIdentifier(state, outer);
  const types = outer.createScope();
  let typeParams = [];
  if (state.tryRead(Tokens.LESS)) {
    // read type params
    do {
      const typeParamName = rawIdentifier(state, types).name;
      const typeParam = types.createUnknown();
      types.set(typeParamName, typeParam);
      typeParams.push(typeParam);
    } while (state.tryRead(Tokens.SEP));
    state.read(Tokens.MORE);
  }
  const typeSpec = outer.register(id.name, typeParams);
  types.set('%self', typeSpec);

  const body = [];
  state.read(Tokens.LBRACE);

  while (state.next && state.next.type !== Tokens.RBRACE) {
    const prop = propertyDeclaration(state, types);
    typeSpec.addProperty(prop.name, prop.type);
    body.push(prop);
  }
  state.read(Tokens.RBRACE);
  return new ZB.InterfaceDeclaration(id, body);
});

const declaration = tracked(function declaration(state, parentScope) {
  switch (state.next.type) {
    case Tokens.EXTERN:
      return externDeclaration(state, parentScope);

    case Tokens.INTERFACE:
      return interfaceDeclaration(state, parentScope);
  }
  const loc = state.track();

  let visibility = 'private';

  let modifier = state.tryRead(Tokens.VISIBILITY);

  if (modifier !== null) {
    visibility = modifier.text;
  }

  const types = parentScope.createScope();

  const id = rawIdentifier(state, types);
  parentScope.registerId(id.name, id.type);
  const params = parameterList(state, types);

  let returnType = null;
  if (state.tryRead(Tokens.COLON)) {
    returnType = typeHint(state, types);
  } else {
    returnType = types.createUnknown();
  }

  const paramTypes = params.map(function(param) {
    types.registerId(param);
    return param.type;
  });

  const nonVoid = !returnType.isBasically(types.get('Void'));
  const statements = block(state, types);
  const last = statements[statements.length - 1];
  const lastType = (last && nonVoid) ? last.type : types.get('Void');

  const body = (nonVoid && last && last.getNodeType() !== 'Return') ?
    // Auto-return last statement for non-void functions
    statements.slice(0, statements.length - 1).concat(
      new ZB.Return(last)
        .setType(last.getType())
        .setLocation(last.getLocation())
    ) : statements;

  returnType.merge(lastType);

  const ftype = types.get('Function')
    .createInstance(paramTypes.concat([ returnType ]));

  return new ZB.FunctionDeclaration(id, params, body, visibility)
    .setType(ftype, parentScope)
    .setLocation(loc.get());
});

function declarations(state, types) {
  const decls = [];
  while (state.next) {
    decls.push(declaration(state, types));
  }
  return decls;
}

const rootRule = tracked(function rootRule(state, types) {
  const decls = declarations(state, types);
  return new ZB.Module(decls, types);
});

function parse(tokens, globalTypes) {
  if (!globalTypes) {
    globalTypes = registerBuiltIns(new TypeSystem());
  }
  const state = new ParseState(tokens);
  const loc = state.track();
  const types = globalTypes.createScope();
  return rootRule(state, types);
}

module.exports = parse;
module.exports.default = parse;
