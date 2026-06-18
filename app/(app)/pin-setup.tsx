import { useState, useEffect , useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Vibration, Modal, TextInput, ActivityIndicator, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { setPIN, disablePIN, isPINEnabled, verifyPIN, isBiometricAvailable, isBiometricEnabled, setBiometricEnabled } from "@/src/lib/pin";
import { useInvoices } from "@/src/contexts/InvoicesContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { firebaseLogin } from "@/src/lib/firebaseAuth";
import { useTheme } from "@/src/contexts/ThemeContext";

type Step = "choice" | "verify_current" | "enter_new" | "confirm_new";

export default function PinSetup() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { t } = useTranslation();
  const { invoices } = useInvoices();
  const { user } = useAuth();
  const [pinEnabled, setPinEnabledState] = useState(false);
  const [biometricHwAvailable, setBiometricHwAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(true);
  const [step, setStep] = useState<Step>("choice");
  const [action, setAction] = useState<"change" | "disable" | "create">("create");
  const [firstPin, setFirstPin] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    isPINEnabled().then(setPinEnabledState);
    isBiometricAvailable().then(setBiometricHwAvailable);
    isBiometricEnabled().then(setBiometricEnabledState);
  }, []);

  const onToggleBiometric = async (value: boolean) => {
    setBiometricEnabledState(value);
    await setBiometricEnabled(value);
  };

  const reset = () => { setInput(""); setFirstPin(""); setError(false); setErrorMsg(""); };

  const onPress = async (digit: string) => {
    if (input.length >= 4) return;
    const newInput = input + digit;
    setInput(newInput);
    setError(false);
    setErrorMsg("");

    if (newInput.length === 4) {
      if (step === "verify_current") {
        const ok = await verifyPIN(newInput);
        if (ok) {
          if (action === "disable") {
            await disablePIN();
            // Désactiver la protection sur toutes les factures
            for (const invoice of invoices) {
              if (invoice.isProtected) {
                // La mise à jour sera gérée individuellement
              }
            }
            Alert.alert("PIN désactivé", "La protection par code PIN a été supprimée et toutes vos cartes sont maintenant accessibles.", [
              { text: "OK", onPress: () => router.back() }
            ]);
          } else {
            setTimeout(() => { reset(); setStep("enter_new"); }, 300);
          }
        } else {
          Vibration.vibrate(400);
          setError(true);
          setErrorMsg(t("settings.pinWrong"));
          setTimeout(() => { reset(); }, 800);
        }
      } else if (step === "enter_new") {
        setFirstPin(newInput);
        setTimeout(() => { setInput(""); setStep("confirm_new"); }, 300);
      } else if (step === "confirm_new") {
        if (newInput === firstPin) {
          await setPIN(newInput);
          Alert.alert("✅ Code PIN enregistré", "Votre code PIN a été mis à jour.", [
            { text: "OK", onPress: () => router.back() }
          ]);
        } else {
          Vibration.vibrate(400);
          setError(true);
          setErrorMsg(t("settings.pinMismatch"));
          setTimeout(() => { reset(); setStep("enter_new"); }, 900);
        }
      }
    }
  };

  const onDelete = () => { setInput(prev => prev.slice(0, -1)); setError(false); setErrorMsg(""); };

  const onForgotPin = async () => {
    if (!forgotPassword) return;
    setForgotLoading(true);
      console.log("DEBUG user_id:", user?.user_id, "email:", user?.email, "password:", forgotPassword, "DEV_PWD:", process.env.EXPO_PUBLIC_DEV_PASSWORD);
    try {
      const DEV_PWD = process.env.EXPO_PUBLIC_DEV_PASSWORD || "";
      if (user?.user_id === "dev_local_user") {
        if (forgotPassword !== DEV_PWD) throw new Error("wrong");
      } else {
        await firebaseLogin(user?.email || "", forgotPassword);
      }
      // Mot de passe correct — réinitialiser le PIN
      await disablePIN();
      for (const invoice of invoices) {
        // protection handled individually
      }
      setShowForgot(false);
      setForgotPassword("");
      setPinEnabledState(false);
      Alert.alert("PIN réinitialisé", "Votre code PIN a été supprimé. Vous pouvez en créer un nouveau.", [
        { text: "OK", onPress: () => { reset(); setStep("choice"); } }
      ]);
    } catch {
      Alert.alert("Erreur", "Mot de passe incorrect.");
    } finally {
      setForgotLoading(false);
    }
  };

  const dots = [0, 1, 2, 3];

  const getTitle = () => {
    if (step === "verify_current") return t("settings.pinCurrent");
    if (step === "enter_new") return "Nouveau code PIN";
    if (step === "confirm_new") return "Confirmer le nouveau PIN";
    return "Code PIN";
  };

  // Écran de choix
  if (step === "choice") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Icons.ChevronLeft color={theme.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("settings.pin")}</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.container}>
          <Icons.Lock color={theme.accent} size={48} strokeWidth={1.5} />
          <Text style={styles.title}>
            {pinEnabled ? "PIN activé 🔒" : "Protégez vos cartes"}
          </Text>
          <Text style={styles.subtitle}>
            {pinEnabled
              ? "Votre app est protégée par un code PIN."
              : "Définissez un code PIN à 4 chiffres pour sécuriser vos cartes sensibles."
            }
          </Text>

          {pinEnabled && biometricHwAvailable ? (
            <View style={styles.biometricRow}>
              <View style={styles.biometricIconWrap}>
                <Icons.Fingerprint color={theme.accent} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.biometricTitle}>{t("settings.biometric")}</Text>
                <Text style={styles.biometricSub}>{t("settings.biometricDesc")}</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={onToggleBiometric}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor="#fff"
              />
            </View>
          ) : null}

          {!pinEnabled ? (
            <TouchableOpacity style={styles.btn} onPress={() => { setAction("create"); setStep("enter_new"); }}>
              <Icons.Lock color="#fff" size={18} />
              <Text style={styles.btnText}>{t("settings.pinSet")}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.btn} onPress={() => { setAction("change"); setStep("verify_current"); }}>
                <Icons.RefreshCw color="#fff" size={18} />
                <Text style={styles.btnText}>{t("settings.pinChange")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnOutline} onPress={() => { setAction("disable"); setStep("verify_current"); }}>
                <Icons.LockOpen color={theme.danger} size={18} />
                <Text style={styles.btnOutlineText}>Supprimer le code PIN</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Écran de saisie PIN
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { reset(); setStep("choice"); }} style={styles.headerBtn}>
          <Icons.ChevronLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.container}>
        <View style={styles.dotsRow}>
          {dots.map((i) => (
            <View key={i} style={[styles.dot, input.length > i && styles.dotFilled, error && styles.dotError]} />
          ))}
        </View>
        <Text style={styles.errorText}>{errorMsg || " "}</Text>

        {step === "verify_current" ? (
          <TouchableOpacity onPress={() => setShowForgot(true)} style={{ marginTop: -8 }}>
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: "700", textDecorationLine: "underline" }}>Code PIN oublié ?</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.keypad}>
          {["1","2","3","4","5","6","7","8","9"].map((d) => (
            <TouchableOpacity key={d} style={styles.key} onPress={() => onPress(d)}>
              <Text style={styles.keyText}>{d}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.key} />
          <TouchableOpacity style={styles.key} onPress={() => onPress("0")}>
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.key} onPress={onDelete}>
            <Icons.Delete color={theme.text} size={24} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Modal PIN oublié */}
      <Modal visible={showForgot} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: theme.bg, borderRadius: 20, padding: 24, gap: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: theme.text }}>Code PIN oublié ?</Text>
            <Text style={{ fontSize: 14, color: theme.textMuted, lineHeight: 20 }}>
              Entrez votre mot de passe de connexion pour réinitialiser votre PIN. Toutes vos cartes protégées seront déverrouillées.
            </Text>
            <TextInput
              style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, fontSize: 15, color: theme.text }}
              placeholder="Mot de passe"
              placeholderTextColor={theme.textSubtle}
              value={forgotPassword}
              onChangeText={setForgotPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={{ backgroundColor: theme.cardBg, borderRadius: 14, padding: 16, alignItems: "center" }}
              onPress={onForgotPin}
              disabled={forgotLoading}
            >
              {forgotLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Réinitialiser le PIN</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowForgot(false); setForgotPassword(""); }} style={{ alignItems: "center" }}>
              <Text style={{ color: theme.textMuted, fontWeight: "600" }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: theme.text },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: "900", color: theme.text, textAlign: "center" },
  subtitle: { fontSize: 14, color: theme.textMuted, textAlign: "center", lineHeight: 20 },
  btn: { backgroundColor: theme.cardBg, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, width: "100%", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  btnOutline: { borderWidth: 1, borderColor: theme.danger, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, width: "100%", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10 },
  btnOutlineText: { color: theme.danger, fontWeight: "700", fontSize: 15 },
  biometricRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, width: "100%" },
  biometricIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.accentSoft, alignItems: "center", justifyContent: "center" },
  biometricTitle: { fontSize: 15, fontWeight: "700", color: theme.text },
  biometricSub: { fontSize: 12, color: theme.textMuted, marginTop: 2, lineHeight: 16 },
  dotsRow: { flexDirection: "row", gap: 20 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: theme.border },
  dotFilled: { backgroundColor: theme.accent, borderColor: theme.accent },
  dotError: { backgroundColor: theme.danger, borderColor: theme.danger },
  errorText: { fontSize: 13, color: theme.danger, fontWeight: "700", height: 20 },
  keypad: { flexDirection: "row", flexWrap: "wrap", width: 280, gap: 16, justifyContent: "center" },
  key: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
  keyText: { fontSize: 26, fontWeight: "700", color: theme.text },
});
}
