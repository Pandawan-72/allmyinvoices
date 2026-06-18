import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PaymentMethod = "card" | "cash" | "transfer" | "check" | "other";

export type Invoice = {
  id: string;
  name: string;
  categoryId: string;
  brand: string;
  price: number | null;
  currency: string;
  purchaseDate: string | null;
  store: string;
  paymentMethod: PaymentMethod | null;
  warrantyMonths: number | null;
  warrantyEnd: string | null;
  serialNumber: string | null;
  notes: string | null;
  receiptImage: string | null;
  invoiceImage: string | null;
  invoicePdf: string | null;
  isProtected: boolean;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "ami.invoices";

type InvoicesState = {
  loading: boolean;
  invoices: Invoice[];
  addInvoice: (i: Omit<Invoice, "id" | "createdAt" | "updatedAt">) => Promise<Invoice>;
  updateInvoice: (id: string, changes: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  replaceAllInvoices: (invoices: Invoice[]) => Promise<void>;
};

const Ctx = createContext<InvoicesState | undefined>(undefined);

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function InvoicesProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setInvoices(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const save = useCallback(async (list: Invoice[]) => {
    setInvoices(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const addInvoice = useCallback(async (i: Omit<Invoice, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const invoice: Invoice = { ...i, id: uuid(), createdAt: now, updatedAt: now };
    await save([invoice, ...invoices]);
    return invoice;
  }, [invoices, save]);

  const updateInvoice = useCallback(async (id: string, changes: Partial<Invoice>) => {
    const updated = invoices.map((i) => i.id === id ? { ...i, ...changes, updatedAt: new Date().toISOString() } : i);
    await save(updated);
  }, [invoices, save]);

  const deleteInvoice = useCallback(async (id: string) => {
    await save(invoices.filter((i) => i.id !== id));
  }, [invoices, save]);

  const replaceAllInvoices = useCallback(async (list: Invoice[]) => {
    await save(list);
  }, [save]);

  return (
    <Ctx.Provider value={{ loading, invoices, addInvoice, updateInvoice, deleteInvoice, replaceAllInvoices }}>
      {children}
    </Ctx.Provider>
  );
}

export function useInvoices() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useInvoices must be used inside InvoicesProvider");
  return ctx;
}
