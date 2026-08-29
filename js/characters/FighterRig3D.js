import * as THREE from 'three';
import { WORLD } from '../core/World.js';

const CAPSULE_GEO = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
const SPHERE_GEO = new THREE.SphereGeometry(0.5, 16, 12);
const SHADOW_GEO = new THREE.CircleGeometry(1, 24);

function makeMaterial(hex) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55, metalness: 0.12 });
}

export function createShadowDisc(w) {
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
  const shadow = new THREE.Mesh(SHADOW_GEO, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(w * 0.5, w * 0.32, 1);
  return { shadow, shadowMat };
}

export function buildFighterRig(charData) {
  const { build, color } = charData;
  const w = build.width;
  const h = build.height;
  const headR = build.headR;

  const matPrimary = makeMaterial(color.primary);
  const matSecondary = makeMaterial(color.secondary);
  const matAccent = makeMaterial(color.accent);

  const group = new THREE.Group();

  const legH = h * 0.42;
  const torsoH = h * 0.42;
  const legW = w * 0.24;
  const armLen = h * 0.36;
  const armW = w * 0.2;

  // CapsuleGeometry(0.5, 1, ...) has a local height of 2 (1 cylinder + 2*0.5 cap radius)
  // and a local diameter of 1, so height scale must be halved to get the true world height.
  const legLPivot = new THREE.Group();
  const legL = new THREE.Mesh(CAPSULE_GEO, matSecondary);
  legL.scale.set(legW, legH / 2, legW);
  legL.position.set(0, legH / 2, 0);
  legLPivot.add(legL);
  group.add(legLPivot);

  const legRPivot = new THREE.Group();
  const legR = new THREE.Mesh(CAPSULE_GEO, matSecondary);
  legR.scale.set(legW, legH / 2, legW);
  legR.position.set(0, legH / 2, 0);
  legRPivot.add(legR);
  group.add(legRPivot);

  const torso = new THREE.Mesh(CAPSULE_GEO, matPrimary);
  torso.scale.set(w * 0.54, torsoH / 2, w * 0.42);
  torso.position.set(0, legH + torsoH / 2, 0);
  group.add(torso);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), matAccent);
  chest.scale.set(w * 0.18, torsoH * 0.4, w * 0.08);
  chest.position.set(0, legH + torsoH * 0.55, w * 0.22);
  group.add(chest);

  const shoulderY = legH + torsoH * 0.85;

  const armBackPivot = new THREE.Group();
  armBackPivot.position.set(-w * 0.44, shoulderY, -w * 0.1);
  const armBack = new THREE.Mesh(CAPSULE_GEO, matSecondary);
  armBack.scale.set(armW, (armLen * 0.8) / 2, armW);
  armBack.position.set(0, -(armLen * 0.8) / 2, 0);
  armBackPivot.add(armBack);
  group.add(armBackPivot);

  const armFrontPivot = new THREE.Group();
  armFrontPivot.position.set(w * 0.44, shoulderY, w * 0.14);
  const armFront = new THREE.Mesh(CAPSULE_GEO, matSecondary);
  armFront.scale.set(armW, (armLen * 0.8) / 2, armW);
  armFront.position.set(0, -(armLen * 0.8) / 2, 0);
  armFrontPivot.add(armFront);
  group.add(armFrontPivot);

  const head = new THREE.Mesh(SPHERE_GEO, matPrimary);
  head.scale.setScalar(headR * 2);
  head.position.set(2, legH + torsoH + headR * 0.7, 0);
  group.add(head);

  const eye = new THREE.Mesh(SPHERE_GEO, matAccent);
  eye.scale.setScalar(headR * 0.5);
  eye.position.set(headR * 0.95, legH + torsoH + headR * 0.7, headR * 0.35);
  group.add(eye);

  const { shadow, shadowMat } = createShadowDisc(w);
  group.add(shadow);

  return {
    group,
    legLPivot,
    legRPivot,
    torso,
    chest,
    armBackPivot,
    armBack,
    armFrontPivot,
    armFront,
    head,
    eye,
    shadow,
    shadowMat,
    materials: { primary: matPrimary, secondary: matSecondary, accent: matAccent },
    allMaterials: [matPrimary, matSecondary, matAccent],
    dims: { w, h, headR, legH, torsoH, armLen },
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function poseRig(rig, fighter) {
  const { group, legLPivot, legRPivot, armBackPivot, armFrontPivot, armFront, head, eye, shadow, shadowMat, dims } = rig;
  const facing = fighter.facing;
  const t = fighter.animTime;

  let bob = 0;
  let legSpread = 0.15;
  let armAngle = 0.15;
  let bodyLean = 0;
  let heightScale = 1;

  switch (fighter.state) {
    case 'idle':
      bob = Math.sin(t * 3.2) * 2;
      break;
    case 'walk':
      bob = Math.abs(Math.sin(t * 9)) * 3;
      legSpread = 0.4 + Math.sin(t * 9) * 0.3;
      break;
    case 'jump':
      legSpread = 0.05;
      armAngle = 0.5;
      break;
    case 'crouch':
      heightScale = 0.62;
      armAngle = 0.3;
      break;
    case 'block':
      armAngle = -0.9;
      bodyLean = -0.05;
      break;
    case 'hitstun':
      bodyLean = -0.18;
      break;
    case 'blockstun':
      bodyLean = -0.1;
      armAngle = -0.7;
      break;
    case 'defeated':
      bodyLean = 1.15;
      heightScale = 0.35;
      break;
    case 'victory':
      armAngle = -1.4;
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

  group.position.set(fighter.x, -(fighter.y - bob), 0);
  group.rotation.y = facing === 1 ? 0 : Math.PI;
  group.rotation.z = -bodyLean;
  group.scale.y = heightScale;

  legLPivot.position.x = -dims.w * legSpread;
  legRPivot.position.x = dims.w * legSpread;

  armBackPivot.rotation.z = -(armAngle * 0.6);

  const frontAngle = fighter.state === 'attack' ? lerp(-0.4, 1.3, clamped) : armAngle;
  armFrontPivot.rotation.z = frontAngle;
  if (rig.stretchableArm !== false) {
    const reachLen = dims.armLen * 0.8 * (fighter.state === 'attack' ? 1 + clamped * 0.6 : 1);
    armFront.scale.y = reachLen / 2;
    armFront.position.y = -reachLen / 2;
  }
  const attacking = fighter.state === 'attack' && fighter.attackPhase === 'active';
  armFront.material = attacking ? rig.materials.accent : rig.materials.secondary;

  head.position.x = 2;
  eye.position.x = dims.headR * 0.95;

  const airborne = Math.max(0, WORLD.floorY - fighter.y);
  const shadowScale = Math.max(0.15, 1 - airborne / 220);
  shadow.scale.set(dims.w * 0.5 * shadowScale, dims.w * 0.32 * shadowScale, 1);
  shadow.position.y = fighter.y - WORLD.floorY + 0.5;
  shadowMat.opacity = 0.35 * shadowScale;

  const blink = fighter.state === 'hitstun' && Math.floor(t * 30) % 2 === 0;
  const opacity = blink ? 0.45 : 1;
  const transparent = blink;
  for (const mat of rig.allMaterials) {
    mat.transparent = transparent;
    mat.opacity = opacity;
    if (fighter.invincible) {
      mat.emissive.set(fighter.color.accent);
      mat.emissiveIntensity = 0.55;
    } else {
      mat.emissiveIntensity = 0;
    }
  }
}

export function disposeRig(rig) {
  rig.group.traverse((obj) => {
    if (obj.isMesh && obj.geometry && obj.geometry !== CAPSULE_GEO && obj.geometry !== SPHERE_GEO && obj.geometry !== SHADOW_GEO) {
      obj.geometry.dispose();
    }
  });
  for (const mat of rig.allMaterials) mat.dispose();
  rig.shadowMat.dispose();
}
