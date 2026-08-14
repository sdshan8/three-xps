
class AsciiOps {

  constructor(text) {
    this.lines = text
      .split(/\r?\n/)
      .map(line => line.split("#")[0].trim())
      .filter(line => line.length > 0);

    this.pos = 0;
  }

  read() {
    if (this.pos >= this.lines.length) {
      throw new Error("Unexpected end of file");
    }
    return this.lines[this.pos++];
  }

  int() {
    return parseInt(this.read(), 10);
  }

  string() {
    return this.read();
  }

  splitValues() {
    return this.read()
      .split(/\s+/)
      .map(Number);
  }
}

export {
  AsciiOps
};