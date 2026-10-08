import { getDeviceDateKey, planReminders, REMINDER_HOUR } from '@firebuddy/shared';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { useFireBuddy } from './fire-buddy-store';
import { useUserProfile } from './user-profile';

/**
 * DouDou's 9pm "did you log today?" reminder. Local notifications only: they are scheduled on the
 * phone, no push server is involved and nothing leaves the device. The schedule is rebuilt (cancel
 * ours, add the next evenings) whenever the app opens or a transaction changes, so today's nudge
 * disappears as soon as something is logged for today.
 */

const CHANNEL_ID = 'daily-reminder';
/** Every reminder we schedule carries this marker, so we never cancel another feature's notifications. */
const REMINDER_KIND = 'firebuddy-daily-reminder';

/**
 * Web has no local notifications, and Expo Go (SDK 53+) throws as soon as expo-notifications is
 * imported on Android. The reminder therefore exists only in development and release builds, and
 * the module is loaded lazily so Expo Go never touches it.
 */
export const remindersSupported = Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const supported = remindersSupported;

type NotificationsModule = typeof import('expo-notifications');
let loaded: NotificationsModule | null = null;
function notifications(): NotificationsModule {
  if (!loaded) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('expo-notifications') as NotificationsModule;
    loaded.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });
  }
  return loaded;
}

/** Android needs the channel before anything is scheduled on it; creating it again is harmless. */
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  const Notifications = notifications();
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch(() => undefined);
}

/** Ask the system for permission. Resolves true when notifications may be shown. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!supported) return false;
  await ensureChannel();
  const Notifications = notifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function cancelReminders() {
  const Notifications = notifications();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((request) => request.content.data?.kind === REMINDER_KIND)
    .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
}

/** Replace our scheduled reminders with the next evenings, skipping today once it is logged. */
export async function syncReminders(on: boolean, loggedToday: boolean, now = new Date()): Promise<void> {
  if (!supported) return;
  await cancelReminders();
  if (!on) return;
  const Notifications = notifications();
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  await ensureChannel();
  const slots = planReminders({ todayKey: getDeviceDateKey(now), minutesNow: now.getHours() * 60 + now.getMinutes(), loggedToday });
  for (const slot of slots) {
    const [year, month, day] = slot.dateKey.split('-').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: { title: slot.title, body: slot.body, data: { kind: REMINDER_KIND } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(year, month - 1, day, REMINDER_HOUR, 0, 0), channelId: CHANNEL_ID },
    });
  }
}

/**
 * One queue for the whole app, so a sync started by an older render can never finish after a newer
 * one (for example re-adding today's reminder after logging cancelled it). Only the newest request
 * runs; ones queued behind it are dropped.
 */
let queue: Promise<void> = Promise.resolve();
let latestRequest = 0;
function queueSync(on: boolean, loggedToday: boolean) {
  const request = ++latestRequest;
  queue = queue
    .then(() => (request === latestRequest ? syncReminders(on, loggedToday) : undefined))
    .catch(() => undefined);
}

/**
 * Keeps the reminder schedule in step with the records and the user's choice. Mounted once in the
 * root layout, inside both providers.
 */
export function useDailyReminderSync() {
  const { hydrated, transactions } = useFireBuddy();
  const { hydrated: profileHydrated, reminderOn } = useUserProfile();
  const todayKey = getDeviceDateKey();
  const loggedToday = transactions.some((transaction) => transaction.date === todayKey);

  useEffect(() => {
    if (!supported || !hydrated || !profileHydrated) return undefined;
    const run = () => queueSync(reminderOn === true, loggedToday);
    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => subscription.remove();
  }, [hydrated, profileHydrated, reminderOn, loggedToday]);
}
