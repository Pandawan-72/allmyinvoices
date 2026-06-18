import React, { useState, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, Dimensions, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useInvoices, Invoice } from "@/src/contexts/InvoicesContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme } from "@/src/contexts/ThemeContext";
import { findCategory } from "@/src/data/categories";

const { width } = Dimensions.get("window");
const FREE_INVOICE_LIMIT = 10;

function WarrantyBadge({ invoice, theme }: { invoice: Invoice; theme: any }) {
  if (!invoice.warrantyEnd) return null;
  const end = new Date(invoice.warrantyEnd);
  const now = new Date();
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return (
    <View style={{ backgroundColor: "#FEE2E2", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10, color: "#EF4444", fontWeight: "700" }}>Expiré</Text>
    </View>
  );
  if (daysLeft <= 30) return (
    <View style={{ backgroundColor: "#FEF3C7", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10, color: "#F59E0B", fontWeight: "700" }}>{daysLeft}j</Text>
    </View>
  );
  return (
    <View style={{ backgroundColor: "#D1FAE5", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10, color: "#10B981", fontWeight: "700" }}>✓</Text>
    </View>
  );
}

function InvoiceItem({ invoice, onPress }: { invoice: Invoice; onPress: () => void }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const cat = findCategory(invoice.categoryId);
  const CatIcon = (Icons as any)[cat.icon] || Icons.Package;

  return (
    <TouchableOpacity style={styles.invoiceItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.invoiceIcon, { backgroundColor: cat.color + "20" }]}>
        <CatIcon color={cat.color} size={22} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.invoiceName} numberOfLines={1}>{invoice.name}</Text>
        <Text style={styles.invoiceSub} numberOfLines={1}>
          {invoice.store ? invoice.store : invoice.brand || ""}
          {invoice.purchaseDate ? ` · ${invoice.purchaseDate}` : ""}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        {invoice.price != null ? (
          <Text style={styles.invoicePrice}>{invoice.price.toFixed(2)} €</Text>
        ) : null}
        <WarrantyBadge invoice={invoice} theme={theme} />
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { t } = useTranslation();
  const { invoices } = useInvoices();
  const { user } = useAuth();
  const isPro = !!user?.pro?.is_pro;

  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = [...invoices];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.brand?.toLowerCase().includes(q) ||
        i.store?.toLowerCase().includes(q)
      );
    }
    if (selectedCat) result = result.filter((i) => i.categoryId === selectedCat);
    return result;
  }, [invoices, search, selectedCat]);

  const totalSpent = useMemo(() =>
    invoices.reduce((sum, i) => sum + (i.price || 0), 0), [invoices]
  );

  const onAdd = () => {
    if (!isPro && invoices.length >= FREE_INVOICE_LIMIT) {
      router.push("/(app)/paywall");
      return;
    }
    router.push("/(app)/invoice");
  };

  const categories = [
    { id: "electronics", icon: "Smartphone", color: "#3B82F6" },
    { id: "home", icon: "Home", color: "#10B981" },
    { id: "vehicle", icon: "Car", color: "#F59E0B" },
    { id: "clothing", icon: "Shirt", color: "#EC4899" },
    { id: "leisure", icon: "Gamepad2", color: "#8B5CF6" },
    { id: "health", icon: "Heart", color: "#EF4444" },
    { id: "other", icon: "Package", color: "#6B7280" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("home.title")}</Text>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <TouchableOpacity onPress={() => router.push("/(app)/stats")} style={styles.headerBtn}>
            <Icons.BarChart2 color={theme.text} size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(app)/settings")} style={styles.headerBtn}>
            <Icons.Settings color={theme.text} size={22} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        removeClippedSubviews={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            {/* Stats */}
            <View style={styles.statsCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statsLabel}>{t("home.totalSpent")}</Text>
                <Text style={styles.statsValue}>{totalSpent.toFixed(2)} €</Text>
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={styles.statsLabel}>{t("home.title")}</Text>
                <Text style={styles.statsValue}>{invoices.length}</Text>
              </View>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <Icons.Search color={theme.textSubtle} size={16} />
              <TextInput
                style={styles.searchInput}
                placeholder={t("home.search")}
                placeholderTextColor={theme.textSubtle}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Icons.X color={theme.textSubtle} size={16} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Category filters */}
            <View style={styles.catRow}>
              <TouchableOpacity
                style={[styles.catChip, !selectedCat && { backgroundColor: theme.accent }]}
                onPress={() => setSelectedCat(null)}>
                <Text style={[styles.catChipText, !selectedCat && { color: "#fff" }]}>{t("common.all")}</Text>
              </TouchableOpacity>
              {categories.map((cat) => {
                const CatIcon = (Icons as any)[cat.icon] || Icons.Package;
                const isActive = selectedCat === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catChip, isActive && { backgroundColor: cat.color }]}
                    onPress={() => setSelectedCat(isActive ? null : cat.id)}>
                    <CatIcon color={isActive ? "#fff" : theme.textMuted} size={14} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icons.Receipt color={theme.textSubtle} size={48} />
            <Text style={styles.emptyTitle}>{t("home.empty")}</Text>
            <Text style={styles.emptySub}>{t("home.emptyDesc")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <InvoiceItem
            invoice={item}
            onPress={() => router.push({ pathname: "/(app)/display", params: { id: item.id } })}
          />
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={onAdd}>
        <Icons.Plus color="#fff" size={28} strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
    headerTitle: { fontSize: 24, fontWeight: "900", color: theme.text },
    headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    statsCard: { flexDirection: "row", backgroundColor: theme.accent, borderRadius: 20, padding: 20, marginBottom: 16, marginTop: 4 },
    statsLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
    statsValue: { fontSize: 24, fontWeight: "900", color: "#fff", marginTop: 2 },
    searchRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
    searchInput: { flex: 1, fontSize: 15, color: theme.text },
    catRow: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
    catChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, flexDirection: "row", alignItems: "center", gap: 4 },
    catChipText: { fontSize: 12, fontWeight: "600", color: theme.textMuted },
    invoiceItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
    invoiceIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    invoiceName: { fontSize: 15, fontWeight: "700", color: theme.text },
    invoiceSub: { fontSize: 12, color: theme.textMuted },
    invoicePrice: { fontSize: 14, fontWeight: "800", color: theme.text },
    empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: theme.text },
    emptySub: { fontSize: 14, color: theme.textMuted, textAlign: "center" },
    fab: { position: "absolute", right: 20, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  });
}
