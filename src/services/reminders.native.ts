import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { FinanceState } from '../domain/finance';
import { reminderPlan } from '../domain/reminder-plan';
const KEY = 'saldo.reminders.enabled';
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
export async function remindersEnabled(): Promise<boolean> { return await SecureStore.getItemAsync(KEY) === 'true'; }
export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('financial-reminders', { name: 'Pagos y revisión de quincena', importance: AndroidImportance.DEFAULT, lockscreenVisibility: AndroidNotificationVisibility.PRIVATE });
    const status = await Notifications.requestPermissionsAsync();
    if (!status.granted) throw new Error('No se autorizaron los recordatorios. Puedes habilitarlos en los ajustes del teléfono.');
  }
  await SecureStore.setItemAsync(KEY, String(enabled));
}
let pending: Promise<void> = Promise.resolve();
export function syncReminders(state: FinanceState): Promise<void> {
  const task = pending.then(async () => {
    const plan = await remindersEnabled() ? reminderPlan(state) : [];
    const desired = new Set(plan.map(p => p.id));
    const current = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of current) if (item.identifier.startsWith('saldo:') && !desired.has(item.identifier)) await Notifications.cancelScheduledNotificationAsync(item.identifier);
    const existing = new Set(current.map(item => item.identifier));
    for (const item of plan) if (!existing.has(item.id)) await Notifications.scheduleNotificationAsync({ identifier: item.id, content: { title: 'Saldo en Mano', body: item.body, data: { screen: 'plans' } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.at, channelId: 'financial-reminders' } });
  });
  pending = task.catch(() => undefined); return task;
}
