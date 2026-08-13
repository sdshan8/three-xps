import {
  LIMIT,
  ENCODING_READ
} from "./xps_const.js";


class BinOps {

  constructor(buffer) {
    this.view = new DataView(buffer);
    this.decoder = new TextDecoder(ENCODING_READ);
    this.pos = 0;
  }

  seek(pos) {
    this.pos = pos;
  }

  skip(bytes) {
    this.pos += bytes;
  }

  is_eof() {
    return this.pos >= this.view.byteLength;
  }

  sbyte() {
    return this.view.getInt8(this.pos++);
  }

  byte() {
    return this.view.getUint8(this.pos++);
  }

  int16() {
    const out = this.view.getInt16(this.pos, true);
    this.pos += 2;
    return out;
  }

  uint16() {
    const out = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return out;
  }

  int32() {
    const out = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return out;
  }

  uint32() {
    const out = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return out;
  }

  int64() {
    const out = this.view.getBigInt64(this.pos, true);
    this.pos += 8;
    return out;
  }

  uint64() {
    const out = this.view.getBigUint64(this.pos, true);
    this.pos += 8;
    return out;
  }

  single() {
    const out = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return out;
  }

  double() {
    const out = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return out;
  }

  bytes(length) {
    const bytes = new Uint8Array(this.view.buffer, this.pos, length);
    this.pos += length;
    return bytes;
  }

  string(length) {
    return this.decoder.decode(this.bytes(length));
  }
}

function roundToMultiple(numToRound, multiple) {
  return Math.floor(
    (numToRound + multiple - 1) / multiple
  ) * multiple;
}

function hasHeader(fileformat = '.xps') {
  return fileformat == '.xps';
}

function hasTangentVersion(verMajor, verMinor, hasHeader = true) {
  if (
    (verMajor <= 2) &&
    (verMinor <= 12) &&
    hasHeader
  ) {
    return true;
  }
  return false;
}

function hasVariableWeights(verMajor, hasHeader = true) {
  if (
    (verMajor >= 3) &&
    hasHeader
  ) {
    return true;
  }
  return false;
}

export {
  BinOps,
  roundToMultiple,
  hasTangentVersion,
  hasVariableWeights
};
