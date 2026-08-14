import { AsciiOps } from './ascii_ops.js';
import { basename } from './helper.js';
import * as xps_types from './xps_types.js';

function readUvVert(ascii_ops) {
  const values = ascii_ops.splitValues();
  if (values.length !== 2) return [0.0, 0.0];

  return values;
}

function readXYZ(ascii_ops) {
  const values = ascii_ops.splitValues();
  if (values.length !== 3) return [0.0, 0.0, 0.0];
  return values;
}

function fillArray(array, minLen, value) {
  const extraLen = Math.max(0, minLen - array.length);
  return array.concat(Array.from({ length: extraLen }, () => value));
}

function read4float(ascii_ops) {
  let values = ascii_ops.splitValues();
  if (!values) return [0.0, 0.0, 0.0, 0.0];
  values = fillArray(values, 4, 0);
  return values;
}

function readBoneWeight(ascii_ops) {
  return read4float(ascii_ops);
}

function readBoneId(ascii_ops) {
  const values = ascii_ops.splitValues();
  if (!values) return [0, 0, 0, 0];
  const ids = fillArray(values, 4, 0);
  return ids;
}

function read4Int(ascii_ops) {
  const values = ascii_ops.splitValues();
  if (!values) return [255, 255, 255, 255];
  const vertexColor = fillArray(values, 4, 0);
  return vertexColor;
}

function readTriIdxs(ascii_ops) {
  const values = ascii_ops.splitValues();
  if (!values) return [0, 0, 0];
  if (values.length !== 3) return [0, 0, 0];
  return values;
}

function readBones(ascii_ops) {
  let bones = [];
  try {
    // Bone Count
    let boneCount = ascii_ops.int();
    if (!boneCount || (boneCount < 0)) return bones;
    for (let boneId = 0; boneId < boneCount; boneId++) {
      let boneName = ascii_ops.string();
      if (!boneName) {
        boneName = `Bone_${boneId}`;
      }
      let parentId = ascii_ops.int();
      if (!parentId) {
        parentId = -1;
      }
      const coords = readXYZ(ascii_ops);
      const xpsBone = new xps_types.XpsBone(boneId, boneName, coords, parentId);
      bones.push(xpsBone)
    }
  } catch (e) {
    console.warn("Error reading bones", e);
  }
  return bones;
}

function readMeshes(ascii_ops, hasBones) {
  let meshes = [];
  try {
    const meshCount = ascii_ops.int();
    if (!meshCount || (meshCount < 0)) return meshes;

    for (let meshId = 0; meshId < meshCount; meshId++) {
      // Name
      let meshName = ascii_ops.string();
      if (!meshName) {
        meshName = `Mesh_${meshId}`;
      }

      // uv Count
      let uvLayerCount = ascii_ops.int();
      if (!uvLayerCount || (uvLayerCount < 0)) {
        uvLayerCount = 0;
      }

      // Textures
      let textures = [];
      let textureCount = ascii_ops.int();
      if (!textureCount || (textureCount < 0)) {
        textureCount = 0;
      }

      for (let texId = 0; texId < textureCount; texId++) {
        try {
          let textureFile = basename(ascii_ops.string());
          if (!textureFile) {
            textureFile = `texture_${texId}.dds`;
          }
          let uvLayerId = ascii_ops.int();
          if (!uvLayerId) {
            uvLayerId = 0;
          }

          const xpsTexture = new xps_types.XpsTexture(texId, textureFile, uvLayerId);
          textures.push(xpsTexture);
        } catch (e) {
          console.warn(`Error reading texture ${texId}`, e);
          continue;
        }
      }

      // Vertices
      let vertex = [];
      let vertexCount = ascii_ops.int();
      if (!vertexCount || (vertexCount < 0)) {
        vertexCount = 0;
      }

      for (let vertexId = 0; vertexId < vertexCount; vertexId++) {
        try {
          const coord = readXYZ(ascii_ops);
          const normal = readXYZ(ascii_ops);
          const vertexColor = read4Int(ascii_ops);

          let uvs = [];
          for (let uvLayerId = 0; uvLayerId < uvLayerCount; uvLayerId++) {
            const uvVert = readUvVert(ascii_ops);
            uvs.push(uvVert);
            // if (????)
            // tangent????
            // tangent = read4float(ascii_ops)
          }

          let boneWeights = [];
          if (hasBones) {
            // if cero bones dont have weights to read
            const boneIdx = readBoneId(ascii_ops);
            const boneWeight = readBoneWeight(ascii_ops);

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
      let triCount = ascii_ops.int();
      if (!triCount || (triCount < 0)) {
        triCount = 0;
      }

      for (let i = 0; i < triCount; i++) {
        try {
          const triIdxs = readTriIdxs(ascii_ops);
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

function poseData(string) {
  let poseData = {};
  try {
    const poseList = string.split(/\r?\n/)
    for (let bonePose of poseList) {
      if (bonePose && bonePose.includes(":")) {
        const pose = bonePose.split(':');
        if (pose.length < 2) continue;
        const boneName = pose[0].trim();
        if (!boneName) continue;
        const dataList = fillArray(pose[1].trim().split(/\s+/), 9, 1);
        try {
          const rotDelta = {
            x: parseFloat(dataList[0]),
            y: parseFloat(dataList[1]),
            z: parseFloat(dataList[2])
          };
          const coordDelta = {
            x: parseFloat(dataList[3]),
            y: parseFloat(dataList[4]),
            z: parseFloat(dataList[5])
          };
          const scale = {
            x: parseFloat(dataList[6]),
            y: parseFloat(dataList[7]),
            z: parseFloat(dataList[8])
          };

          const bonePose = new xps_types.XpsBonePose(
            boneName, coordDelta, rotDelta, scale
          );
          poseData[boneName] = bonePose;
        } catch (error) {
          console.warn(`Error parsing pose data for bone ${boneName}`, error);
          continue;
        }
      }
    }
  } catch (error) {
    console.warn("Error processing pose data", error);
  }
  return poseData;
}

function parseAsciiModel(string) {
  try {
    const ascii_ops = new AsciiOps(string);
    // const xpsHeader = readHeader(ascii_ops);
    const bones = readBones(ascii_ops);
    const hasBones = bones.length !== 0;
    const meshes = readMeshes(ascii_ops, hasBones);
    const xpsModelData = new xps_types.XpsData('', bones, meshes);
    return xpsModelData;
  } catch (e) {
    console.warn("Error reading XPS model", e);
    return new xps_types.XpsData('', [], []);
  }
}

function parseXpsPose(string){
  return poseData(string);
}


/**
 * TODO: Add Suport for BoneDict
 */

export {
  parseAsciiModel,
  parseXpsPose
};