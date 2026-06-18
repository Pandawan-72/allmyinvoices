import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Icons from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTranslation } from "react-i18next";
import { useInvoices, Invoice, PaymentMethod } from "@/src/contexts/InvoicesContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme } from "@/src/contexts/ThemeContext";
import { findCategory, DEFAULT_CATEGORIES } from "@/src/data/categories";
import { isPINEnabled } from "@/src/lib/pin";

const PAYMENT_METHODS: PaymentMethod[] = ["card", "cash", "transfer", "check", "other"];

export default function InvoiceScreen() {
  const { theme, isDark } = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { invoices, addInvoice, updateInvoice, deleteInvoice } = useInvoices();
  const { user } = useAuth();
  const isPro = !!user?.pro?.is_pro;

  const existing = id ? invoices.find((i) => i.id === id) : null;

  const [name, setName] = useState(existing?.name || "");
  const [categoryId, setCategoryId] = useState(existing?.categoryId || "electronics");
  const [brand, setBrand] = useState(existing?.brand || "");
  const [price, setPrice] = useState(existing?.price != null ? String(existing.price) : "");
  const [purchaseDate, setPurchaseDate] = useState(existing?.purchaseDate || "");
  const [store, setStore] = useState(existing?.store || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(existing?.paymentMethod || null);
  const [warrantyMonths, setWarrantyMonths] = useState(existing?.warrantyMonths != null ? String(existing.warrantyMonths) : "");
  const [warrantyEnd, setWarrantyEnd] = useState(existing?.warrantyEnd || "");
  const [serialNumber, setSerialNumber] = useState(existing?.serialNumber || "");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [receiptImage, setReceiptImage] = useState(existing?.receiptImage || null);
  const [invoiceImage, setInvoiceImage] = useState(existing?.invoiceImage || null);
  const [invoicePdf, setInvoicePdf] = useState(existing?.invoicePdf || null);
  const [isProtected, setIsProtected] = useState(existing?.isProtected || false);
  const [pinDefined, setPinDefined] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  useEffect(() => {
    isPINEnabled().then(setPinDefined);
  }, []);

  // Calcul automatique de la fin de garantie
  useEffect(() => {
    if (purchaseDate && warrantyMonths) {
      const parts = purchaseDate.split("/");
      if (parts.length === 3) {
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        d.setMonth(d.getMonth() + parseInt(warrantyMonths));
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        setWarrantyEnd(`${dd}/${mm}/${yyyy}`);
      }
    }
  }, [purchaseDate, warrantyMonths]);

  const onClose = () => {
    Alert.alert(t("invoice.discardTitle"), t("invoice.discardMessage"), [
      { text: t("invoice.discardCancel"), style: "cancel" },
      { text: t("invoice.discardConfirm"), style: "destructive", onPress: () => router.back() },
    ]);
  };

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert(t("common.save"), t("invoice.namePh"));
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        categoryId,
        brand: brand.trim(),
        price: price ? parseFloat(price.replace(",", ".")) : null,
        currency: "EUR",
        purchaseDate: purchaseDate || null,
        store: store.trim(),
        paymentMethod,
        warrantyMonths: warrantyMonths ? parseInt(warrantyMonths) : null,
        warrantyEnd: warrantyEnd || null,
        serialNumber: serialNumber.trim(),
        notes: notes.trim(),
        receiptImage,
        invoiceImage,
        invoicePdf,
        isProtected,
      };
      if (existing) {
        await updateInvoice(existing.id, data);
      } else {
        await addInvoice(data);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert(t("common.delete"), t("invoice.deleteConfirm", { name: existing.name }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: async () => {
        await deleteInvoice(existing.id);
        router.back();
      }},
    ]);
  };

  const pickImage = async (type: "receipt" | "invoice") => {
    Alert.alert(
      type === "receipt" ? t("invoice.receiptPhoto") : t("invoice.invoicePhoto"),
      "",
      [
        { text: t("invoice.addReceipt"), onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.9 });
          if (!result.canceled) {
            type === "receipt" ? setReceiptImage(result.assets[0].uri) : setInvoiceImage(result.assets[0].uri);
          }
        }},
        { text: t("common.search"), onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.9 });
          if (!result.canceled) {
            type === "receipt" ? setReceiptImage(result.assets[0].uri) : setInvoiceImage(result.assets[0].uri);
          }
        }},
        { text: t("common.cancel"), style: "cancel" },
      ]
    );
  };

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!result.canceled && result.assets?.[0]) {
      setInvoicePdf(result.assets[0].uri);
    }
  };

  const cat = findCategory(categoryId);
  const CatIcon = (Icons as any)[cat.icon] || Icons.Package;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
          <Icons.ChevronLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{existing ? t("invoice.edit") : t("invoice.new")}</Text>
        <TouchableOpacity onPress={onSave} disabled={saving} style={styles.headerBtn}>
          <Icons.Check color={theme.accent} size={24} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Preview */}
        <View style={[styles.preview, { backgroundColor: cat.color }]}>
          <CatIcon color="rgba(255,255,255,0.7)" size={24} />
          <Text style={styles.previewName}>{name || t("invoice.namePh")}</Text>
          {price ? <Text style={styles.previewPrice}>{parseFloat(price || "0").toFixed(2)} €</Text> : null}
        </View>

        {/* Nom */}
        <Text style={styles.label}>{t("invoice.name").toUpperCase()}</Text>
        <TextInput autoCorrect={false} style={styles.input} placeholder={t("invoice.namePh")} placeholderTextColor={theme.textSubtle} value={name} onChangeText={setName} />

        {/* Catégorie */}
        <Text style={[styles.label, { marginTop: 16 }]}>{t("invoice.category").toUpperCase()}</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowCatPicker(true)}>
          <CatIcon color={cat.color} size={18} />
          <Text style={styles.pickerText}>{t("categories." + cat.label)}</Text>
          <Icons.ChevronRight color={theme.textSubtle} size={18} />
        </TouchableOpacity>

        {/* Marque + Prix */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t("invoice.brand").toUpperCase()}</Text>
            <TextInput autoCorrect={false} style={styles.input} placeholder={t("invoice.brandPh")} placeholderTextColor={theme.textSubtle} value={brand} onChangeText={setBrand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t("invoice.price").toUpperCase()}</Text>
            <TextInput autoCorrect={false} style={styles.input} placeholder={t("invoice.pricePh")} placeholderTextColor={theme.textSubtle} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          </View>
        </View>

        {/* Date + Magasin */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t("invoice.purchaseDate").toUpperCase()}</Text>
            <TextInput autoCorrect={false} style={styles.input} placeholder="JJ/MM/AAAA" placeholderTextColor={theme.textSubtle} value={purchaseDate} keyboardType="numeric" maxLength={10}
              onChangeText={(v) => {
                const c = v.replace(/[^0-9]/g, "");
                let f = c;
                if (c.length >= 3) f = c.slice(0, 2) + "/" + c.slice(2);
                if (c.length >= 5) f = c.slice(0, 2) + "/" + c.slice(2, 4) + "/" + c.slice(4, 8);
                setPurchaseDate(f);
              }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t("invoice.store").toUpperCase()}</Text>
            <TextInput autoCorrect={false} style={styles.input} placeholder={t("invoice.storePh")} placeholderTextColor={theme.textSubtle} value={store} onChangeText={setStore} />
          </View>
        </View>

        {/* Mode de paiement */}
        <Text style={[styles.label, { marginTop: 16 }]}>{t("invoice.paymentMethod").toUpperCase()}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {PAYMENT_METHODS.map((m) => (
            <TouchableOpacity key={m} style={[styles.chip, paymentMethod === m && { backgroundColor: theme.accent, borderColor: theme.accent }]} onPress={() => setPaymentMethod(paymentMethod === m ? null : m)}>
              <Text style={[styles.chipText, paymentMethod === m && { color: "#fff" }]}>{t("paymentMethods." + m)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Garantie */}
        <Text style={[styles.label, { marginTop: 16 }]}>{t("invoice.warrantyMonths").toUpperCase()}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput autoCorrect={false} style={[styles.input, { flex: 1 }]} placeholder="12" placeholderTextColor={theme.textSubtle} value={warrantyMonths} onChangeText={setWarrantyMonths} keyboardType="numeric" maxLength={3} />
          {warrantyEnd ? (
            <View style={[styles.input, { flex: 2, justifyContent: "center" }]}>
              <Text style={{ color: theme.accent, fontWeight: "700" }}>🛡 {t("invoice.warrantyEnd")}: {warrantyEnd}</Text>
            </View>
          ) : null}
        </View>

        {/* Numéro de série */}
        <Text style={[styles.label, { marginTop: 16 }]}>{t("invoice.serialNumber").toUpperCase()}</Text>
        <TextInput autoCorrect={false} style={styles.input} placeholder={t("invoice.serialNumberPh")} placeholderTextColor={theme.textSubtle} value={serialNumber} onChangeText={setSerialNumber} />

        {/* Notes */}
        <Text style={[styles.label, { marginTop: 16 }]}>{t("invoice.notes").toUpperCase()}</Text>
        <TextInput autoCorrect={false} style={[styles.input, { height: 80, textAlignVertical: "top" }]} placeholder={t("invoice.notesPh")} placeholderTextColor={theme.textSubtle} value={notes} onChangeText={setNotes} multiline />

        {/* Photos */}
        <Text style={[styles.label, { marginTop: 16 }]}>{t("invoice.receiptPhoto").toUpperCase()}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity style={[styles.photoBtn, receiptImage && { borderColor: theme.accent }]} onPress={() => pickImage("receipt")}>
            <Icons.Receipt color={receiptImage ? theme.accent : theme.text} size={18} />
            <Text style={[styles.photoBtnText, receiptImage && { color: theme.accent }]}>{t("invoice.addReceipt")}</Text>
            {receiptImage ? <Icons.Check color={theme.accent} size={14} /> : null}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.photoBtn, invoiceImage && { borderColor: theme.accent }]} onPress={() => pickImage("invoice")}>
            <Icons.FileText color={invoiceImage ? theme.accent : theme.text} size={18} />
            <Text style={[styles.photoBtnText, invoiceImage && { color: theme.accent }]}>{t("invoice.addInvoice")}</Text>
            {invoiceImage ? <Icons.Check color={theme.accent} size={14} /> : null}
          </TouchableOpacity>
        </View>

        {receiptImage ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
            <Image source={{ uri: receiptImage }} style={{ flex: 1, height: 80, borderRadius: 10 }} resizeMode="cover" />
            <TouchableOpacity onPress={() => setReceiptImage(null)} style={styles.removeBtn}>
              <Icons.Trash2 color={theme.danger} size={16} />
            </TouchableOpacity>
          </View>
        ) : null}

        {invoiceImage ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
            <Image source={{ uri: invoiceImage }} style={{ flex: 1, height: 80, borderRadius: 10 }} resizeMode="cover" />
            <TouchableOpacity onPress={() => setInvoiceImage(null)} style={styles.removeBtn}>
              <Icons.Trash2 color={theme.danger} size={16} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* PDF */}
        <TouchableOpacity style={[styles.photoBtn, { marginTop: 10, width: "100%", justifyContent: "center" }, invoicePdf && { borderColor: theme.accent }]} onPress={pickPdf}>
          <Icons.FileType color={invoicePdf ? theme.accent : theme.text} size={18} />
          <Text style={[styles.photoBtnText, invoicePdf && { color: theme.accent }]}>{t("invoice.addPdf")}</Text>
          {invoicePdf ? <Icons.Check color={theme.accent} size={14} /> : null}
        </TouchableOpacity>

        {/* PIN */}
        {isPro ? (
          <TouchableOpacity style={[styles.protectRow, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
            onPress={() => {
              if (!pinDefined) { Alert.alert(t("invoice.pinRequired"), t("invoice.pinRequiredMsg")); return; }
              setIsProtected(!isProtected);
            }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.protectTitle, { color: theme.text }]}>{t("invoice.protect")}</Text>
              <Text style={[styles.protectSub, { color: theme.textMuted }]}>{t("invoice.protectSub")}</Text>
            </View>
            <View style={[styles.toggle, isProtected && styles.toggleActive]}>
              <View style={[styles.toggleThumb, isProtected && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Supprimer */}
        {existing ? (
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <Icons.Trash2 color={theme.danger} size={18} />
            <Text style={styles.deleteBtnText}>{t("common.delete")}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* Category picker modal */}
      {showCatPicker ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("invoice.category")}</Text>
            {DEFAULT_CATEGORIES.map((c) => {
              const Icon = (Icons as any)[c.icon] || Icons.Package;
              return (
                <TouchableOpacity key={c.id} style={styles.modalRow} onPress={() => { setCategoryId(c.id); setShowCatPicker(false); }}>
                  <Icon color={c.color} size={20} />
                  <Text style={styles.modalRowText}>{t("categories." + c.label)}</Text>
                  {categoryId === c.id ? <Icons.Check color={theme.accent} size={18} /> : null}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={() => setShowCatPicker(false)} style={{ alignItems: "center", paddingVertical: 12 }}>
              <Text style={{ color: theme.textMuted, fontWeight: "600" }}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
    headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 16, fontWeight: "800", color: theme.text },
    preview: { borderRadius: 20, padding: 20, marginBottom: 20, alignItems: "center", gap: 8 },
    previewName: { color: "#fff", fontSize: 18, fontWeight: "900", textAlign: "center" },
    previewPrice: { color: "rgba(255,255,255,0.8)", fontSize: 22, fontWeight: "900" },
    label: { fontSize: 11, fontWeight: "700", color: theme.textMuted, letterSpacing: 1.5, marginBottom: 8 },
    input: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: theme.text },
    picker: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, paddingVertical: 12 },
    pickerText: { flex: 1, fontSize: 15, color: theme.text },
    chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    chipText: { fontSize: 13, fontWeight: "600", color: theme.textMuted },
    photoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14 },
    photoBtnText: { fontSize: 13, color: theme.text, fontWeight: "600" },
    removeBtn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
    protectRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 20, gap: 12 },
    protectTitle: { fontSize: 15, fontWeight: "700" },
    protectSub: { fontSize: 12, marginTop: 2 },
    toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: "#D1D5DB", padding: 2, justifyContent: "center" },
    toggleActive: { backgroundColor: "#10B981" },
    toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignSelf: "flex-start" },
    toggleThumbActive: { alignSelf: "flex-end" },
    deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: theme.danger, marginTop: 20, marginBottom: 10 },
    deleteBtnText: { color: theme.danger, fontWeight: "700", fontSize: 15 },
    modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: "800", color: theme.text, marginBottom: 16 },
    modalRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
    modalRowText: { flex: 1, fontSize: 15, color: theme.text, fontWeight: "600" },
  });
}
