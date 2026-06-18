import { useState , useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Modal } from "react-native";
import { useRouter } from "expo-router";
import * as Icons from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/src/contexts/AuthContext";
import { nativeGoogleSignIn } from "@/src/lib/googleAuth";
import { firebaseSendPasswordReset } from "@/src/lib/firebaseAuth";
import { useTheme } from "@/src/contexts/ThemeContext";

export default function SignIn() {
  const { theme, isDark } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { t } = useTranslation();
  const { login, loginWithGoogleIdToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const onLogin = async () => {
    if (!email || !password) { setError(t("auth.fillCreds")); return; }
    setLoading(true); setError(null);
    try {
      await login(email, password);
      router.replace("/(app)/home");
    } catch {
      setError(t("auth.fillCreds"));
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setGoogleLoading(true); setError(null);
    try {
      const idToken = await nativeGoogleSignIn();
      if (!idToken) return;
      await loginWithGoogleIdToken(idToken);
      router.replace("/(app)/home");
    } catch {
      setError(t("auth.googleFailed"));
    } finally {
      setGoogleLoading(false);
    }
  };

  const onResetPassword = async () => {
    if (!resetEmail) return;
    setResetLoading(true);
    setResetMsg(null);
    try {
      await firebaseSendPasswordReset(resetEmail);
      setResetMsg({ type: "success", text: t("auth.resetSuccess") });
    } catch {
      setResetMsg({ type: "error", text: t("auth.resetError") });
    } finally {
      setResetLoading(false);
    }
  };

  const openForgotPassword = () => {
    setResetEmail(email);
    setResetMsg(null);
    setShowForgot(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <Image source={isDark ? require("../../assets/images/logo-sombre.png") : require("../../assets/images/logo-allmycards.png")} style={{ width: 220, height: 55 }} resizeMode="contain" />
          <Text style={styles.tagline}>{t("auth.subtitle")}</Text>
        </View>

        <Text style={styles.title}>{t("auth.signIn")}</Text>

        <TextInput
          style={styles.input}
          placeholder={t("auth.email")}
          placeholderTextColor={theme.textSubtle}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder={t("auth.password")}
          placeholderTextColor={theme.textSubtle}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity onPress={openForgotPassword} style={styles.forgotLink}>
          <Text style={styles.forgotLinkText}>{t("auth.forgotPassword")}</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={onLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t("auth.signIn")}</Text>}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t("auth.or")}</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.googleBtn} onPress={onGoogle} disabled={googleLoading}>
          {googleLoading
            ? <ActivityIndicator color={theme.text} />
            : <>
                <Icons.Globe color={theme.text} size={20} />
                <Text style={styles.googleBtnText}>{t("auth.continueWithGoogle")}</Text>
              </>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")} style={styles.switchRow}>
          <Text style={styles.switchText}>{t("auth.noAccount")} </Text>
          <Text style={[styles.switchText, { color: theme.accent, fontWeight: "700" }]}>{t("auth.goSignUp")}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showForgot} transparent animationType="slide" onRequestClose={() => setShowForgot(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("auth.resetTitle")}</Text>
            <Text style={styles.modalDesc}>{t("auth.resetDesc")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("auth.email")}
              placeholderTextColor={theme.textSubtle}
              value={resetEmail}
              onChangeText={setResetEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {resetMsg ? (
              <Text style={resetMsg.type === "error" ? styles.error : styles.success}>{resetMsg.text}</Text>
            ) : null}
            <TouchableOpacity style={styles.btn} onPress={onResetPassword} disabled={resetLoading}>
              {resetLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t("auth.resetSend")}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowForgot(false)} style={{ alignItems: "center", marginTop: 12 }}>
              <Text style={{ color: theme.textMuted, fontWeight: "600" }}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: theme.bg, padding: 24, justifyContent: "center" },
  logoWrap: { alignItems: "center", marginBottom: 40 },
  tagline: { fontSize: 14, color: theme.textMuted, marginTop: 12, textAlign: "center" },
  title: { fontSize: 24, fontWeight: "900", color: theme.text, marginBottom: 24 },
  input: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 14, padding: 14, fontSize: 15, color: theme.text, marginBottom: 12,
  },
  error: { color: theme.danger, fontSize: 13, marginBottom: 12 },
  btn: { backgroundColor: theme.cardBg, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: { color: theme.textMuted, fontSize: 13 },
  googleBtn: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
  },
  googleBtnText: { color: theme.text, fontWeight: "700", fontSize: 15 },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  switchText: { fontSize: 14, color: theme.textMuted },
  forgotLink: { alignSelf: "flex-end", marginTop: -6, marginBottom: 12 },
  forgotLinkText: { color: theme.accent, fontSize: 13, fontWeight: "700" },
  success: { color: theme.accent, fontSize: 13, marginBottom: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalContent: { backgroundColor: theme.bg, borderRadius: 20, padding: 24, gap: 4 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: theme.text, marginBottom: 8 },
  modalDesc: { fontSize: 14, color: theme.textMuted, lineHeight: 20, marginBottom: 16 },
});
}
