import { useState, useEffect, useCallback , useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, FlatList, Modal, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import * as Icons from "lucide-react-native";
import * as Application from "expo-application";
import { useAuth } from "@/src/contexts/AuthContext";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { SUPPORTED_LANGUAGES } from "@/src/i18n";
import { useTranslation } from "react-i18next";
import { useInvoices } from "@/src/contexts/InvoicesContext";
import { restorePurchasesRC, isRevenueCatSupported } from "@/src/lib/revenuecat";
import { isPINEnabled } from "@/src/lib/pin";
import { exportBackup, importBackup, applyBackupSettings } from "@/src/lib/backup";
import { useTheme } from "@/src/contexts/ThemeContext";

const APP_VERSION = Application.nativeApplicationVersion || "1.0.0";
const APP_BUILD = Application.nativeBuildVersion || "—";

export default function Settings() {
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const { invoices, replaceAllInvoices } = useInvoices();
  const [restoring, setRestoring] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const isPro = !!user?.pro?.is_pro;
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();
  const [showLang, setShowLang] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);

  useFocusEffect(useCallback(() => {
    isPINEnabled().then(setPinEnabled);
  }, []));

  const proLabel = (() => {
    const p = user?.pro?.plan;
    if (p === "lifetime") return t("paywall.once");
    if (p === "trialing") return t("paywall.trialBanner", {hours: 0});
    if (p === "expired") return "Expiré";
    return t("home.upgrade");
  })();

  const onRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      if (isRevenueCatSupported()) await restorePurchasesRC();
      await refreshUser();
    } finally {
      setRestoring(false);
    }
  };

  const onExport = async () => {
    if (!isPro) { router.push("/(app)/paywall"); return; }
    if (exporting) return;
    setExporting(true);
    try {
      await exportBackup(invoices);
    } finally {
      setExporting(false);
    }
  };

  const onImport = async () => {
    if (!isPro) { router.push("/(app)/paywall"); return; }
    if (importing) return;
    Alert.alert(t("settings.backup.importTitle"), "Cette action remplacera toutes vos cartes actuelles (y compris les photos) ainsi que votre code PIN. Continuer ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Continuer", style: "destructive",
        onPress: async () => {
          setImporting(true);
          try {
            const backup = await importBackup();
            if (!backup) return;

            // Remplace l'intégralité des cartes en une seule opération atomique
            // (les cartes de la sauvegarde conservent leurs id/dates d'origine)
            await replaceAllInvoices(backup.invoices || []);

            // Restaure le code PIN et la préférence biométrie
            await applyBackupSettings(backup);
            setPinEnabled(!!backup.pin?.enabled);

            Alert.alert("✅ Sauvegarde restaurée", "Vos cartes, photos et paramètres de sécurité ont été restaurés avec succès.");
          } finally {
            setImporting(false);
          }
        },
      },
    ]);
  };

  const onLogout = async () => {
    await logout();
    router.replace("/(auth)/sign-in");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icons.ChevronLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("settings.title")}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{(user?.name || "?").charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        {/* Dark mode */}
        <View style={[styles.row, { marginBottom: 10 }]}>
          <View style={[styles.rowIcon, { backgroundColor: isDark ? "#374151" : "#F3F4F6" }]}>
            <Icons.Moon color={theme.text} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{t("settings.darkMode")}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: "#E5E7EB", true: theme.accent }}
            thumbColor="#fff"
          />
        </View>

        <Text style={styles.section}>{t("settings.preferences").toUpperCase()}</Text>

        <TouchableOpacity onPress={() => router.push("/(app)/paywall")} style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}>
            <Icons.Crown color={theme.accent} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{t("settings.proPlan")}</Text>
            <Text style={styles.rowSub}>{proLabel}</Text>
          </View>
          <Icons.ChevronRight color={theme.textSubtle} size={18} />
        </TouchableOpacity>

        {/* Langue */}
        <TouchableOpacity onPress={() => setShowLang(true)} style={[styles.row, { marginTop: 10 }]}>
          <View style={styles.rowIcon}>
            <Icons.Languages color={theme.text} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{t("settings.language")}</Text>
            <Text style={styles.rowSub}>{t("langs." + lang)}</Text>
          </View>
          <Icons.ChevronRight color={theme.textSubtle} size={18} />
        </TouchableOpacity>

        {/* PIN */}
        {isPro ? (
          <TouchableOpacity onPress={() => router.push("/(app)/pin-setup")} style={[styles.row, { marginTop: 10 }]}>
            <View style={[styles.rowIcon, { backgroundColor: "#EFF6FF" }]}>
              <Icons.Lock color="#3B82F6" size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t("settings.pin")}</Text>
              <Text style={styles.rowSub}>{pinEnabled ? t("settings.pinEnabled") : t("common.disabled")}</Text>
            </View>
            <Icons.ChevronRight color={theme.textSubtle} size={18} />
          </TouchableOpacity>
        ) : null}

        <Text style={[styles.section, { marginTop: 24 }]}>{t("settings.backup.section")}</Text>

        <TouchableOpacity onPress={onExport} disabled={exporting} style={styles.row}>
          <View style={styles.rowIcon}>
            {exporting ? <ActivityIndicator size="small" color={theme.text} /> : <Icons.Download color={isPro ? theme.text : theme.textSubtle} size={18} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, !isPro && { color: theme.textMuted }]}>{t("settings.backup.exportTitle")}</Text>
            <Text style={styles.rowSub}>{isPro ? t("settings.backup.exportSub") : t("settings.backup.proRequired")}</Text>
          </View>
          {isPro ? <Icons.ChevronRight color={theme.textSubtle} size={18} /> : <Icons.Lock color={theme.textSubtle} size={16} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={onImport} disabled={importing} style={[styles.row, { marginTop: 10 }]}>
          <View style={styles.rowIcon}>
            {importing ? <ActivityIndicator size="small" color={theme.text} /> : <Icons.Upload color={isPro ? theme.text : theme.textSubtle} size={18} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, !isPro && { color: theme.textMuted }]}>{t("settings.backup.importTitle")}</Text>
            <Text style={styles.rowSub}>{isPro ? t("settings.backup.importSub") : t("settings.backup.proRequired")}</Text>
          </View>
          {isPro ? <Icons.ChevronRight color={theme.textSubtle} size={18} /> : <Icons.Lock color={theme.textSubtle} size={16} />}
        </TouchableOpacity>

        <Text style={[styles.section, { marginTop: 24 }]}>{t("legal.aboutSection")}</Text>
        <TouchableOpacity onPress={onRestore} style={[styles.row, { marginTop: 8 }]} disabled={restoring}>
          <View style={styles.rowIcon}><Icons.RotateCcw color={theme.text} size={18} /></View>
          <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{t("paywall.restore")}</Text></View>
          {restoring ? <ActivityIndicator size="small" color={theme.text} /> : <Icons.ChevronRight color={theme.textSubtle} size={18} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/(app)/privacy")} style={[styles.row, { marginTop: 10 }]}>
          <View style={styles.rowIcon}><Icons.Shield color={theme.text} size={18} /></View>
          <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{t("legal.privacyTitle")}</Text></View>
          <Icons.ChevronRight color={theme.textSubtle} size={18} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/(app)/terms")} style={[styles.row, { marginTop: 10 }]}>
          <View style={styles.rowIcon}><Icons.FileText color={theme.text} size={18} /></View>
          <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{t("legal.termsTitle")}</Text></View>
          <Icons.ChevronRight color={theme.textSubtle} size={18} />
        </TouchableOpacity>

        

        <TouchableOpacity onPress={onLogout} style={[styles.row, { marginTop: 20 }]}>
          <View style={[styles.rowIcon, { backgroundColor: "#FEE2E2" }]}>
            <Icons.LogOut color={theme.danger} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: theme.danger }]}>{t("settings.logout")}</Text>
          </View>
        </TouchableOpacity>



        <View style={styles.versionFooter}>
          <Icons.Info color={theme.textSubtle} size={13} strokeWidth={2} />
          <Text style={styles.versionText}>Version {APP_VERSION} ({APP_BUILD})</Text>
        </View>
      </ScrollView>
      <Modal visible={showLang} animationType="slide" onRequestClose={() => setShowLang(false)}>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowLang(false)} style={styles.headerBtn}>
              <Icons.X color={theme.text} size={22} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t("settings.language")}</Text>
            <View style={styles.headerBtn} />
          </View>
          <FlatList
            data={SUPPORTED_LANGUAGES as any}
            keyExtractor={(l) => l}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={async () => { await setLang(item as string); setShowLang(false); }}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12 }}
              >
                <Text style={{ fontWeight: "800", color: theme.text, width: 40 }}>{item.toUpperCase()}</Text>
                <Text style={{ color: theme.textMuted, flex: 1 }}>{t("langs." + item)}</Text>
                {lang === item ? <Icons.Check color={theme.accent} size={18} strokeWidth={3} /> : null}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.border },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: theme.text },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 20, backgroundColor: theme.cardBg, borderRadius: 20, marginBottom: 24 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#374151", alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontSize: 20, fontWeight: "800" },
  name: { color: "#fff", fontSize: 18, fontWeight: "800" },
  email: { color: "#9CA3AF", fontSize: 13, marginTop: 2 },
  section: { fontSize: 11, color: theme.textMuted, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.surfaceAlt, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15, color: theme.text, fontWeight: "700" },
  rowSub: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  versionFooter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 24, paddingVertical: 8 },
  versionText: { fontSize: 12, color: theme.textSubtle, fontWeight: "600" },
});
}
