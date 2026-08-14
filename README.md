# Three XPS

A Three.js loader for importing XPS (XNALara/XPS) models. Based on https://github.com/mayloglog/XNALaraMesh-blender4.4

## Disclaimer
Some of the code was AI-Genned as I didn't know how THREE.js worked at that time.

Specifically:
* Most of the Boilerplate for `src/XPSLoader.js`
* `constructor()` for `src/libs/ascii_ops.js`
* `constructor()` for `src/libs/bin_ops.js`
* `fillArray()` in `src/libs/read_ascii_xps.js`
* `extractModelName()` in `src/libs/helper.js`


## Installation

```bash
npm install three-xps three
```

## Usage

```js
import * as THREE from 'three';
import { XPSLoader } from 'three-xps';

const scene = new THREE.Scene();

const loader = new XPSLoader();

loader.load(
  'model.xps',
  (model) => {
    scene.add(model);
  },
  undefined,
  (error) => {
    console.error('Failed to load XPS model:', error);
  }
);
```

## Supported Files

* `.xps`
* `.mesh.ascii`

## Requirements

* Three.js
* A modern browser or Node.js environment with ESM support

## License

I don't know which License https://github.com/mayloglog/XNALaraMesh-blender4.4 in under so it's Unlicensed for now
I know the blender addon page says it's GPL 3.0 but the repo doesn't have any License File.
