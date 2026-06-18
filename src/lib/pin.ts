// pin.ts — Gestion du code PIN (Pro uniquement)
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";

const PIN_KEY = "amc2.pin";
const PIN_ENABLED_KEY = "amc2.pin.enabled";

// ─── Sauvegarde / lecture ───────────────────────────────────────────────────

export async function setPIN(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin);
  await SecureStore.setItemAsync(PIN_ENABLED_KEY, "true");
}

export async function getPIN(): Promise<string | null> {
  return await SecureStore.getItemAsync(PIN_KEY);
}

export async function isPINEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(PIN_ENABLED_KEY);
  return val === "true";
}

export async function disablePIN(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await SecureStore.setItemAsync(PIN_ENABLED_KEY, "false");
}

export async function verifyPIN(input: string): Promise<boolean> {
  const stored = await getPIN();
  return stored === input;
}

// ─── Biométrie ──────────────────────────────────────────────────────────────

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Déverrouillez All My Cards",
    fallbackLabel: "Utiliser le code PIN",
    cancelLabel: "Annuler",
    disableDeviceFallback: false,
  });
  return result.success;
}

// ─── Préférence utilisateur : biométrie activée à la place du PIN ──────────

const BIOMETRIC_ENABLED_KEY = "amc2.biometric.enabled";

// Par défaut activée (si le matériel est disponible) pour la meilleure UX :
// l'utilisateur peut la désactiver pour ne se fier qu'au code PIN.
export async function isBiometricEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return val !== "false";
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? "true" : "false");
}
