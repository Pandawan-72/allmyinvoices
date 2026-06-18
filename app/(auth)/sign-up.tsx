import { useState , useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme } from "@/src/contexts/ThemeContext";

export default function SignUp() {
  const { theme, isDark } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { t } = useTranslation();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRegister = async () => {
    if (!name || !email || !password) { setError(t("auth.fillAll")); return; }
    if (password.length < 6) { setError(t("auth.pwdMin")); return; }
    setLoading(true); setError(null);
    try {
      await register(name, email, password);
      router.replace("/(app)/home");
    } catch (e: any) {
      if (e?.code === "auth/email-already-in-use") {
        setError(t("auth.emailInUse"));
      } else {
        setError(t("auth.fillAll"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <Image source={isDark ? require("../../assets/images/logo-sombre.png") : require("../../assets/images/logo-allmycards.png")} style={{ width: 220, height: 55 }} resizeMode="contain" />
          <Text style={styles.tagline}>{t("auth.subtitle")}</Text>
        </View>

        <Text style={styles.title}>{t("auth.signUp")}</Text>

        <TextInput
          style={styles.input}
          placeholder={t("auth.name")}
          placeholderTextColor={theme.textSubtle}
          value={name}
          onChangeText={setName}
        />
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={onRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t("auth.signUp")}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")} style={styles.switchRow}>
          <Text style={styles.switchText}>{t("auth.haveAccount")} </Text>
          <Text style={[styles.switchText, { color: theme.accent, fontWeight: "700" }]}>{t("auth.goSignIn")}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  switchText: { fontSize: 14, color: theme.textMuted },
});
}
