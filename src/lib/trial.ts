// Gestion du trial 15 jours en local (sans backend).
// Au premier login, on enregistre l'heure de début.
// Le trial est actif tant que moins de 15 jours se sont écoulés.

import AsyncStorage from "@react-native-async-storage/async-storage";

const TRIAL_KEY = "amc.trial_start";
const TRIAL_DURATION_MS = 15 * 24 * 60 * 60 * 1000; // 15 jours
const TRIAL_WARNING_DAY = 13; // Rappel au 13ème jour (2 jours avant la fin)

// Démarre le trial si ce n'est pas déjà fait (appelé au login)
export async function startTrialIfNeeded(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(TRIAL_KEY);
    if (!existing) {
      await AsyncStorage.setItem(TRIAL_KEY, String(Date.now()));
    }
  } catch (e) {
    console.warn("[trial] startTrialIfNeeded failed", e);
  }
}

// Retourne le timestamp de début du trial, ou null si pas encore démarré
export async function getTrialStart(): Promise<number | null> {
  try {
    const val = await AsyncStorage.getItem(TRIAL_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

// Retourne true si le trial est encore actif
export async function isTrialActive(): Promise<boolean> {
  const start = await getTrialStart();
  if (!start) return false;
  return Date.now() - start < TRIAL_DURATION_MS;
}

// Retourne les heures restantes du trial (0 si expiré)
export async function getTrialHoursLeft(): Promise<number> {
  const start = await getTrialStart();
  if (!start) return 0;
  const elapsed = Date.now() - start;
  const remaining = TRIAL_DURATION_MS - elapsed;
  return Math.max(0, Math.ceil(remaining / 3600000));
}

// Retourne true si le trial a été utilisé (même expiré)
export async function hasUsedTrial(): Promise<boolean> {
  const start = await getTrialStart();
  return start !== null;
}

// Retourne true si on est au jour 13 (2 jours avant la fin)
export async function isTrialEndingSoon(): Promise<boolean> {
  const start = await getTrialStart();
  if (!start) return false;
  const daysElapsed = (Date.now() - start) / (24 * 60 * 60 * 1000);
  return daysElapsed >= TRIAL_WARNING_DAY && daysElapsed < 15;
}
