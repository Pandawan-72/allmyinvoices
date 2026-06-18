import * as Notifications from "expo-notifications";
import { Invoice } from "@/src/contexts/InvoicesContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleWarrantyNotification(invoice: Invoice, daysBefore: number = 30): Promise<void> {
  if (!invoice.warrantyEnd) return;

  try {
    const parts = invoice.warrantyEnd.split("/");
    if (parts.length !== 3) return;
    const warrantyDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);

    // Annuler les anciennes notifs pour cette facture
    await cancelWarrantyNotification(invoice.id);

    const now = new Date();

    // Planifier une notif par jour de (warrantyDate - daysBefore) jusqu'à warrantyDate
    for (let d = daysBefore; d >= 0; d--) {
      const alertDate = new Date(warrantyDate);
      alertDate.setDate(alertDate.getDate() - d);
      alertDate.setHours(9, 0, 0, 0);

      if (alertDate <= now) continue;

      const daysLeft = d === 0 ? "aujourd'hui" : d === 1 ? "demain" : `dans ${d} jours`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Garantie bientôt expirée 🛡",
          body: `La garantie de "${invoice.name}" expire ${daysLeft}.`,
          data: { invoiceId: invoice.id, type: "warranty" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: alertDate,
        },
      });
    }
  } catch (e) {
    console.error("scheduleWarrantyNotification error:", e);
  }
}

export async function cancelWarrantyNotification(invoiceId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.invoiceId === invoiceId) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch {}
}

export async function scheduleAllWarrantyNotifications(invoices: Invoice[]): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;
  for (const invoice of invoices) {
    if (invoice.warrantyEnd) {
      await scheduleWarrantyNotification(invoice, 30);
    }
  }
}
