import {
  Bone,
  BufferGeometry,
  DoubleSide,
  FileLoader,
  Float32BufferAttribute,
  Group,
  LinearSRGBColorSpace,
  Loader,
  MeshToonMaterial,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  TextureLoader,
  Uint16BufferAttribute
} from "three";
import { DDSLoader } from "three/addons/loaders/DDSLoader.js"
import { parseAscii } from "./libs/XPSAsciiParser.js"
import { parseBin } from "./libs/XPSBinParser.js"


/**
 * A loader for the XNALara format.
 *
 * The XNALara format is a format that is used in the 3D Model Viewing and Posing program,
 * [XNALara](https://core-design.com/community_xps.html) (also known as XPS), it stores
 * the 3D model information as either a Text file (generic_item.mesh.acsii)
 * or a Binary file (xps.xps), with the the Binary file usually usually holding more
 * info then the Text one.
 * 
 * based on https://github.com/mayloglog/XNALaraMesh-blender4.4
 *
 * ```js
 * const loader = new XPSLoader();
 * loader.load(
 *   'model/xps.xps',
 *   model =>{
 *     scene.add( model );
 *   }
 * );
 * ```
 *
 */
class XPSLoader extends Loader {
  /**
   * Constructs a new XPS loader.
   *
   * @param {Object} [options={}] - Loader configuration options.
   * @param {boolean} [options.enableDDS=false] - Whether to enable DDS texture support.
   * @param {boolean} [options.enableLightMap=false] - Whether to enable light map support.
   * @param {boolean} [options.enableToon=true] - Whether to enable toon shading.
   * @param {LoadingManager} [manager] - The loading manager.
   */
  constructor(options = {}, manager) {
    super(manager);

    this.enableDDS = options.enableDDS ?? false;
    this.enableLightMap = options.enableLightMap ?? false;
    this.enableToon = options.enableToon ?? true;
    
  }

  /**
   * Loads an XPS model from the given URL.
   *
   * @param {string} url - The URL of the XPS model.
   * @param {function(Object): void} onLoad - Will be called when the loading completes.
   * @param {function(ProgressEvent): void} [onProgress] - Will be called while the loading is in progress.
   * @param {function(Error): void} [onError] - Will be called if an error occurs.
   */
  load(url, onLoad, onProgress, onError) {

    this.resourcePath = url.substring(0, url.lastIndexOf("/") + 1);
    const loader = new FileLoader(this.manager);

    const lower = url.toLowerCase();

    const isAscii = lower.endsWith(".mesh.ascii");
    const isBinary = lower.endsWith(".xps");
  
    if (!isAscii && !isBinary) {
      throw new Error(
        "Unsupported XPS model format. Expected .mesh.ascii or .xps"
      );
    }

    loader.setResponseType(
      isBinary ? "arraybuffer" : "text"
    );

    loader.load(
      url,
      data => {
        try {
          onLoad(this.parse(data, isBinary));
        } catch (e) {
          if (onError) onError(e);
        }

      },
      onProgress,
      onError
    );
  }

  parse(data, isBinary = false) {

    const model = isBinary
      ? parseBin(data)
      : parseAscii(data);
  
    return this.buildModel(model);
  }

  buildModel(data) {
    
    const textureLoader = new TextureLoader(this.manager);
    const ddsLoader = new DDSLoader();
    const group = new Group();

    if (data.bones.length == 0 && data.meshes.length == 0) {
      throw new Error(
        "No Bones or Meshes"
      );
    }

    // Bones

    const bones = data.bones.map(boneData => {
      const bone = new Bone();

      bone.name = boneData.name;
      if (boneData.parent < 0) {
        bone.position.set(
          boneData.position.x,
          boneData.position.y,
          boneData.position.z
        );
      } else {
        bone.position.set(
          boneData.position.x - data.bones[boneData.parent].position.x,
          boneData.position.y - data.bones[boneData.parent].position.y,
          boneData.position.z - data.bones[boneData.parent].position.z,
        );
      }

      return bone;
    });

    let rootBone = null;

    data.bones.forEach((boneData, i) => {
      if (boneData.parent < 0) {
        rootBone = bones[i];
      } else {
        bones[boneData.parent].add(bones[i]);
      }
    });

    const skeleton = new Skeleton(bones);

    // Meshes

    for (const meshData of data.meshes) {
      const positions = [];
      const normals = [];
      const uvs = [];
      const colors = [];
      const skinIndices = [];
      const skinWeights = [];
      const indices = [];

      for (const v of meshData.vertices) {
        positions.push(
          v.position.x,
          v.position.y,
          v.position.z
        );

        normals.push(
          v.normal.x,
          v.normal.y,
          v.normal.z
        );

        uvs.push(
          v.uv[0].x,
          v.uv[0].y
        );

        colors.push(
          v.color.r / 255,
          v.color.g / 255,
          v.color.b / 255,
          v.color.a / 255
        );

        skinIndices.push(...v.boneIndices);
        skinWeights.push(...v.boneWeights);
      }

      for (const face of meshData.faces) {
        indices.push(face[0], face[2], face[1]);
      }

      const geometry = new BufferGeometry();

      geometry.setAttribute(
        "position",
        new Float32BufferAttribute(positions, 3)
      );

      geometry.setAttribute(
        "normal",
        new Float32BufferAttribute(normals, 3)
      );

      geometry.setAttribute(
        "uv",
        new Float32BufferAttribute(uvs, 2)
      );

      geometry.setAttribute(
        "color",
        new Float32BufferAttribute(colors, 4)
      );
      
      if(this.enableLightMap) {
        geometry.setAttribute(
          "uv1",
          geometry.getAttribute("uv").clone()
        );
      }
      
      geometry.setAttribute(
        "skinIndex",
        new Uint16BufferAttribute(skinIndices, 4)
      );

      geometry.setAttribute(
        "skinWeight",
        new Float32BufferAttribute(skinWeights, 4)
      );

      geometry.setIndex(indices);

      let textureFile = meshData.textures[0].file;
      let texture;
      
      if (textureFile.endsWith(".dds") && this.enableDDS) {
        texture = ddsLoader.load(this.resourcePath + textureFile);
        texture.colorSpace = SRGBColorSpace;
      } else if (textureFile.endsWith(".dds")) {
        textureFile = textureFile.replace(".dds",".png");
        texture = textureLoader.load(this.resourcePath + textureFile);
        texture.colorSpace = SRGBColorSpace;
        texture.flipY = false;
      } else {
        texture = textureLoader.load(this.resourcePath + textureFile);
        texture.colorSpace = SRGBColorSpace;
        texture.flipY = false;
      }
      
      let lightMap;
      if(this.enableLightMap) {
        if (textureFile.includes("_Color")) {
          textureFile = textureFile.replace(".dds",".png");
          const lightMapFile = textureFile.replace("_Color","_LightMap");
          lightMap = textureLoader.load(this.resourcePath + lightMapFile);
          lightMap.colorSpace = LinearSRGBColorSpace;
          lightMap.flipY = true;
        }
      }
      let material;
      if(this.enableToon){
        material = new MeshToonMaterial({
          map: texture,
          vertexColors: false,
          transparent: true,
          alphaTest: 0.2,
          side: DoubleSide
        });
      } else {
        material = new MeshStandardMaterial({
          map: texture,
          vertexColors: false,
          transparent: true,
          alphaTest: 0.2,
          side: DoubleSide
        });
      }
      if(lightMap) {
        material.lightMap = lightMap;
        material.lightMapIntensity = 1;
      }

      const mesh = new SkinnedMesh(geometry, material);

      mesh.name = meshData.name;

      mesh.add(rootBone);
      mesh.bind(skeleton);
      mesh.normalizeSkinWeights();

      group.add(mesh);
    }
    return group;
  }
}

export { XPSLoader };