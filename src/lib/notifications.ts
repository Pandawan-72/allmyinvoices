// notifications.ts — Alertes d'expiration de carte
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

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

export async function scheduleExpirationAlert(
  cardId: string,
  cardName: string,
  expiresAt: string,
  daysBefore: number = 2
): Promise<string | null> {
  try {
    const expDate = new Date(expiresAt);
    const now = new Date();

    // Annuler les anciennes notifs pour cette carte
    await cancelExpirationAlert(cardId);

    // Planifier une notification par jour, de (expDate - daysBefore) jusqu'à expDate
    const ids: string[] = [];
    for (let d = daysBefore; d >= 0; d--) {
      const alertDate = new Date(expDate);
      alertDate.setDate(alertDate.getDate() - d);
      alertDate.setHours(9, 0, 0, 0); // 9h du matin

      if (alertDate <= now) continue;

      const daysLeft = d === 0 ? "aujourd'hui" : d === 1 ? "demain" : `dans ${d} jours`;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Carte bientôt expirée 🗓",
          body: `Votre carte "${cardName}" expire ${daysLeft}.`,
          data: { cardId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: alertDate,
        },
      });
      ids.push(id);
    }

    return ids[0] || null;
  } catch (e) {
    console.error("scheduleExpirationAlert error:", e);
    return null;
  }
}

export async function cancelExpirationAlert(cardId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.cardId === cardId) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch {}
}

export async function cancelAllExpirationAlerts(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleTrialEndingNotification(trialStartMs: number): Promise<void> {
  try {
    const warningDate = new Date(trialStartMs + 13 * 24 * 60 * 60 * 1000);
    warningDate.setHours(9, 0, 0, 0);

    if (warningDate <= new Date()) return;

    // Annuler l'ancienne notif trial si existante
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === "trial_ending") {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Votre essai Pro se termine bientôt ✨",
        body: "Il vous reste 2 jours pour profiter de toutes les fonctionnalités Pro d'All My Cards.",
        data: { type: "trial_ending" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: warningDate,
      },
    });
  } catch (e) {
    console.error("scheduleTrialEndingNotification error:", e);
  }
}
