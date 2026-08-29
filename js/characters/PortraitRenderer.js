import * as THREE from 'three';
import { buildFighterRig, poseRig, disposeRig } from './FighterRig3D.js';
import { buildSkeletalRig, disposeSkeletalRig, poseSkeletalRig } from './SkeletalRig3D.js';
import { WORLD } from '../core/World.js';

const RIG_KINDS = {
  skeletal: { build: buildSkeletalRig, dispose: disposeSkeletalRig, pose: poseSkeletalRig },
};

const cache = new Map();

// Renders a bust-style portrait (waist-up, slight 3/4 turn) of a character's actual
// in-game 3D rig — used by the character select UI instead of a flat color swatch.
// Returns a data URL, or null if the character's model hasn't finished loading yet
// (caller should retry once preloading resolves). Results are cached per character id.
export function renderPortrait(charData, size = 256) {
  if (cache.has(charData.id)) return cache.get(charData.id);

  const kind = RIG_KINDS[charData.rigKind];
  const build = kind ? kind.build : buildFighterRig;
  const pose = kind ? kind.pose : poseRig;
  const dispose = kind ? kind.dispose : disposeRig;

  const rig = build(charData);
  if (!rig) return null;

  const mockFighter = {
    x: 0, y: WORLD.floorY, facing: 1, animTime: 0, state: 'idle',
    invincible: false, color: charData.color,
  };
  pose(rig, mockFighter);
  rig.group.rotation.y += THREE.MathUtils.degToRad(22);

  const scene = new THREE.Scene();
  scene.add(rig.group);
  const key = new THREE.DirectionalLight(0xfff2e0, 1.3);
  key.position.set(-160, 320, 420);
  scene.add(key);
  const rim = new THREE.DirectionalLight(charData.color.accent, 0.9);
  rim.position.set(220, 140, -320);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x50525c, 1.0));

  const h = charData.build.height;
  const feetY = -WORLD.floorY;
  const hipY = feetY + h * 0.42;
  const topY = feetY + h + h * 0.08;
  const centerY = (hipY + topY) / 2;
  const halfH = ((topY - hipY) / 2) * 1.1;

  const camera = new THREE.OrthographicCamera(-halfH, halfH, halfH, -halfH, 0.1, 3000);
  camera.position.set(0, centerY, 1000);
  camera.lookAt(0, centerY, 0);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  renderer.render(scene, camera);

  const dataUrl = canvas.toDataURL('image/png');
  cache.set(charData.id, dataUrl);

  scene.remove(rig.group);
  dispose(rig);
  renderer.dispose();

  return dataUrl;
}

export function getCachedPortrait(charId) {
  return cache.get(charId) || null;
}
