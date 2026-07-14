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
        body: assignment.subject
          ? `${assignment.title} (${assignment.subject}) is due soon.`
          : `${assignment.title} is due soon.`,
        sound: true,
        data: { assignmentId: assignment.id ?? null },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDateTime,
        channelId: Platform.OS === "android" ? ANDROID_CHANNEL_ID : undefined,
      },
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