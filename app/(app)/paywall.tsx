import { useEffect, useState , useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/src/contexts/AuthContext";
import { configureRC, fetchOfferingPackages, isRevenueCatSupported, purchaseRCPackage, restorePurchasesRC, RCPackageInfo } from "@/src/lib/revenuecat";
import { useTheme } from "@/src/contexts/ThemeContext";

const LIFETIME_PRICE = "5,99 €";

export default function Paywall() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [packages, setPackages] = useState<RCPackageInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isRevenueCatSupported() || !user?.user_id) return;
      await configureRC(user.user_id);
      const pkgs = await fetchOfferingPackages();
      if (!cancelled) setPackages(pkgs);
    })();
    return () => { cancelled = true; };
  }, [user?.user_id]);

  const onPurchase = async () => {
    setErr(null); setBusy(true);
    try {
      if (isRevenueCatSupported()) {
        const pkg = packages.find((p) => p.plan === "lifetime");
        if (!pkg) throw new Error("Offre non disponible.");
        const res = await purchaseRCPackage(pkg.rcPackage);
        if (res.userCancelled) return;
        await refreshUser();
        router.replace("/(app)/home");
      }
    } catch (e: any) {
      setErr(e?.message || "Erreur lors de l'achat.");
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setErr(null); setRestoring(true);
    try {
      if (isRevenueCatSupported()) await restorePurchasesRC();
      await refreshUser();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setRestoring(false);
    }
  };

  const isPro = !!user?.pro?.is_pro;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icons.X color={theme.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("paywall.title")}</Text>
        <TouchableOpacity onPress={onRestore} style={styles.headerBtn} disabled={restoring}>
          {restoring ? <ActivityIndicator size="small" color={theme.text} /> : <Icons.RotateCcw color={theme.text} size={20} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {isPro ? (
          <View style={styles.alreadyPro}>
            <Icons.Crown color={theme.accent} size={28} />
            <Text style={styles.alreadyProTitle}>{t("paywall.alreadyPro")}</Text>
          </View>
        ) : null}

        <Text style={styles.h1}>{t("paywall.title")}</Text>
        <Text style={styles.sub}>{t("paywall.subtitle")}</Text>

        <View style={styles.compareCard}>
          <View style={styles.compareCol}>
            <Text style={styles.compareTitle}>{t("paywall.free")}</Text>
            <View style={styles.compareRow}><Icons.Check color={theme.accent} size={16} /><Text style={styles.compareText}>{t("paywall.freeItems")}</Text></View>
            <View style={styles.compareRow}><Icons.Check color={theme.accent} size={16} /><Text style={styles.compareText}>{t("paywall.feature9")}</Text></View>
            <View style={styles.compareRow}><Icons.X color={theme.danger} size={16} /><Text style={[styles.compareText, { color: theme.textMuted }]}>{t("paywall.feature2")}</Text></View>
            <View style={styles.compareRow}><Icons.X color={theme.danger} size={16} /><Text style={[styles.compareText, { color: theme.textMuted }]}>{t("paywall.feature3")}</Text></View>
            <View style={styles.compareRow}><Icons.X color={theme.danger} size={16} /><Text style={[styles.compareText, { color: theme.textMuted }]}>{t("paywall.feature4")}</Text></View>
            <View style={styles.compareRow}><Icons.X color={theme.danger} size={16} /><Text style={[styles.compareText, { color: theme.textMuted }]}>{t("paywall.feature5")}</Text></View>
            <View style={styles.compareRow}><Icons.X color={theme.danger} size={16} /><Text style={[styles.compareText, { color: theme.textMuted }]}>{t("paywall.feature6")}</Text></View>
          </View>
          <View style={styles.compareDivider} />
          <View style={styles.compareCol}>
            <Text style={[styles.compareTitle, { color: theme.accent }]}>Pro ✨</Text>
            <View style={styles.compareRow}><Icons.Check color={theme.accent} size={16} /><Text style={styles.compareText}>{t("paywall.feature1")}</Text></View>
            <View style={styles.compareRow}><Icons.Check color={theme.accent} size={16} /><Text style={styles.compareText}>{t("paywall.feature9")}</Text></View>
            <View style={styles.compareRow}><Icons.Check color={theme.accent} size={16} /><Text style={styles.compareText}>{t("paywall.feature2")}</Text></View>
            <View style={styles.compareRow}><Icons.Check color={theme.accent} size={16} /><Text style={styles.compareText}>{t("paywall.feature3")}</Text></View>
            <View style={styles.compareRow}><Icons.Check color={theme.accent} size={16} /><Text style={styles.compareText}>{t("paywall.feature4")}</Text></View>
            <View style={styles.compareRow}><Icons.Check color={theme.accent} size={16} /><Text style={styles.compareText}>{t("paywall.feature5")}</Text></View>
            <View style={styles.compareRow}><Icons.Check color={theme.accent} size={16} /><Text style={styles.compareText}>{t("paywall.feature6")}</Text></View>
          </View>
        </View>

        <View style={styles.planCard}>
          <View style={styles.badge}><Text style={styles.badgeText}>{t("paywall.oneTime").toUpperCase()}</Text></View>
          <Text style={styles.planName}>All My Cards Pro</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 8 }}>
            <Text style={styles.planPrice}>{LIFETIME_PRICE}</Text>
            <Text style={styles.planUnit}>{t("paywall.once")}</Text>
          </View>
          <TouchableOpacity style={[styles.planBtn, busy && { opacity: 0.6 }]} onPress={onPurchase} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.planBtnText}>{t("paywall.buyLifetime")}</Text>}
          </TouchableOpacity>
        </View>

        {err ? <Text style={{ color: theme.danger, textAlign: "center", marginTop: 12 }}>{err}</Text> : null}

        <TouchableOpacity onPress={onRestore} disabled={restoring} style={{ marginTop: 14, alignSelf: "center" }}>
          <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: "700", textDecorationLine: "underline" }}>
            {t("paywall.restore")}
          </Text>
        </TouchableOpacity>
        <Text style={styles.note}>{t("paywall.once")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.border },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: theme.text },
  h1: { fontSize: 34, fontWeight: "900", color: theme.text, letterSpacing: -1, marginTop: 8 },
  sub: { fontSize: 16, color: theme.textMuted, marginTop: 6, marginBottom: 24 },
  alreadyPro: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.accentSoft, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: theme.accent },
  alreadyProTitle: { fontSize: 16, fontWeight: "800", color: theme.accent },
  compareCard: { flexDirection: "row", backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 20, marginBottom: 24, gap: 12 },
  compareCol: { flex: 1, gap: 10 },
  compareTitle: { fontSize: 14, fontWeight: "800", color: theme.text, marginBottom: 4 },
  compareRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  compareText: { fontSize: 13, color: theme.text },
  compareDivider: { width: 1, backgroundColor: theme.border },
  planCard: { backgroundColor: theme.cardBg, borderRadius: 20, padding: 24, position: "relative", overflow: "hidden" },
  badge: { position: "absolute", top: 0, left: 0, backgroundColor: theme.accent, paddingHorizontal: 12, paddingVertical: 4, borderBottomRightRadius: 12 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  planName: { color: "#fff", fontSize: 20, fontWeight: "900", marginTop: 16 },
  planPrice: { color: theme.accent, fontSize: 40, fontWeight: "900", letterSpacing: -1 },
  planUnit: { color: "#9CA3AF", fontSize: 13 },
  planBtn: { backgroundColor: theme.accent, borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 20 },
  planBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  note: { color: theme.textSubtle, fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 18 },
});
}
