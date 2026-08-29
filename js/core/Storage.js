const SETTINGS_KEY = 'arenapulse_settings_v1';
const PROGRESS_KEY = 'arenapulse_progress_v1';

export const DEFAULT_SETTINGS = {
  musicVolume: 0.5,
  sfxVolume: 0.8,
  vibration: true,
  quality: 'high',
  language: 'de',
};

export const DEFAULT_PROGRESS = {
  unlocked: ['cassius', 'brannok', 'solkan'],
  arcadeBestStreak: 0,
  arcadeCleared: false,
};

function safeParse(raw, fallback) {
  if (!raw) return { ...fallback };
  try {
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch (e) {
    return { ...fallback };
  }
}

export const Storage = {
  loadSettings() {
    try {
      return safeParse(localStorage.getItem(SETTINGS_KEY), DEFAULT_SETTINGS);
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  },
  saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) { /* storage unavailable, ignore */ }
  },
  loadProgress() {
    try {
      return safeParse(localStorage.getItem(PROGRESS_KEY), DEFAULT_PROGRESS);
    } catch (e) {
      return { ...DEFAULT_PROGRESS };
    }
  },
  saveProgress(progress) {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) { /* storage unavailable, ignore */ }
  },
};
