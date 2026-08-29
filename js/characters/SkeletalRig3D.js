import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { clone as skeletonClone } from '../vendor/utils/SkeletonUtils.js';
import { createShadowDisc } from './FighterRig3D.js';
import { WORLD } from '../core/World.js';

const templates = new Map();
const loadingPromises = new Map();

export function preloadSkeletal(url) {
  if (templates.has(url)) return Promise.resolve(templates.get(url));
  if (loadingPromises.has(url)) return loadingPromises.get(url);
  const p = new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        templates.set(url, gltf.scene);
        resolve(gltf.scene);
      },
      undefined,
      (err) => {
        console.error('Skeletal model failed to load:', url, err);
        resolve(null);
      }
    );
  });
  loadingPromises.set(url, p);
  return p;
}

export function isSkeletalReady(url) {
  return templates.has(url);
}

function cloneMaterials(group) {
  const seen = new Map();
  const all = [];
  group.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const wasArray = Array.isArray(obj.material);
    const src = wasArray ? obj.material : [obj.material];
    const cloned = src.map((m) => {
      if (!seen.has(m)) {
        const c = m.clone();
        seen.set(m, c);
        all.push(c);
      }
      return seen.get(m);
    });
    obj.material = wasArray ? cloned : cloned[0];
  });
  return all;
}

// Rotation offsets are deltas applied on top of each bone's baked rest pose,
// matching how Blender's pose-bone rotation_euler is relative to the rest/edit bone.
const REST_ARM_Z = 1.309; // ~75 deg: hangs the T-pose arm down to the character's side
const ATTACK_ARM_Z = 0.349; // ~20 deg: swings the striking arm up and across the body
const BLOCK_ARM_Z = 0.611; // ~35 deg: partially raised guard
const VICTORY_ARM_Z = -1.047; // ~-60 deg: arm raised overhead

export function buildSkeletalRig(charData) {
  const template = templates.get(charData.model3d);
  if (!template) return null;
  const { build } = charData;

  const group = skeletonClone(template);
  const allMaterials = cloneMaterials(group);

  // The glTF export strips dots from bone names (e.g. "upper_arm.L" -> "upper_armL").
  const upperArmL = group.getObjectByName('upper_armL');
  const upperArmR = group.getObjectByName('upper_armR');
  const restRotL = upperArmL.rotation.clone();
  const restRotR = upperArmR.rotation.clone();

  const { shadow, shadowMat } = createShadowDisc(build.width);
  group.add(shadow);

  const eye = new THREE.Object3D();

  return {
    group,
    upperArmL,
    upperArmR,
    restRotL,
    restRotR,
    legLPivot: eye,
    legRPivot: eye,
    torso: null,
    chest: null,
    armBackPivot: eye,
    armBack: null,
    armFrontPivot: eye,
    armFront: null,
    head: eye,
    eye,
    shadow,
    shadowMat,
    materials: { primary: allMaterials[0], secondary: allMaterials[0], accent: allMaterials[0] },
    allMaterials,
    stretchableArm: false,
    isSkeletal: true,
    dims: { w: build.width, h: build.height, headR: build.headR, legH: build.height * 0.42, torsoH: build.height * 0.42, armLen: build.height * 0.36 },
  };
}

export function poseSkeletalRig(rig, fighter) {
  const { group, upperArmL, upperArmR, restRotL, restRotR, shadow, shadowMat } = rig;
  const facing = fighter.facing;
  const t = fighter.animTime;

  let bob = 0;
  let armZ = REST_ARM_Z;
  let bodyLean = 0;
  let heightScale = 1;

  switch (fighter.state) {
    case 'idle':
      bob = Math.sin(t * 3.2) * 2;
      break;
    case 'walk':
      bob = Math.abs(Math.sin(t * 9)) * 3;
      break;
    case 'jump':
      break;
    case 'crouch':
      heightScale = 0.62;
      break;
    case 'block':
      armZ = BLOCK_ARM_Z;
      bodyLean = -0.05;
      break;
    case 'hitstun':
      bodyLean = -0.18;
      break;
    case 'blockstun':
      bodyLean = -0.1;
      armZ = BLOCK_ARM_Z;
      break;
    case 'defeated':
      bodyLean = 1.15;
      heightScale = 0.35;
      break;
    case 'victory':
      armZ = VICTORY_ARM_Z;
      bob = Math.abs(Math.sin(t * 4)) * 4;
      break;
    default:
      break;
  }

  let attackReach = 0;
  if (fighter.state === 'attack' && fighter.attackDef) {
    const def = fighter.attackDef;
    if (fighter.attackPhase === 'startup') attackReach = -0.3 * (1 - fighter.attackTimer / def.startup);
    else if (fighter.attackPhase === 'active') attackReach = 1;
    else attackReach = 1 - fighter.attackTimer / def.recovery;
  }
  const clamped = Math.max(0, Math.min(1, attackReach));
  if (fighter.state === 'attack') {
    armZ = REST_ARM_Z + (ATTACK_ARM_Z - REST_ARM_Z) * clamped;
  }

  group.position.set(fighter.x, -(fighter.y - bob), 0);
  group.rotation.y = facing === 1 ? 0 : Math.PI;
  group.rotation.z = -bodyLean;
  group.scale.y = heightScale;

  upperArmR.rotation.set(restRotR.x, restRotR.y, restRotR.z + armZ);
  upperArmL.rotation.set(restRotL.x, restRotL.y, restRotL.z - REST_ARM_Z);

  const attacking = fighter.state === 'attack' && fighter.attackPhase === 'active';

  const airborne = Math.max(0, WORLD.floorY - fighter.y);
  const shadowScale = Math.max(0.15, 1 - airborne / 220);
  shadow.scale.set(rig.dims.w * 0.5 * shadowScale, rig.dims.w * 0.32 * shadowScale, 1);
  shadow.position.y = fighter.y - WORLD.floorY + 0.5;
  shadowMat.opacity = 0.35 * shadowScale;

  const blink = fighter.state === 'hitstun' && Math.floor(t * 30) % 2 === 0;
  const opacity = blink ? 0.45 : 1;
  for (const mat of rig.allMaterials) {
    mat.transparent = blink;
    mat.opacity = opacity;
    if (!mat.emissive) continue;
    if (fighter.invincible) {
      mat.emissive.set(fighter.color.accent);
      mat.emissiveIntensity = 0.55;
    } else if (attacking) {
      mat.emissive.set(fighter.color.accent);
      mat.emissiveIntensity = 0.5;
    } else {
      mat.emissiveIntensity = 0;
    }
  }
}

export function disposeSkeletalRig(rig) {
  for (const mat of rig.allMaterials) mat.dispose();
  rig.shadowMat.dispose();
}
