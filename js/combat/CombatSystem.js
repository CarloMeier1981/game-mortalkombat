import { WORLD } from '../core/World.js';

function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function comboScale(comboCount) {
  return Math.max(0.35, 1 - 0.12 * comboCount);
}

const SOUND_FOR_TYPE = { light: 'light', heavy: 'heavy', special: 'special', grab: 'grab' };

export class CombatSystem {
  constructor(eventBus) {
    this.eventBus = eventBus || (() => {});
  }

  update(dt, fighters, projectiles) {
    const [fA, fB] = fighters;
    this._updateFacing(fA, fB);
    this._updateFacing(fB, fA);

    for (const f of fighters) {
      f.update(dt);
      const evs = f.drainEvents();
      for (const ev of evs) this._handleFighterEvent(f, ev, projectiles);
    }

    this._resolveMeleeHit(fA, fB);
    this._resolveMeleeHit(fB, fA);
    this._updateProjectiles(projectiles, fighters, dt);
  }

  _updateFacing(fighter, opponent) {
    if (fighter.facingLocked) return;
    if (['idle', 'walk', 'crouch', 'jump', 'block'].includes(fighter.state)) {
      fighter.facing = opponent.x >= fighter.x ? 1 : -1;
    }
  }

  _handleFighterEvent(fighter, ev, projectiles) {
    if (ev.type === 'spawnProjectile') {
      projectiles.push({ ...ev.data, alive: true });
      this.eventBus('special', { x: ev.data.x, y: ev.data.y, owner: fighter.playerIndex });
    } else if (ev.type === 'jump') {
      this.eventBus('jump', { x: fighter.x, y: fighter.y });
    } else if (ev.type === 'land') {
      this.eventBus('land', { x: fighter.x, y: fighter.y });
    } else if (ev.type === 'dash') {
      this.eventBus('dash', { x: fighter.x, y: fighter.y });
    }
  }

  _resolveMeleeHit(attacker, defender) {
    if (attacker.state !== 'attack' || attacker.attackPhase !== 'active') return;
    if (attacker.hasHitThisSwing) return;
    const hitbox = attacker.getHitbox();
    if (!hitbox) return;
    if (defender.invincible) return;
    const hurtbox = defender.getHurtbox();
    if (!rectsIntersect(hitbox, hurtbox)) return;

    attacker.hasHitThisSwing = true;
    const def = attacker.attackDef;
    const type = attacker.currentAttackType;
    const blocked = defender.state === 'block' && type !== 'grab';

    if (blocked) {
      defender.applyHit(def, true, attacker.x);
      attacker.gainSpecial(def.energyGain * 0.4);
      defender.gainSpecial(def.damage * 0.25);
      this.eventBus('block', { x: defender.x, y: defender.y - 80, attackType: type });
      return;
    }

    const hits = def.multiHit || 1;
    const perHit = def.damage / hits;
    let totalDealt = 0;
    for (let i = 0; i < hits; i++) {
      const scale = comboScale(attacker.comboCount);
      const dealt = Math.round(perHit * scale);
      totalDealt += dealt;
      attacker.registerComboHit(dealt);
    }
    defender.applyHit({ ...def, damage: totalDealt }, false, attacker.x);
    attacker.gainSpecial(def.energyGain);
    defender.gainSpecial(totalDealt * 0.15);

    this.eventBus('hit', {
      x: defender.x,
      y: defender.y - 90,
      attackType: type,
      damage: totalDealt,
      comboCount: attacker.comboCount,
      attackerIndex: attacker.playerIndex,
    });

    if (defender.health <= 0) {
      this.eventBus('ko', { loserIndex: defender.playerIndex, x: defender.x, y: defender.y - 90 });
    }
  }

  _updateProjectiles(projectiles, fighters, dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.vx * dt * 60;
      if (p.x < WORLD.left - 60 || p.x > WORLD.right + 60) {
        projectiles.splice(i, 1);
        continue;
      }
      const defender = fighters.find((f) => f.playerIndex !== p.owner);
      if (!defender || defender.invincible) continue;
      const box = { x: p.x - p.width / 2, y: p.y - p.height / 2, w: p.width, h: p.height };
      if (rectsIntersect(box, defender.getHurtbox())) {
        const blocked = defender.state === 'block';
        if (blocked) {
          defender.applyHit(p, true, p.x);
          defender.gainSpecial(p.damage * 0.25);
          this.eventBus('block', { x: defender.x, y: defender.y - 80, attackType: 'special' });
        } else {
          const attacker = fighters.find((f) => f.playerIndex === p.owner);
          const scale = attacker ? comboScale(attacker.comboCount) : 1;
          const dealt = Math.round(p.damage * scale);
          defender.applyHit({ ...p, damage: dealt }, false, p.x);
          if (attacker) attacker.registerComboHit(dealt);
          defender.gainSpecial(dealt * 0.15);
          this.eventBus('hit', { x: defender.x, y: defender.y - 90, attackType: 'special', damage: dealt, comboCount: attacker ? attacker.comboCount : 1, attackerIndex: p.owner });
          if (defender.health <= 0) {
            this.eventBus('ko', { loserIndex: defender.playerIndex, x: defender.x, y: defender.y - 90 });
          }
        }
        projectiles.splice(i, 1);
      }
    }
  }
}
