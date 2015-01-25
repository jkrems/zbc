/* @flow */
export class Token {
  constructor(type, text) {
    this.type = type;
    this.text = text;
  }
}

export const INT = 0;
export const CHAR = 1;
export const STRING = 2;
