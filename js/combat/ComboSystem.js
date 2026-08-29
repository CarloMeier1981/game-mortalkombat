export const ComboSystem = {
  getDisplay(fighter) {
    return {
      active: fighter.comboCount > 1 && fighter.comboTimer > 0,
      count: fighter.comboCount,
      damage: Math.round(fighter.comboDamage),
    };
  },
};
