import * as xps_const from './xps_const.js';


export class XpsBone {

  constructor( id, name, position, parent) {
    this.id = id;
    this.name = name;
    this.position = position;
    this.parent = parent;
  }
}

export class XpsBonePose {

  constructor( boneName, coordDelta, rotDelta, scale) {
    this.boneName = boneName;
    this.coordDelta = coordDelta;
    this.rotDelta = rotDelta;
    this.scale = scale;
  }
}

export class XpsMesh {

  constructor( name, textures, vertices, faces, uvCount) {
    this.name = name;
    this.textures = textures;
    this.vertices = vertices;
    this.faces = faces;
    this.uvCount = uvCount;
  }
}

export class BoneWeight {

  constructor( id, weight) {
    this.id = id;
    this.weight = weight;
  }
}

export class XpsVertex {

  constructor( id, position, normal, color, uv, boneWeights) {
    this.id = id;
    this.position = position;
    this.normal = normal;
    this.color = color;
    this.uv = uv;
    this.boneWeights = boneWeights;
    this.merged = false;
  }
}

export class XpsTexture {

  constructor( id, file, uvLayer) {
    this.id = id;
    this.file = file;
    this.uvLayer = uvLayer;
  }
}

export class XpsData {
  constructor(header = '', bones = [], meshes = []) {
    this.header = header;
    this.bones = bones;
    this.meshes = meshes;
  }
}

export class XpsHeader {
  constructor(
    magic_number = xps_const.MAGIC_NUMBER,
    version_mayor = xps_const.XPS_VERSION_MAYOR,
    version_minor = xps_const.XPS_VERSION_MINOR,
    xna_aral = xps_const.XNA_ARAL,
    settingsLen = xps_const.STRLEN,
    machine = '',
    user = '',
    files = '',
    settings = '',
    pose = '') {
    this.magic_number = magic_number;
    this.version_mayor = version_mayor;
    this.version_minor = version_minor;
    this.xna_aral = xna_aral;
    this.settingsLen = settingsLen;
    this.machine = machine;
    this.user = user;
    this.files = files;
    this.settings = settings;
    this.pose = pose;
  }
}

export class XpsImportSettings {

  constructor(
    filename,
    uvDisplX,
    uvDisplY,
    importDefaultPose,
    joinMeshRips,
    joinMeshParts,
    markSeams,
    vColors,
    connectBones,
    autoIk,
    importNormals) {
    this.filename = filename;
    this.uvDisplX = uvDisplX;
    this.uvDisplY = uvDisplY;
    this.importDefaultPose = importDefaultPose;
    this.joinMeshRips = joinMeshRips;
    this.joinMeshParts = joinMeshParts;
    this.markSeams = markSeams;
    this.vColors = vColors;
    this.connectBones = connectBones;
    this.autoIk = autoIk;
    this.importNormals = importNormals;
  }
}

export class XpsExportSettings {

  constructor(
    filename,
    format,
    uvDisplX,
    uvDisplY,
    exportOnlySelected,
    expDefPose,
    preserveSeams,
    vColors,
    exportNormals,
    versionMayor,
    versionMinor) {
    this.filename = filename;
    this.format = format;
    this.uvDisplX = uvDisplX;
    this.uvDisplY = uvDisplY;
    this.exportOnlySelected = exportOnlySelected;
    this.expDefPose = expDefPose;
    this.preserveSeams = preserveSeams;
    this.vColors = vColors;
    this.exportNormals = exportNormals;
    this.versionMayor = versionMayor;
    this.versionMinor = versionMinor;
  }
}