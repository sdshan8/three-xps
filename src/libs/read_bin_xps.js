import { basename, isNone } from './helper.js';
import {
  BinOps,
  roundToMultiple,
  hasTangentVersion,
  hasVariableWeights
} from './bin_ops.js';
import { parseXpsPose } from './read_ascii_xps.js';
import * as xps_const from './xps_const.js';
import * as xps_types from './xps_types.js';

function flagName(flag) {
  const flagList = {
    0: xps_const.BACK_FACE_CULLING,
    1: xps_const.ALWAYS_FORCE_CULLING,
    2: xps_const.MODEL_CAST_SHADOWS,
    3: xps_const.TANGENT_SPACE_RED,
    4: xps_const.TANGENT_SPACE_GREEN,
    5: xps_const.TANGENT_SPACE_BLUE,
    6: xps_const.GLOSS,
    7: xps_const.HAS_BONE_DIRECTIONS,
  }
  return flagList[flag] ?? flag;
}

function flagsDefault() {
  const flags = {
    [xps_const.BACK_FACE_CULLING]: false,
    [xps_const.ALWAYS_FORCE_CULLING]: false,
    [xps_const.MODEL_CAST_SHADOWS]: true,
    [xps_const.TANGENT_SPACE_RED]: 0,  // Straight X channel
    [xps_const.TANGENT_SPACE_GREEN]: 1,  // Invert Y channel
    [xps_const.TANGENT_SPACE_BLUE]: 0,  // Straight Z channel
    [xps_const.GLOSS]: 10,
    [xps_const.HAS_BONE_DIRECTIONS]: false
  }
  return flags
}

function flagValue(flag, value) {
  // Flags
  // 00: Backface culling
  // 01: Always force culling
  // 02: Model cast shadows
  // 06: Save current bump specular gloss
  if ([0, 1, 2, 6, 7].includes(flag)) {
    return Boolean(value);
    // Flags
    // 03: X space
    // 04: Y space
    // 05: Z space
  } else if ([3, 4, 5].includes(flag)) {
    return (value % 2);
  } else {
    return value;
  }
}

function intToCoords(flag) {
  const flagValue = {
    0: '+',
    1: '-'
  };
  return flagValue[flag] ?? 'Uk';
}

// TODO: add printNormalMapSwizzel

function readFilesString(bin_ops) {
  try {
    let lengthByte2 = 0;

    let lengthByte1 = bin_ops.byte()

    if (lengthByte1 >= xps_const.LIMIT) {
      lengthByte2 = bin_ops.byte();
    }

    const length = (lengthByte1 % xps_const.LIMIT) + lengthByte2 * xps_const.LIMIT;

    const string = bin_ops.string(length);
    return string ?? ""
  } catch (e) {
    console.warn("Error reading string", e);
    return "";
  }
}

function readVertexColor(bin_ops) {
  try {
    const r = bin_ops.byte() ?? 255;
    const g = bin_ops.byte() ?? 255;
    const b = bin_ops.byte() ?? 255;
    const a = bin_ops.byte() ?? 255;
    return [r, g, b, a];
  } catch (e) {
    console.warn("Error reading vertex color", e);
    return [255, 255, 255, 255];
  }
}

function readUvVert(bin_ops) {
  try {
    const x = bin_ops.single() ?? 0.0;  // X pos
    const y = bin_ops.single() ?? 0.0;  // Y pos
    return [x, y];
  } catch (e) {
    console.warn("Error reading UV vertex", e);
    return [0.0, 0.0];
  }
}

function readXYZ(bin_ops) {
  try {
    const x = bin_ops.single() ?? 0.0;  // X pos
    const y = bin_ops.single() ?? 0.0;  // Y pos
    const z = bin_ops.single() ?? 0.0;  // Z pos
    return [x, y, z];
  } catch (e) {
    console.warn("Error reading XYZ coordinates", e);
    return [0.0, 0.0, 0.0];
  }
}

function read4Float(bin_ops) {
  try {
    const x = bin_ops.single() ?? 0.0;
    const y = bin_ops.single() ?? 0.0;
    const z = bin_ops.single() ?? 0.0;
    const w = bin_ops.single() ?? 0.0;
    return [x, y, z, w];
  } catch (e) {
    console.warn("Error reading 4 floats", e);
    return [0.0, 0.0, 0.0, 0.0];
  }
}

function read4Int16(bin_ops) {
  try {
    const r = bin_ops.int16() ?? 0;
    const g = bin_ops.int16() ?? 0;
    const b = bin_ops.int16() ?? 0;
    const a = bin_ops.int16() ?? 0;
    return [r, g, b, a];
  } catch (e) {
    console.warn("Error reading 4 floats", e);
    return [0, 0, 0, 0];
  }
}

function readTriIdxs(bin_ops) {
  try {
    const face1 = bin_ops.uint32() ?? 0;
    const face2 = bin_ops.uint32() ?? 0;
    const face3 = bin_ops.uint32() ?? 0;
    return [face1, face2, face3];
  } catch (e) {
    console.warn("Error reading triangle indices", e);
    return [0, 0, 0];
  }
}

function readHeader(bin_ops) {
  const xpsHeader = new xps_types.XpsHeader();
  let flags = flagsDefault();

  try {
    // MagicNumber
    const magic_number = bin_ops.uint32();
    if (magic_number !== xps_const.MAGIC_NUMBER) return null;
    // XPS Version
    const version_major = bin_ops.uint16() ?? 0;
    const version_minor = bin_ops.uint16() ?? 0;
    // XNAaral Name
    const xna_aral = readFilesString(bin_ops);
    // Settings Length
    const settingsLen = bin_ops.uint32() ?? 0;
    // MachineName
    const machineName = readFilesString(bin_ops);
    // UserName
    const userName = readFilesString(bin_ops);
    // File-->File
    const filesString = readFilesString(bin_ops);
    let xpsPoseData = null;

    const hasTangent = hasTangentVersion(version_major, version_minor);
    if (hasTangent) {
      bin_ops.skip(settingsLen * 4);
    } else {
      //let valuesRead = 0;
      const hash = bin_ops.uint32() ?? 0;
      //valuesRead += 1 * 4;
      const items = bin_ops.uint32() ?? 0;
      //valuesRead += 1 * 4;
      for (let i = 0; i < items; i++) {
        const optType = bin_ops.uint32() ?? 0;
        //valuesRead += 1 * 4;
        const optcount = bin_ops.uint32() ?? 0;
        //valuesRead += 1 * 4;
        const optInfo = bin_ops.uint32() ?? 0;
        //valuesRead += 1 * 4;

        switch (optType) {
          case 0:
            readNone(bin_ops, optcount);
            //valuesRead += optcount * 2
            break;
          case 1:
            xpsPoseData = readDefaultPose(bin_ops, optcount, optInfo);
            //const readCount = roundToMultiple(optcount, xps_const.ROUND_MULTIPLE);
            //valuesRead += readCount;
            break;
          case 2:
            let flags = readFlags(bin_ops, optcount);
            //valuesRead += optcount * 2 * 4;
            break;
          default:
            throw new Error(
              `Unknown header option type ${optType}`
            );
        }
      }
    }
    xpsHeader.magic_number = magic_number;
    xpsHeader.version_major = version_major;
    xpsHeader.version_minor = version_minor;
    xpsHeader.xna_aral = xna_aral;
    xpsHeader.settingsLen = settingsLen;
    xpsHeader.machine = machineName;
    xpsHeader.user = userName;
    xpsHeader.files = filesString;
    xpsHeader.pose = xpsPoseData;
    xpsHeader.flags = flags;
    return xpsHeader;
  } catch (e) {
    console.warn("Error reading header", e);
    return null;
  }
}

function findHeader(bin_ops) {
  let header = null;

  try {
    // Check for MAGIC_NUMBER
    const number = bin_ops.uint32();
    bin_ops.seek(0);

    if (number == xps_const.MAGIC_NUMBER) {
      //console.log('Header Found')
      header = readHeader(bin_ops);
    } else {
      console.log(`Warning: Invalid magic number, expected ${xps_const.MAGIC_NUMBER}, got ${number}`);
    }
    return header;
  } catch (e) {
    console.warn("Error finding header", e);
    return null;
  }
}

function readNone(bin_ops, optcount) {
  bin_ops.skip(4 * optcount);
}

function readFlags(bin_ops, optcount) {
  let flags = flagsDefault();
  try {
    for (let i = 0; i < optcount; i++) {
      const flag = bin_ops.uint32() ?? 0;
      const value = bin_ops.uint32() ?? 0;
      const flag_name = flagName(flag)
      flags[flag_name] = flagValue(flag, value);
    }
    return flags;
  } catch (e) {
    console.warn("Error reading flags", e);
    return flagsDefault();
  }
}


function readBones(bin_ops) {
  let bones = [];
  try {
    // Bone Count
    let boneCount = bin_ops.uint32() ?? 0;
    for (let boneId = 0; boneId < boneCount; boneId++) {
      let boneName = readFilesString(bin_ops);
      if (!boneName) {
        boneName = `Bone_${boneId}`;
      }
      let parentId = bin_ops.int16();

      const coords = readXYZ(bin_ops);
      const xpsBone = new xps_types.XpsBone(boneId, boneName, coords, parentId);
      bones.push(xpsBone)
    }
  } catch (e) {
    console.warn("Error reading bones", e);
  }
  return bones;
}


function readMeshes(bin_ops, xpsHeader, hasBones) {
  let meshes = [];
  try {
    const meshCount = bin_ops.uint32() ?? 0;
    const hasHeader = Boolean(xpsHeader);

    const verMajor = hasHeader ? xpsHeader.version_major : 0;
    const verMinor = hasHeader ? xpsHeader.version_minor : 0;

    const hasTangent = hasTangentVersion(verMajor, verMinor, hasHeader);
    const hasVariableWeight = hasVariableWeights(verMajor, hasHeader);

    for (let meshId = 0; meshId < meshCount; meshId++) {
      // Name
      let meshName = readFilesString(bin_ops);
      if (!meshName) {
        meshName = `Mesh_${meshId}`;
      }

      // uv Count
      const uvLayerCount = bin_ops.uint32() ?? 0;

      // Textures
      let textures = [];
      const textureCount = bin_ops.uint32() ?? 0;
      for (let texId = 0; texId < textureCount; texId++) {
        try {
          let textureFile = basename(readFilesString(bin_ops));
          if (!textureFile) {
            textureFile = `texture_${texId}.dds`;
          }
          let uvLayerId = bin_ops.uint32() ?? 0;
          const xpsTexture = new xps_types.XpsTexture(texId, textureFile, uvLayerId);
          textures.push(xpsTexture);
        } catch (e) {
          console.warn(`Error reading texture ${texId}`, e);
          continue;
        }
      }

      // Vertices
      let vertex = [];
      const vertexCount = bin_ops.uint32() ?? 0;
      for (let vertexId = 0; vertexId < vertexCount; vertexId++) {
        try {
          const coord = readXYZ(bin_ops);
          const normal = readXYZ(bin_ops);
          const vertexColor = readVertexColor(bin_ops);

          let uvs = [];
          for (let uvLayerId = 0; uvLayerId < uvLayerCount; uvLayerId++) {
            const uvVert = readUvVert(bin_ops);
            uvs.push(uvVert);
            if (hasTangent) read4Float(bin_ops);
          }

          let boneWeights = [];
          if (hasBones) {
            // if cero bones dont have weights to read

            let boneIdx = []
            let boneWeight = []
            let weightsCount = 4;
            if (hasVariableWeight) {
              weightsCount = bin_ops.int16() ?? 0;
            }

            for (let i = 0; i < weightsCount; i++) {
              boneIdx.push(
                bin_ops.int16()
              );
            }

            for (let i = 0; i < weightsCount; i++) {
              boneWeight.push(
                bin_ops.single()
              );
            }

            for (let idx = 0; idx < boneIdx.length; idx++) {
              boneWeights.push(
                new xps_types.BoneWeight(boneIdx[idx], boneWeight[idx])
              );
            }
          }
          const xpsVertex = new xps_types.XpsVertex(
            vertexId, coord, normal, vertexColor, uvs, boneWeights
          );
          vertex.push(xpsVertex)
        } catch (e) {
          console.warn(`Error reading vertex ${vertexId}`, e);
          continue;
        }
      }

      // Faces
      let faces = [];
      const triCount = bin_ops.uint32() ?? 0;

      for (let i = 0; i < triCount; i++) {
        try {
          const triIdxs = readTriIdxs(bin_ops);
          faces.push(triIdxs);
        } catch (e) {
          console.warn(`Error reading face ${i}`, e);
          continue;
        }
      }

      const xpsMesh = new xps_types.XpsMesh(
        meshName, textures, vertex, faces, uvLayerCount
      );
      meshes.push(xpsMesh);
    }
  } catch (e) {
    console.warn("Error reading meshes", e);
  }
  return meshes;
}

function parseBinModel(buffer) {
  try {
    const bin_ops = new BinOps(buffer);
    const xpsHeader = findHeader(bin_ops);
    const bones = readBones(bin_ops);
    const hasBones = bones.length !== 0;
    const meshes = readMeshes(bin_ops, xpsHeader, hasBones);
    const xpsModelData = new xps_types.XpsData(xpsHeader, bones, meshes);
    return xpsModelData;
  } catch (e) {
    console.warn("Error reading XPS model", e);
    return new xps_types.XpsData('', [], []);
  }
}

function readDefaultPose(bin_ops, poseLengthUnround) {
  const string = bin_ops.string(poseLengthUnround);

  const poseLength = roundToMultiple(poseLengthUnround, 4);
  const emptyBytes = poseLength - poseLengthUnround;

  if (emptyBytes > 0) {
    bin_ops.skip(emptyBytes);
  }

  return parseXpsPose(string);
}

export {
  parseBinModel
};
