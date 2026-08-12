import { poseData } from "../ascii_ops.js";

class binOps {
  static LIMIT = 128;

  constructor(buffer) {
    this.view = new DataView(buffer);
    this.decoder = new TextDecoder("utf-8");
    this.pos = 0;
  }

  seek(pos) {
    this.pos = pos;
  }

  skip(bytes) {
    this.pos += bytes;
  }

  line() {
    const start = this.pos;
  
    while (this.pos < this.view.byteLength) {
      const c = this.view.getUint8(this.pos++);
  
      if (c === 0x0A) { // '\n'
        break;
      }
    }
  
    const bytes = new Uint8Array(
      this.view.buffer,
      start,
      this.pos - start
    );
  
    return this.decoder
      .decode(bytes)
      .replace(/\r?\n$/, "");
  }

  eof() {
    return this.pos >= this.view.byteLength;
  }

  byte() {
    return this.view.getUint8(this.pos++);
  }

  sbyte() {
    return this.view.getInt8(this.pos++);
  }

  ushort() {
    const value = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return value;
  }

  short() {
    const value = this.view.getInt16(this.pos, true);
    this.pos += 2;
    return value;
  }

  uint() {
    const value = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return value;
  }

  int() {
    const value = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return value;
  }

  float() {
    const value = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return value;
  }

  double() {
    const value = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return value;
  }

  bytes(length) {
    const bytes = new Uint8Array(
      this.view.buffer,
      this.pos,
      length
    );

    this.pos += length;

    return bytes;
  }

  string(length) {
    return this.decoder.decode(this.bytes(length));
  }

  xpsString() {
    let b1 = this.byte();
    let b2 = 0;

    if (b1 >= binOps.LIMIT) {
      b2 = this.byte();
    }

    const length = (b1 % binOps.LIMIT) + b2 * binOps.LIMIT;

    return this.string(length);
  }

  vec2() {
    return {
      x: this.float(),
      y: this.float()
    };
  }

  vec3() {
    return {
      x: this.float(),
      y: this.float(),
      z: this.float()
    };
  }

  vec4() {
    return {
      x: this.float(),
      y: this.float(),
      z: this.float(),
      w: this.float()
    };
  }

  ivec3() {
    return [
      this.int(),
      this.int(),
      this.int()
    ];
  }

  ivec4() {
    return [
      this.int(),
      this.int(),
      this.int(),
      this.int()
    ];
  }

  uvec3() {
    return [
      this.uint(),
      this.uint(),
      this.uint()
    ];
  }

  color() {
    return {
      r: this.byte(),
      g: this.byte(),
      b: this.byte(),
      a: this.byte()
    };
  }

  align(multiple) {
    this.pos = Math.ceil(this.pos / multiple) * multiple;
  }

  roundToMultiple(value, multiple) {
    return Math.ceil(value / multiple) * multiple;
  }
}

function hasTangentVersion(verMajor, verMinor, hasHeader = true) {
  return hasHeader
    ? (verMajor <= 2 && verMinor <= 12)
    : true;
}

function hasVariableWeights(verMajor, hasHeader = true) {
  return hasHeader
    ? verMajor >= 3
    : false;
}

function flagsDefault() {
  return {};
}

function readFlags(bin, count) {
  const flags = flagsDefault();

  for (let i = 0; i < count; i++) {
    const flag = bin.uint();
    const value = bin.uint();

    flags[flag] = value;
  }

  return flags;
}

function readNone(bin, optionCount) {
  for (let i = 0; i < optionCount; i++) {
    bin.uint();
  }
}

function readDefaultPose(bin, poseLength, poseBones) {
  const lines = [];

  for (let i = 0; i < poseBones; i++) {
    lines.push(bin.line());
  }

  const roundedLength = bin.roundToMultiple(poseLength, 4);
  const padding = roundedLength - poseLength;

  if (padding > 0) {
    bin.skip(padding);
  }

  return lines;
}

function readHeader(bin) {
  const MAGIC = 0x0004EEA0;
  const ROUND_MULTIPLE = 4;

  const magic = bin.uint();

  if (magic !== MAGIC) {
    throw new Error("Invalid XPS file.");
  }

  const versionMajor = bin.ushort();
  const versionMinor = bin.ushort();

  const xnaAral = bin.xpsString();

  const settingsLen = bin.uint();

  const machine = bin.xpsString();
  const user = bin.xpsString();
  const files = bin.xpsString();

  let defaultPose = [];
  

  const flags = flagsDefault();

  const hasTangent = hasTangentVersion(versionMajor, versionMinor);

  if (hasTangent) {
    bin.skip(settingsLen * 4);
  } else {
    bin.uint(); // hash
    const itemCount = bin.uint();

    for (let i = 0; i < itemCount; i++) {
      const optionType = bin.uint();
      const optionCount = bin.uint();
      const optionInfo = bin.uint();
      
      switch (optionType) {
        case 0:
          readNone(bin, optionCount);
          break;

        case 1:
          defaultPose = readDefaultPose(bin, optionCount, optionInfo);
          break;
          /*
          for (let j = 0; j < optionInfo; j++)
            bin.line();

          bin.skip(
            bin.roundToMultiple(optionCount, ROUND_MULTIPLE) -
            optionCount
          );
          break;
          */

        case 2:
          Object.assign(flags, readFlags(bin, optionCount));
          break;

        default:
          throw new Error(
            `Unknown header option type ${optionType}`
          );
      }
    }
  }

  return {
    magic,
    versionMajor,
    versionMinor,
    xnaAral,
    settingsLen,
    machine,
    user,
    files,
    flags,
    defaultPose: poseData(defaultPose)
  };
}

function readBones(bin) {
  const bones = [];

  const boneCount = bin.uint();

  for (let id = 0; id < boneCount; id++) {
    bones.push({
      id,
      name: bin.xpsString() || `Bone_${id}`,
      parent: bin.short(),
      position: bin.vec3()
    });
  }

  return bones;
}

function readMeshes(bin, header, hasBones = true) {
  const meshes = [];

  const meshCount = bin.uint();

  const hasHeader = header != null;

  const versionMajor = hasHeader ? header.versionMajor : 0;
  const versionMinor = hasHeader ? header.versionMinor : 0;

  const hasTangent =
    hasTangentVersion(versionMajor, versionMinor, hasHeader);

  const variableWeights =
    hasVariableWeights(versionMajor, hasHeader);

  for (let meshId = 0; meshId < meshCount; meshId++) {

    const mesh = {
      name: bin.xpsString() || `Mesh_${meshId}`,
      uvLayerCount: bin.uint(),
      textures: [],
      vertices: [],
      faces: []
    };

    // Textures
    const textureCount = bin.uint();

    for (let texId = 0; texId < textureCount; texId++) {
      mesh.textures.push({
        id: texId,
        file: bin.xpsString().split(/[\\/]/).pop(),
        uvLayer: bin.uint()
      });
    }

    // Vertices
    const vertexCount = bin.uint();

    for (let vertexId = 0; vertexId < vertexCount; vertexId++) {

      const vertex = {
        id: vertexId,
        position: bin.vec3(),
        normal: bin.vec3(),
        color: bin.color(),
        uv: [],
        boneIndices: [],
        boneWeights: []
      };

      for (let i = 0; i < mesh.uvLayerCount; i++) {
        vertex.uv.push(bin.vec2());

        if (hasTangent) {
          vertex.tangent = bin.vec4();
        }
      }

      if (hasBones) {

        const weightCount = variableWeights
          ? bin.short()
          : 4;

        const boneIds = [];

        for (let i = 0; i < weightCount; i++) {
          boneIds.push(bin.short());
        }

        for (let i = 0; i < weightCount; i++) {
          vertex.boneIndices.push(boneIds[i])
          vertex.boneWeights.push(bin.float())
        }
      }

      mesh.vertices.push(vertex);
    }

    // Faces
    const faceCount = bin.uint();

    for (let i = 0; i < faceCount; i++) {
      mesh.faces.push(bin.uvec3());
    }

    meshes.push(mesh);
  }

  return meshes;
}

export function parseBin(arrayBuffer, hasBones = true) {
  const bin = new binOps(arrayBuffer);

  const header = readHeader(bin);
  const bones = readBones(bin);
  const meshes = readMeshes(bin, header, hasBones);

  return {
    header,
    bones,
    meshes
  };
}
