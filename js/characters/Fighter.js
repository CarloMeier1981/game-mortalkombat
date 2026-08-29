import { WORLD } from '../core/World.js';

const MAX_SPECIAL = 100;
const DODGE_DURATION = 18;
const DODGE_INVULN = 12;
const DODGE_SPEED = 11;
const COMBO_WINDOW = 50;

export class Fighter {
  constructor(charData, playerIndex, x, facing) {
    this.charData = charData;
    this.id = charData.id;
    this.name = charData.name;
    this.color = charData.color;
    this.build = charData.build;
    this.attacksDef = charData.attacks;
    this.playerIndex = playerIndex;
    this.maxHealth = charData.health;
    this.maxSpecial = MAX_SPECIAL;
    this.events = [];
    this.reset(x, facing);
  }

  reset(x, facing) {
    this.x = x;
    this.y = WORLD.floorY;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.grounded = true;
    this.health = this.maxHealth;
    this.special = 0;
    this.state = 'idle';
    this.currentAttackType = null;
    this.attackDef = null;
    this.attackPhase = null;
    this.attackTimer = 0;
    this.hasHitThisSwing = false;
    this.hitstunTimer = 0;
    this.blockstunTimer = 0;
    this.dodgeTimer = 0;
    this.invincible = false;
    this.comboCount = 0;
    this.comboDamage = 0;
    this.comboTimer = 0;
    this.isBlocking = false;
    this.animTime = 0;
    this.facingLocked = false;
    this.events = [];
  }

  isAlive() {
    return this.health > 0;
  }

  canAct() {
    return (
      this.state !== 'hitstun' &&
      this.state !== 'blockstun' &&
      this.state !== 'dodge' &&
      this.state !== 'grabbed' &&
      this.state !== 'defeated' &&
      this.state !== 'victory' &&
      this.state !== 'attack'
    );
  }

  startAttack(type) {
    const def = this.attacksDef[type];
    if (!def) return;
    this.state = 'attack';
    this.currentAttackType = type;
    this.attackDef = def;
    this.attackPhase = 'startup';
    this.attackTimer = def.startup;
    this.hasHitThisSwing = false;
    this.vx = 0;
    this.facingLocked = true;
    if (type === 'special') this.special = 0;
    this.events.push({ type: 'attackStart', data: { attackType: type } });
  }

  handleInput(intent) {
    if (this.state === 'defeated' || this.state === 'victory') return;

    if (this.state === 'hitstun' || this.state === 'blockstun' || this.state === 'dodge' || this.state === 'grabbed' || this.state === 'attack') {
      // airborne drift still allowed while jumping-attacking? keep locked during active states.
      return;
    }

    this.isBlocking = false;

    if (intent.grabPressed && this.grounded) { this.startAttack('grab'); return; }
    if (intent.specialPressed && this.special >= this.maxSpecial) { this.startAttack('special'); return; }
    if (intent.heavyPressed) { this.startAttack('heavy'); return; }
    if (intent.lightPressed) { this.startAttack('light'); return; }

    if (intent.dodgePressed && this.grounded) {
      this.state = 'dodge';
      this.dodgeTimer = DODGE_DURATION;
      this.invincible = true;
      const dir = intent.left ? -1 : intent.right ? 1 : -this.facing;
      this.vx = dir * DODGE_SPEED;
      this.events.push({ type: 'dash', data: {} });
      return;
    }

    if (!this.grounded) {
      if (intent.left) this.vx = -this.charData.walkSpeed * 0.7;
      else if (intent.right) this.vx = this.charData.walkSpeed * 0.7;
      else this.vx *= 0.98;
      this.state = 'jump';
      return;
    }

    if (intent.block) {
      this.isBlocking = true;
      this.state = 'block';
      this.vx = 0;
      return;
    }

    if (intent.upPressed) {
      this.vy = this.charData.jumpPower;
      this.grounded = false;
      this.state = 'jump';
      this.events.push({ type: 'jump', data: {} });
      return;
    }

    if (intent.down) {
      this.state = 'crouch';
      this.vx = 0;
      return;
    }

    if (intent.left) {
      this.vx = -this.charData.walkSpeed;
      this.state = 'walk';
      return;
    }
    if (intent.right) {
      this.vx = this.charData.walkSpeed;
      this.state = 'walk';
      return;
    }

    this.vx = 0;
    this.state = 'idle';
  }

  update(dt) {
    this.animTime += dt;

    if (!this.grounded) {
      this.vy += WORLD.gravity;
    }
    this.y += this.vy;
    this.x += this.vx;

    if (this.y >= WORLD.floorY) {
      this.y = WORLD.floorY;
      this.vy = 0;
      if (!this.grounded) {
        this.grounded = true;
        this.events.push({ type: 'land', data: {} });
        if (this.state === 'jump') this.state = 'idle';
      }
    } else {
      this.grounded = false;
    }

    const halfW = this.build.width / 2;
    if (this.x < WORLD.left + halfW) this.x = WORLD.left + halfW;
    if (this.x > WORLD.right - halfW) this.x = WORLD.right - halfW;

    if (this.state === 'attack') {
      this.attackTimer -= 1;
      if (this.attackTimer <= 0) {
        if (this.attackPhase === 'startup') {
          this.attackPhase = 'active';
          this.attackTimer = this.attackDef.active;
          if (this.attackDef.projectile) {
            this.events.push({
              type: 'spawnProjectile',
              data: {
                x: this.x + this.facing * (this.build.width / 2 + 10),
                y: this.y - this.build.height * 0.55,
                vx: this.facing * this.attackDef.projectileSpeed,
                owner: this.playerIndex,
                damage: this.attackDef.damage,
                knockback: this.attackDef.knockback,
                hitstun: this.attackDef.hitstun,
                blockstun: this.attackDef.blockstun,
                width: this.attackDef.width,
                height: this.attackDef.height,
                color: this.color.accent,
              },
            });
          }
        } else if (this.attackPhase === 'active') {
          this.attackPhase = 'recovery';
          this.attackTimer = this.attackDef.recovery;
        } else {
          this.state = this.grounded ? 'idle' : 'jump';
          this.attackPhase = null;
          this.currentAttackType = null;
          this.attackDef = null;
          this.facingLocked = false;
        }
      }
    }

    if (this.state === 'hitstun') {
      this.hitstunTimer -= 1;
      this.vx *= 0.9;
      if (this.hitstunTimer <= 0) { this.state = this.grounded ? 'idle' : 'jump'; }
    }

    if (this.state === 'blockstun') {
      this.blockstunTimer -= 1;
      this.vx *= 0.85;
      if (this.blockstunTimer <= 0) { this.state = 'idle'; this.isBlocking = false; }
    }

    if (this.state === 'dodge') {
      this.dodgeTimer -= 1;
      this.vx *= 0.9;
      if (this.dodgeTimer <= DODGE_DURATION - DODGE_INVULN) this.invincible = false;
      if (this.dodgeTimer <= 0) { this.state = 'idle'; this.invincible = false; }
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= 1;
      if (this.comboTimer <= 0) { this.comboCount = 0; this.comboDamage = 0; }
    }

    if (this.health < 0) this.health = 0;
    if (this.special > this.maxSpecial) this.special = this.maxSpecial;
    if (this.special < 0) this.special = 0;
  }

  gainSpecial(amount) {
    if (this.state === 'defeated') return;
    this.special = Math.min(this.maxSpecial, this.special + amount);
  }

  registerComboHit(damage) {
    this.comboCount += 1;
    this.comboDamage += damage;
    this.comboTimer = COMBO_WINDOW;
  }

  applyHit({ damage, knockback, hitstun, blockstun }, blocked, attackerX) {
    const dir = attackerX <= this.x ? 1 : -1;
    if (blocked) {
      const chip = Math.max(1, Math.round(damage * 0.1));
      this.health -= chip;
      this.vx = dir * knockback * 0.35;
      this.state = 'blockstun';
      this.blockstunTimer = blockstun;
      return { chip, blocked: true };
    }
    this.health -= damage;
    this.vx = dir * knockback;
    if (this.state === 'attack') {
      this.attackPhase = null;
      this.currentAttackType = null;
      this.attackDef = null;
      this.facingLocked = false;
    }
    this.state = this.health <= 0 ? 'defeated' : 'hitstun';
    this.hitstunTimer = hitstun;
    this.isBlocking = false;
    if (this.health <= 0) this.health = 0;
    return { blocked: false };
  }

  getHurtboxHeight() {
    if (this.state === 'crouch') return this.build.height * 0.62;
    return this.build.height;
  }

  getHurtbox() {
    const h = this.getHurtboxHeight();
    return { x: this.x - this.build.width / 2, y: this.y - h, w: this.build.width, h };
  }

  getHitbox() {
    if (this.state !== 'attack' || this.attackPhase !== 'active' || !this.attackDef) return null;
    if (this.attackDef.projectile) return null;
    const def = this.attackDef;
    const y = this.y - this.build.height * 0.62 - def.height / 2;
    const x = this.facing === 1 ? this.x + this.build.width / 2 - 6 : this.x - this.build.width / 2 - def.width + 6;
    return { x, y, w: def.width, h: def.height };
  }

  drainEvents() {
    const evs = this.events;
    this.events = [];
    return evs;
  }
}
