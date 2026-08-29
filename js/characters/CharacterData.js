// Frame values are expressed in simulation ticks (fixed timestep, 60 ticks/sec).
// All characters, attacks and stats are original creations for ARENA PULSE.

export const CHARACTERS = [
  {
    id: 'cassius',
    name: 'CASSIUS',
    title: 'DER VERBANNTE HAUPTMANN',
    description: 'Ein disziplinierter Ex-Offizier, aus der Armee verbannt. Kämpft mit gepanzerten Fäusten und eiserner Deckung.',
    color: { primary: '#3a5a8c', secondary: '#1f2e42', accent: '#e0932e' },
    stats: { power: 7, speed: 5, defense: 8 },
    health: 1050,
    walkSpeed: 4.6,
    dashSpeed: 8.8,
    jumpPower: -17.5,
    build: { width: 70, height: 162, headR: 18 },
    specialName: 'LETZTER BEFEHL',
    specialDescription: 'Ein disziplinierter Sturmangriff, der jede gegnerische Deckung durchbricht.',
    model3d: 'models/cassius.glb',
    rigKind: 'skeletal',
    attacks: {
      light: { name: 'Gepanzerter Schlag', damage: 8, startup: 6, active: 3, recovery: 11, knockback: 3, hitstun: 11, blockstun: 7, energyGain: 8, range: 72, width: 54, height: 38 },
      heavy: { name: 'Rammstoß', damage: 19, startup: 12, active: 5, recovery: 21, knockback: 8, hitstun: 19, blockstun: 12, energyGain: 11, range: 84, width: 62, height: 46 },
      special: { name: 'Letzter Befehl', damage: 31, startup: 13, active: 7, recovery: 22, knockback: 11, hitstun: 24, blockstun: 15, energyGain: 0, range: 92, width: 76, height: 54 },
      grab: { name: 'Hauptmannsgriff', damage: 16, startup: 8, active: 3, recovery: 20, knockback: 15, hitstun: 22, blockstun: 0, energyGain: 9, range: 55, width: 44, height: 56 },
    },
  },
  {
    id: 'brannok',
    name: 'BRANNOK',
    title: 'DER EISERNE WÄCHTER',
    description: 'Ein wandelnder Rüstungsturm. Was ihm an Tempo fehlt, macht er mit roher Wucht und unerschütterlicher Deckung wett.',
    color: { primary: '#8c2a2a', secondary: '#2b1414', accent: '#e0a838' },
    stats: { power: 9, speed: 2, defense: 10 },
    health: 1300,
    walkSpeed: 3.0,
    dashSpeed: 6.2,
    jumpPower: -16.0,
    build: { width: 78, height: 172, headR: 20 },
    specialName: 'ERDBEBENSCHLAG',
    specialDescription: 'Ein gewaltiger Schlag auf den Boden, der die gesamte Arena erzittern lässt.',
    model3d: 'models/brannok.glb',
    rigKind: 'skeletal',
    attacks: {
      light: { name: 'Kettenfaust', damage: 9, startup: 8, active: 4, recovery: 14, knockback: 4, hitstun: 13, blockstun: 8, energyGain: 8, range: 76, width: 58, height: 42 },
      heavy: { name: 'Turmschlag', damage: 24, startup: 16, active: 6, recovery: 26, knockback: 11, hitstun: 22, blockstun: 13, energyGain: 13, range: 88, width: 68, height: 50 },
      special: { name: 'Erdbebenschlag', damage: 36, startup: 18, active: 8, recovery: 26, knockback: 15, hitstun: 28, blockstun: 17, energyGain: 0, range: 100, width: 90, height: 60 },
      grab: { name: 'Zermalmende Umarmung', damage: 21, startup: 9, active: 3, recovery: 23, knockback: 18, hitstun: 26, blockstun: 0, energyGain: 10, range: 58, width: 48, height: 60 },
    },
  },
  {
    id: 'solkan',
    name: 'SOLKAN',
    title: 'DER KNOCHENBOGEN',
    description: 'Ein untoter Bogenschütze, gebunden an die Arena durch einen uralten Fluch. Trifft aus der Distanz, bevor der Gegner ihn überhaupt sieht.',
    color: { primary: '#c9c2ab', secondary: '#4a4034', accent: '#7fd858' },
    stats: { power: 4, speed: 7, defense: 3 },
    health: 780,
    walkSpeed: 4.9,
    dashSpeed: 9.2,
    jumpPower: -17.6,
    build: { width: 62, height: 158, headR: 16 },
    specialName: 'KNOCHENPFEIL',
    specialDescription: 'Ein verfluchter Pfeil aus splitterndem Knochen, der über die gesamte Arena hinweg trifft.',
    model3d: 'models/solkan.glb',
    rigKind: 'skeletal',
    attacks: {
      light: { name: 'Knöcherner Stich', damage: 6, startup: 4, active: 3, recovery: 8, knockback: 2, hitstun: 9, blockstun: 6, energyGain: 7, range: 64, width: 46, height: 34 },
      heavy: { name: 'Knüppelschwung', damage: 15, startup: 9, active: 4, recovery: 17, knockback: 6, hitstun: 16, blockstun: 10, energyGain: 10, range: 76, width: 56, height: 40 },
      special: { name: 'Knochenpfeil', damage: 27, startup: 14, active: 6, recovery: 19, knockback: 9, hitstun: 22, blockstun: 13, energyGain: 0, range: 999, width: 34, height: 28, projectile: true, projectileSpeed: 15 },
      grab: { name: 'Klapperngriff', damage: 13, startup: 7, active: 3, recovery: 18, knockback: 13, hitstun: 21, blockstun: 0, energyGain: 8, range: 50, width: 38, height: 52 },
    },
  },
];

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}
