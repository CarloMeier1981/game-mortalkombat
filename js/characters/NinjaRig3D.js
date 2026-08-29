import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { createShadowDisc } from './FighterRig3D.js';

let template = null;
let loadingPromise = null;

export function preloadNinja(url) {
  if (template || loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        template = gltf.scene;
        resolve(template);
      },
      undefined,
      (err) => {
        console.error('Ninja model failed to load:', err);
        resolve(null);
      }
    );
  });
  return loadingPromise;
}

export function isNinjaReady() {
  return !!template;
}

function cloneMaterials(group) {
  const seen = new Map();
  const all = [];
  group.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const src = obj.material;
    if (!seen.has(src)) {
      const cloned = src.clone();
      seen.set(src, cloned);
      all.push(cloned);
    }
    obj.material = seen.get(src);
  });
  return all;
}

export function buildNinjaRig(charData) {
  if (!template) return null;
  const { build } = charData;

  const group = template.clone(true);
  const allMaterials = cloneMaterials(group);

  const legLPivot = group.getObjectByName('legLPivot');
  const legRPivot = group.getObjectByName('legRPivot');
  const armBackPivot = group.getObjectByName('armBackPivot');
  const armFrontPivot = group.getObjectByName('armFrontPivot');
  const armFront = group.getObjectByName('armFront');
  const armBack = group.getObjectByName('armBack');
  const torso = group.getObjectByName('torso');
  const head = group.getObjectByName('head');

  const secondaryMaterial = armFront.material;
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: charData.color.accent,
    roughness: 0.4,
    metalness: 0.3,
  });
  allMaterials.push(accentMaterial);

  const { shadow, shadowMat } = createShadowDisc(build.width);
  group.add(shadow);

  // Dummy target for poseRig's generic eye-offset nudge — the ninja mask has no separate eye mesh.
  const eye = new THREE.Object3D();

  return {
    group,
    legLPivot,
    legRPivot,
    torso,
    chest: null,
    armBackPivot,
    armBack,
    armFrontPivot,
    armFront,
    head,
    eye,
    shadow,
    shadowMat,
    materials: { primary: secondaryMaterial, secondary: secondaryMaterial, accent: accentMaterial },
    allMaterials,
    stretchableArm: false,
    dims: { w: build.width, h: build.height, headR: build.headR, legH: build.height * 0.42, torsoH: build.height * 0.42, armLen: build.height * 0.36 },
  };
}

export function disposeNinjaRig(rig) {
  for (const mat of rig.allMaterials) mat.dispose();
  rig.shadowMat.dispose();
}
