class asciiOps {
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

  floats() {
    return this.read().split(/\s+/).map(Number);
  }

  ints() {
    return this.read().split(/\s+/).map(Number);
  }

  vec2() {
    const [x, y] = this.floats();
    return { x, y };
  }

  vec3() {
    const [x, y, z] = this.floats();
    return { x, y, z };
  }

  ivec3() {
    return this.ints();
  }

  ivec4() {
    return this.ints();
  }

  color() {
    const [r, g, b, a] = this.ints();
    return { r, g, b, a };
  }
}
 
export function parseAscii(text) {

  const ascii_ops = new asciiOps(text);

  // Bones
  const boneCount = ascii_ops.int();
  const bones = [];

  for (let i = 0; i < boneCount; i++) {
    bones.push({
      id: i,
      name: ascii_ops.string(),
      parent: ascii_ops.int(),
      position: ascii_ops.vec3()
    });
  }

  // Meshes
  const meshCount = ascii_ops.int();
  const meshes = [];

  for (let m = 0; m < meshCount; m++) {

    const mesh = {
      id: m,
      name: ascii_ops.string(),
      uvLayerCount: ascii_ops.int(),
      textures: [],
      vertices: [],
      faces: []
    };
    // Textures
    const textureCount = ascii_ops.int();
    
    for (let texId = 0; texId < textureCount; texId++) {
      mesh.textures.push({
        id: texId,
        file: ascii_ops.string().split(/[\\/]/).pop(),
        uvLayer: ascii_ops.int()
      });
    }

    // Vertices
    const vertexCount = ascii_ops.int();
    mesh.vertices = [];

    for (let v = 0; v < vertexCount; v++) {

      let vertex = {
        id: v,
        position: ascii_ops.vec3(),
        normal: ascii_ops.vec3(),
        color: ascii_ops.color(),
        uv: Array.from(
          { length: mesh.uvLayerCount },
          () => ascii_ops.vec2()
        ),
        boneIndices: ascii_ops.ivec4(),
        boneWeights: ascii_ops.floats()
      }
      mesh.vertices.push(vertex);
    }

    // Faces
    const faceCount = ascii_ops.int();
    mesh.faces = [];

    for (let f = 0; f < faceCount; f++) {
      mesh.faces.push(ascii_ops.ivec3());
    }

    meshes.push(mesh);
  }

  return {
    bones,
    meshes
  };
}
