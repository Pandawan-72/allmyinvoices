import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useInvoices } from "@/src/contexts/InvoicesContext";
import { useTheme } from "@/src/contexts/ThemeContext";
import { DEFAULT_CATEGORIES, findCategory } from "@/src/data/categories";

const { width } = Dimensions.get("window");

export default function StatsScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { t } = useTranslation();
  const { invoices } = useInvoices();

  const stats = useMemo(() => {
    const totalSpent = invoices.reduce((sum, i) => sum + (i.price || 0), 0);
    const totalCount = invoices.length;

    const byCategory = DEFAULT_CATEGORIES.map((cat) => {
      const catInvoices = invoices.filter((i) => i.categoryId === cat.id);
      const total = catInvoices.reduce((sum, i) => sum + (i.price || 0), 0);
      return { cat, total, count: catInvoices.length, pct: totalSpent > 0 ? (total / totalSpent) * 100 : 0 };
    }).filter((s) => s.count > 0).sort((a, b) => b.total - a.total);

    const thisYear = new Date().getFullYear();
    const thisMonth = new Date().getMonth();

    const spentThisYear = invoices
      .filter((i) => i.purchaseDate && new Date(i.purchaseDate.split("/").reverse().join("-")).getFullYear() === thisYear)
      .reduce((sum, i) => sum + (i.price || 0), 0);

    const spentThisMonth = invoices
      .filter((i) => {
        if (!i.purchaseDate) return false;
        const d = new Date(i.purchaseDate.split("/").reverse().join("-"));
        return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
      })
      .reduce((sum, i) => sum + (i.price || 0), 0);

    const warrantiesExpiringSoon = invoices.filter((i) => {
      if (!i.warrantyEnd) return false;
      const end = new Date(i.warrantyEnd.split("/").reverse().join("-"));
      const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= 30;
    });

    const mostExpensive = [...invoices].sort((a, b) => (b.price || 0) - (a.price || 0)).slice(0, 3);

    return { totalSpent, totalCount, byCategory, spentThisYear, spentThisMonth, warrantiesExpiringSoon, mostExpensive };
  }, [invoices]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icons.ChevronLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistiques</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Résumé */}
        <View style={styles.row}>
          <View style={[styles.statCard, { backgroundColor: theme.accent }]}>
            <Text style={styles.statCardLabel}>Total dépensé</Text>
            <Text style={styles.statCardValue}>{stats.totalSpent.toFixed(0)} €</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#8B5CF6" }]}>
            <Text style={styles.statCardLabel}>Achats</Text>
            <Text style={styles.statCardValue}>{stats.totalCount}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.statCard, { backgroundColor: "#F59E0B" }]}>
            <Text style={styles.statCardLabel}>Ce mois</Text>
            <Text style={styles.statCardValue}>{stats.spentThisMonth.toFixed(0)} €</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#3B82F6" }]}>
            <Text style={styles.statCardLabel}>Cette année</Text>
            <Text style={styles.statCardValue}>{stats.spentThisYear.toFixed(0)} €</Text>
          </View>
        </View>

        {/* Garanties expirantes */}
        {stats.warrantiesExpiringSoon.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icons.ShieldAlert color="#F59E0B" size={18} />
              <Text style={styles.sectionTitle}>Garanties expirantes (30j)</Text>
            </View>
            {stats.warrantiesExpiringSoon.map((inv) => {
              const end = new Date(inv.warrantyEnd!.split("/").reverse().join("-"));
              const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <TouchableOpacity key={inv.id} style={styles.warrantyRow}
                  onPress={() => router.push({ pathname: "/(app)/display", params: { id: inv.id } })}>
                  <Text style={styles.warrantyName} numberOfLines={1}>{inv.name}</Text>
                  <Text style={[styles.warrantyDays, { color: daysLeft <= 7 ? theme.danger : "#F59E0B" }]}>{daysLeft}j</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* Par catégorie */}
        {stats.byCategory.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icons.PieChart color={theme.accent} size={18} />
              <Text style={styles.sectionTitle}>Par catégorie</Text>
            </View>
            {stats.byCategory.map(({ cat, total, count, pct }) => {
              const CatIcon = (Icons as any)[cat.icon] || Icons.Package;
              return (
                <View key={cat.id} style={styles.catRow}>
                  <View style={[styles.catIcon, { backgroundColor: cat.color + "20" }]}>
                    <CatIcon color={cat.color} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={styles.catName}>{t("categories." + cat.label)}</Text>
                      <Text style={styles.catAmount}>{total.toFixed(0)} € · {count}</Text>
                    </View>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Top 3 achats */}
        {stats.mostExpensive.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icons.Trophy color="#F59E0B" size={18} />
              <Text style={styles.sectionTitle}>Top achats</Text>
            </View>
            {stats.mostExpensive.map((inv, idx) => (
              <TouchableOpacity key={inv.id} style={styles.topRow}
                onPress={() => router.push({ pathname: "/(app)/display", params: { id: inv.id } })}>
                <Text style={styles.topRank}>#{idx + 1}</Text>
                <Text style={styles.topName} numberOfLines={1}>{inv.name}</Text>
                <Text style={styles.topPrice}>{(inv.price || 0).toFixed(0)} €</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
    headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 18, fontWeight: "900", color: theme.text },
    row: { flexDirection: "row", gap: 12, marginBottom: 12 },
    statCard: { flex: 1, borderRadius: 16, padding: 16 },
    statCardLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
    statCardValue: { fontSize: 26, fontWeight: "900", color: "#fff", marginTop: 4 },
    section: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontWeight: "800", color: theme.text },
    warrantyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
    warrantyName: { flex: 1, fontSize: 14, color: theme.text, fontWeight: "600" },
    warrantyDays: { fontSize: 13, fontWeight: "800" },
    catRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
    catIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    catName: { fontSize: 13, fontWeight: "600", color: theme.text },
    catAmount: { fontSize: 12, color: theme.textMuted },
    barBg: { height: 6, backgroundColor: theme.border, borderRadius: 3 },
    barFill: { height: 6, borderRadius: 3 },
    topRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
    topRank: { fontSize: 16, fontWeight: "900", color: theme.textMuted, width: 28 },
    topName: { flex: 1, fontSize: 14, fontWeight: "600", color: theme.text },
    topPrice: { fontSize: 15, fontWeight: "800", color: theme.accent },
  });
}
