import * as THREE from 'three';
import { buildFighterRig, poseRig, disposeRig } from '../characters/FighterRig3D.js';
import { buildNinjaRig, disposeNinjaRig, isNinjaReady } from '../characters/NinjaRig3D.js';
import { buildSkeletalRig, disposeSkeletalRig, poseSkeletalRig, isSkeletalReady } from '../characters/SkeletalRig3D.js';

const RIG_KINDS = {
  // The ninja rig's named parts match the procedural rig's contract exactly, so it
  // reuses the same poseRig() pose logic — only skeletal (bone-driven) rigs need their own.
  ninja: { build: buildNinjaRig, dispose: disposeNinjaRig, pose: poseRig, ready: () => isNinjaReady() },
  skeletal: { build: buildSkeletalRig, dispose: disposeSkeletalRig, pose: poseSkeletalRig, ready: (charData) => isSkeletalReady(charData.model3d) },
};

export class Renderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4000);
    this.camera.position.set(0, 0, 1200);
    this.camera.lookAt(0, 0, 0);

    this.ambient = new THREE.AmbientLight(0x40424a, 1.0);
    this.scene.add(this.ambient);

    this.keyLight = new THREE.DirectionalLight(0xfff2e0, 1.15);
    this.keyLight.position.set(-260, 420, 620);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x6f8fff, 0.6);
    this.rimLight.position.set(320, 180, -420);
    this.scene.add(this.rimLight);

    this.rigsByFighter = new Map();
    this.activeGroups = [];
  }

  setArenaTint(accentHex) {
    this.rimLight.color.set(accentHex);
  }

  clearFighters() {
    for (const entry of this.rigsByFighter.values()) {
      this.scene.remove(entry.rig.group);
      entry.dispose(entry.rig);
    }
    this.rigsByFighter.clear();
    this.activeGroups = [];
  }

  _getRig(fighter) {
    const cached = this.rigsByFighter.get(fighter);
    if (cached) return cached;

    const kind = RIG_KINDS[fighter.charData.rigKind];
    if (kind && !kind.ready(fighter.charData)) {
      // Model still loading — render nothing for this fighter this frame rather
      // than caching a throwaway placeholder rig.
      return null;
    }

    const rig = kind ? kind.build(fighter.charData) : buildFighterRig(fighter.charData);
    const entry = { rig, dispose: kind ? kind.dispose : disposeRig, pose: kind ? kind.pose : poseRig };
    this.rigsByFighter.set(fighter, entry);
    this.scene.add(rig.group);
    this.activeGroups.push(rig.group);
    return entry;
  }

  resize(cw, ch, dpr, scale, offsetX, offsetY) {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(cw, ch, false);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    if (scale <= 0) return;
    this.camera.left = -offsetX / scale;
    this.camera.right = (cw - offsetX) / scale;
    this.camera.top = offsetY / scale;
    this.camera.bottom = (offsetY - ch) / scale;
    this.camera.updateProjectionMatrix();
  }

  renderFighters(fighters) {
    for (const f of fighters) {
      const entry = this._getRig(f);
      if (entry) entry.pose(entry.rig, f);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
