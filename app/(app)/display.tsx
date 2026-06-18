import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Icons from "lucide-react-native";
import * as Sharing from "expo-sharing";
import { useTranslation } from "react-i18next";
import { useInvoices } from "@/src/contexts/InvoicesContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme } from "@/src/contexts/ThemeContext";
import { findCategory } from "@/src/data/categories";

export default function DisplayScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { invoices, deleteInvoice } = useInvoices();
  const { user } = useAuth();

  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) { router.back(); return null; }

  const cat = findCategory(invoice.categoryId);
  const CatIcon = (Icons as any)[cat.icon] || Icons.Package;

  const warrantyStatus = () => {
    if (!invoice.warrantyEnd) return null;
    const end = new Date(invoice.warrantyEnd);
    const now = new Date();
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: t("invoice.warrantyExpired"), color: theme.danger, icon: "ShieldOff" };
    if (daysLeft <= 30) return { label: `${t("invoice.warrantyActive")} — ${daysLeft}j`, color: "#F59E0B", icon: "ShieldAlert" };
    return { label: `${t("invoice.warrantyActive")} — ${invoice.warrantyEnd}`, color: "#10B981", icon: "ShieldCheck" };
  };

  const warranty = warrantyStatus();

  const onDelete = () => {
    Alert.alert(t("common.delete"), t("invoice.deleteConfirm", { name: invoice.name }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: async () => {
        await deleteInvoice(invoice.id);
        router.back();
      }},
    ]);
  };

  const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => {
    const Icon = (Icons as any)[icon] || Icons.Info;
    return (
      <View style={styles.infoRow}>
        <Icon color={theme.textMuted} size={16} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icons.ChevronLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{invoice.name}</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: "/(app)/invoice", params: { id: invoice.id } })} style={styles.headerBtn}>
          <Icons.Pencil color={theme.accent} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: cat.color }]}>
          <CatIcon color="rgba(255,255,255,0.7)" size={32} />
          <Text style={styles.heroName}>{invoice.name}</Text>
          {invoice.brand ? <Text style={styles.heroBrand}>{invoice.brand}</Text> : null}
          {invoice.price != null ? <Text style={styles.heroPrice}>{invoice.price.toFixed(2)} €</Text> : null}
        </View>

        {/* Garantie badge */}
        {warranty ? (
          <View style={[styles.warrantyBadge, { backgroundColor: warranty.color + "20", borderColor: warranty.color }]}>
            {(() => { const WIcon = (Icons as any)[warranty.icon] || Icons.Shield; return <WIcon color={warranty.color} size={18} />; })()}
            <Text style={[styles.warrantyText, { color: warranty.color }]}>{warranty.label}</Text>
          </View>
        ) : null}

        {/* Infos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("invoice.purchaseDate").toUpperCase()}</Text>
          {invoice.purchaseDate ? <InfoRow icon="Calendar" label={t("invoice.purchaseDate")} value={invoice.purchaseDate} /> : null}
          {invoice.store ? <InfoRow icon="Store" label={t("invoice.store")} value={invoice.store} /> : null}
          {invoice.paymentMethod ? <InfoRow icon="CreditCard" label={t("invoice.paymentMethod")} value={t("paymentMethods." + invoice.paymentMethod)} /> : null}
          {invoice.serialNumber ? <InfoRow icon="Hash" label={t("invoice.serialNumber")} value={invoice.serialNumber} /> : null}
          {invoice.warrantyEnd ? <InfoRow icon="Shield" label={t("invoice.warrantyEnd")} value={invoice.warrantyEnd} /> : null}
        </View>

        {/* Notes */}
        {invoice.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("invoice.notes").toUpperCase()}</Text>
            <Text style={styles.notes}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* Photos */}
        {invoice.receiptImage || invoice.invoiceImage ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("invoice.receiptPhoto").toUpperCase()}</Text>
            {invoice.receiptImage ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.photoLabel}>{t("invoice.receiptPhoto")}</Text>
                <Image source={{ uri: invoice.receiptImage }} style={styles.photo} resizeMode="contain" />
              </View>
            ) : null}
            {invoice.invoiceImage ? (
              <View>
                <Text style={styles.photoLabel}>{t("invoice.invoicePhoto")}</Text>
                <Image source={{ uri: invoice.invoiceImage }} style={styles.photo} resizeMode="contain" />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* PDF */}
        {invoice.invoicePdf ? (
          <TouchableOpacity style={styles.pdfBtn} onPress={() => Sharing.shareAsync(invoice.invoicePdf!)}>
            <Icons.FileType color={theme.accent} size={20} />
            <Text style={styles.pdfBtnText}>{t("invoice.invoicePdf")}</Text>
            <Icons.ExternalLink color={theme.accent} size={16} />
          </TouchableOpacity>
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
    headerTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: theme.text, textAlign: "center" },
    hero: { borderRadius: 20, padding: 24, alignItems: "center", gap: 8, marginBottom: 16 },
    heroName: { color: "#fff", fontSize: 20, fontWeight: "900", textAlign: "center" },
    heroBrand: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
    heroPrice: { color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 4 },
    warrantyBadge: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 16 },
    warrantyText: { fontSize: 14, fontWeight: "700", flex: 1 },
    section: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
    sectionTitle: { fontSize: 11, fontWeight: "700", color: theme.textMuted, letterSpacing: 1.5, marginBottom: 12 },
    infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
    infoLabel: { fontSize: 11, color: theme.textMuted },
    infoValue: { fontSize: 15, fontWeight: "600", color: theme.text, marginTop: 2 },
    notes: { fontSize: 15, color: theme.text, lineHeight: 22 },
    photoLabel: { fontSize: 12, fontWeight: "600", color: theme.textMuted, marginBottom: 8 },
    photo: { width: "100%", height: 200, borderRadius: 12, backgroundColor: theme.surfaceAlt },
    pdfBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.accent, borderRadius: 14, padding: 16, marginBottom: 12 },
    pdfBtnText: { flex: 1, fontSize: 15, fontWeight: "600", color: theme.accent },
    deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: theme.danger, marginTop: 8 },
    deleteBtnText: { color: theme.danger, fontWeight: "700", fontSize: 15 },
  });
}
