import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, Alert } from "react-native";

const ANDROID_CHANNEL_ID = "assignment-reminders";

// How notifications behave when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let androidChannelReady = false;

// Idempotent — safe to call as many times as you like, only sets up the
// channel once per app session. Split out so it can also run at app start
// (e.g. App.js) without needing to go through a permission prompt first.
async function ensureAndroidChannel() {
  if (Platform.OS !== "android" || androidChannelReady) return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Assignment Reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#2563eb",
  });

  androidChannelReady = true;
}

/**
 * Ask for notification permission. Call this once, e.g. in App.js on mount,
 * or right before scheduling the first reminder.
 * @param {Object} [options]
 * @param {boolean} [options.showAlerts=true] - whether to show built-in Alert
 *   dialogs on failure. Set false if the caller wants to handle UI itself.
 * @returns {Promise<{granted: boolean, reason?: string}>}
 */
export async function requestNotificationPermission({ showAlerts = true } = {}) {
  if (!Device.isDevice) {
    if (showAlerts) {
      Alert.alert(
        "Not Supported",
        "Notifications only work on a physical device, not an emulator/simulator."
      );
    }
    return { granted: false, reason: "not-a-device" };
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    if (showAlerts) {
      Alert.alert(
        "Permission Needed",
        "Please enable notifications to get assignment reminders. You can turn this on later from your device settings."
      );
    }
    return { granted: false, reason: "denied" };
  }

  await ensureAndroidChannel();

  return { granted: true };
}

/**
 * Check current permission status without prompting the user.
 * Useful for showing/hiding reminder UI based on whether notifications
 * are actually available, before the user tries to set one.
 * @returns {Promise<boolean>}
 */
export async function hasNotificationPermission() {
  if (!Device.isDevice) return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

// Shared body text builder so single + batch scheduling stay in sync.
function buildReminderBody(assignment, repeat = "none") {
  const base = assignment.subject
    ? `${assignment.title} (${assignment.subject}) is due soon.`
    : `${assignment.title} is due soon.`;

  if (repeat === "daily") return `${base} (Repeats daily)`;
  if (repeat === "weekly") return `${base} (Repeats weekly)`;
  return base;
}

// Builds the correct new-style trigger for a one-time, daily, or weekly reminder.
function buildTrigger(dateTime, repeat = "none") {
  const channelId = Platform.OS === "android" ? ANDROID_CHANNEL_ID : undefined;

  if (repeat === "daily") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: dateTime.getHours(),
      minute: dateTime.getMinutes(),
      channelId,
    };
  }

  if (repeat === "weekly") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: dateTime.getDay() + 1, // expo: 1 = Sunday ... 7 = Saturday
      hour: dateTime.getHours(),
      minute: dateTime.getMinutes(),
      channelId,
    };
  }

  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: dateTime,
    channelId,
  };
}

/**
 * Schedule a reminder notification for an assignment.
 * @param {Object} assignment - must have `title`, optionally `subject` and `id`
 * @param {Date} reminderDateTime - JS Date object for when to fire the notification
 * @param {Object} [options]
 * @param {boolean} [options.showAlerts=true] - show built-in Alert dialogs on failure
 * @returns {Promise<{success: boolean, notificationId?: string, error?: string}>}
 */
export async function scheduleAssignmentReminder(
  assignment,
  reminderDateTime,
  { showAlerts = true } = {}
) {
  if (!assignment?.title) {
    return { success: false, error: "invalid-assignment" };
  }

  if (!(reminderDateTime instanceof Date) || Number.isNaN(reminderDateTime.getTime())) {
    if (showAlerts) Alert.alert("Invalid Time", "The reminder time is not valid.");
    return { success: false, error: "invalid-date" };
  }

  if (reminderDateTime <= new Date()) {
    if (showAlerts) Alert.alert("Invalid Time", "Reminder time must be in the future.");
    return { success: false, error: "date-in-past" };
  }

  const { granted } = await requestNotificationPermission({ showAlerts });
  if (!granted) return { success: false, error: "permission-denied" };

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "📚 StudyMate Reminder",
        body: buildReminderBody(assignment, "none"),
        sound: true,
        data: { assignmentId: assignment.id ?? null },
      },
      trigger: buildTrigger(reminderDateTime, "none"),
    });

    return { success: true, notificationId };
  } catch (error) {
    console.log("Failed to schedule notification:", error);
    if (showAlerts) {
      Alert.alert(
        "Error",
        `Could not schedule reminder notification.\n\n${error?.message || error}`
      );
    }
    return { success: false, error: error?.message || "unknown-error" };
  }
}

/**
 * Schedule MULTIPLE reminders for one assignment in a single call — each can
 * be one-time, or set to repeat "daily" / "weekly". Asks for permission once
 * up front (not per-reminder), then schedules each and keeps going even if
 * one fails, so a single bad row doesn't block the rest.
 *
 * @param {Object} assignment - must have `title`, optionally `subject`, `id`
 * @param {Array<{dateTime: Date, repeat?: "none"|"daily"|"weekly"}>} reminders
 * @param {Object} [options]
 * @param {boolean} [options.showAlerts=true] - show the permission Alert if denied
 * @returns {Promise<Array<{success: boolean, notificationId?: string, error?: string, repeat: string}>>}
 *   Save the full returned array on the assignment (e.g. `reminderNotifications`)
 *   so cancelAssignmentReminders() can clean them up later.
 */
export async function scheduleAssignmentReminders(assignment, reminders, { showAlerts = true } = {}) {
  if (!assignment?.title || !reminders?.length) return [];

  const { granted } = await requestNotificationPermission({ showAlerts });
  if (!granted) return [];

  const results = [];

  for (const reminder of reminders) {
    const { dateTime, repeat = "none" } = reminder;

    if (!(dateTime instanceof Date) || Number.isNaN(dateTime.getTime())) {
      results.push({ success: false, error: "invalid-date", repeat });
      continue;
    }
    if (repeat === "none" && dateTime <= new Date()) {
      results.push({ success: false, error: "date-in-past", repeat });
      continue;
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "📚 StudyMate Reminder",
          body: buildReminderBody(assignment, repeat),
          sound: true,
          data: { assignmentId: assignment.id ?? null },
        },
        trigger: buildTrigger(dateTime, repeat),
      });
      results.push({ success: true, notificationId, repeat });
    } catch (error) {
      console.log("Failed to schedule reminder:", error);
      results.push({ success: false, error: error?.message || "unknown-error", repeat });
    }
  }

  return results;
}

/**
 * Cancel a previously scheduled reminder.
 * Call this when an assignment is deleted or marked completed.
 * Safe to call with null/undefined — it's a no-op.
 * @param {string} notificationId
 * @returns {Promise<boolean>} true if cancelled (or nothing to cancel), false on error
 */
export async function cancelAssignmentReminder(notificationId) {
  if (!notificationId) return true;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    return true;
  } catch (error) {
    console.log("Failed to cancel notification:", error);
    return false;
  }
}

/**
 * Cancel every reminder produced by scheduleAssignmentReminders() in one go.
 * Pass it the exact array that function returned (e.g. from
 * assignment.reminderNotifications) — safe to call with an empty/missing array.
 * @param {Array<{success: boolean, notificationId?: string}>} scheduledReminders
 * @returns {Promise<void>}
 */
export async function cancelAssignmentReminders(scheduledReminders) {
  if (!scheduledReminders?.length) return;
  await Promise.all(
    scheduledReminders
      .filter((r) => r.success && r.notificationId)
      .map((r) => cancelAssignmentReminder(r.notificationId))
  );
}

/**
 * Cancel the old reminder (if any) and schedule a new one. Use this when an
 * assignment's deadline, title, or reminder time changes, so the user never
 * ends up with two reminders — or a stale one pointing at outdated info.
 * @param {Object} assignment - must have `title`, optionally `subject`, `id`
 * @param {string|null} previousNotificationId - notification to cancel first
 * @param {Date|null} newReminderDateTime - pass null to just cancel and not reschedule
 * @param {Object} [options]
 * @returns {Promise<{success: boolean, notificationId?: string|null, error?: string}>}
 */
export async function updateAssignmentReminder(
  assignment,
  previousNotificationId,
  newReminderDateTime,
  { showAlerts = true } = {}
) {
  await cancelAssignmentReminder(previousNotificationId);

  if (!newReminderDateTime) {
    return { success: true, notificationId: null };
  }

  return scheduleAssignmentReminder(assignment, newReminderDateTime, { showAlerts });
}

/**
 * Cancel all scheduled reminders. Useful for the "Reset Assignments" action.
 * @returns {Promise<boolean>} true if successful
 */
export async function cancelAllReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return true;
  } catch (error) {
    console.log("Failed to cancel all notifications:", error);
    return false;
  }
}

/**
 * Attach a listener that fires when the user taps a notification, so you
 * can navigate straight to the relevant assignment. Call this once near
 * your app root (e.g. App.js) and pass in a navigation callback.
 *
 * Example:
 *   useEffect(() => {
 *     const sub = addNotificationResponseListener((assignmentId) => {
 *       if (assignmentId) navigationRef.navigate("AssignmentDetails", { assignmentId });
 *     });
 *     return () => sub.remove();
 *   }, []);
 *
 * @param {(assignmentId: string|null) => void} onTap
 * @returns {import('expo-notifications').Subscription}
 */
export function addNotificationResponseListener(onTap) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const assignmentId = response.notification.request.content.data?.assignmentId ?? null;
    onTap(assignmentId);
  });
}