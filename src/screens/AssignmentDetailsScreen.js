import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Switch,
  Animated,
  Easing,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import {
  cancelAssignmentReminder,
  scheduleAssignmentReminder,
} from "../utils/notificationHelper";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ------------------------------------------------------------------ */
/* Design tokens — same values as HomeScreen.js / AddAssignmentScreen  */
/* so all three screens stay visually consistent. Kept inline so this  */
/* file has nothing extra to place anywhere.                           */
/* ------------------------------------------------------------------ */
const colors = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primarySoft: "#eff6ff",
  bg: "#f8fafc",
  surface: "#ffffff",
  surfaceMuted: "#f1f5f9",
  border: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  textOnPrimary: "#ffffff",
  success: "#16a34a",
  successBg: "#f0fdf4",
  warning: "#d97706",
  warningBg: "#fffbeb",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  info: "#2563eb",
  infoBg: "#eff6ff",
  pending: "#f97316",
  pendingBg: "#fff7ed",
  purple: "#7c3aed",
  purpleBg: "#f5f3ff",
};

const tap = (style = Haptics.ImpactFeedbackStyle.Light) => {
  Haptics.impactAsync(style).catch(() => {});
};
const tapSuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
const tapWarning = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};

const PRIORITY_META = {
  low: { label: "Low Priority", short: "Low", color: colors.success, bg: colors.successBg, icon: "arrow-down-circle" },
  medium: { label: "Medium Priority", short: "Medium", color: colors.warning, bg: colors.warningBg, icon: "remove-circle" },
  high: { label: "High Priority", short: "High", color: colors.danger, bg: colors.dangerBg, icon: "alert-circle" },
};

const PRIORITY_OPTIONS = ["low", "medium", "high"];

// (minutes-before-deadline, display label, icon)
// "custom" is a sentinel value (not a number) that switches the UI into
// alarm-style exact date+time picking instead of a fixed offset.
const REMINDER_OPTIONS = [
  { value: 30, label: "30 min", icon: "flash-outline" },
  { value: 60, label: "1 hour", icon: "time-outline" },
  { value: 180, label: "3 hours", icon: "hourglass-outline" },
  { value: 1440, label: "1 day", icon: "calendar-outline" },
  { value: "custom", label: "Custom", icon: "options-outline" },
];

const getCountdownInfo = (deadline) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(deadline);
  due.setHours(0, 0, 0, 0);

  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    return {
      label: `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"}`,
      icon: "alert-circle",
      color: colors.danger,
    };
  }
  if (diff === 0) {
    return { label: "Due Today", icon: "flame", color: colors.danger };
  }
  if (diff === 1) {
    return { label: "1 Day Left", icon: "time", color: colors.warning };
  }
  return { label: `${diff} Days Left`, icon: "time-outline", color: colors.info };
};

const formatDeadline = (deadline) => {
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return deadline;
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const datePart = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart}, ${timePart}`;
};

// Reads straight off the *saved assignment* (not the edit form), so it
// works for both the fixed-offset presets and the custom alarm-style time.
const formatReminderLabel = (assignment) => {
  if (!assignment.reminderEnabled) return "No reminder set";

  if (assignment.reminderMinutesBefore === "custom") {
    return assignment.reminderCustomDateTime
      ? `Custom: ${formatDateTime(new Date(assignment.reminderCustomDateTime))}`
      : "Custom time set";
  }

  const match = REMINDER_OPTIONS.find((option) => option.value === assignment.reminderMinutesBefore);
  return match ? `${match.label} before deadline` : "Reminder on";
};

/* ------------------------------------------------------------------ */
/* Animation helpers                                                   */
/* ------------------------------------------------------------------ */
function FadeInUp({ index = 0, style, children }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index * 60, 400),
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function ScaleButton({ onPress, style, disabled, haptic = true, hapticStyle, children, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          if (haptic && !disabled) tap(hapticStyle);
          onPress?.();
        }}
        disabled={disabled}
        onPressIn={() =>
          !disabled &&
          Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 4 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start()
        }
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// --- Small presentational subcomponents (avoid duplicated JSX per field) ---

function Badge({ icon, label, color, bg, dot }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {dot ? (
        <View style={[styles.priorityDot, { backgroundColor: color }]} />
      ) : (
        <Ionicons name={icon} size={14} color={color} />
      )}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// Color-coded per field so the info card reads at a glance instead of
// being a wall of identical blue icons.
function InfoRow({ icon, label, value, iconColor, iconBg, isLast }) {
  return (
    <>
      <View style={styles.infoRow}>
        <View style={[styles.infoIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.infoTextWrap}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      </View>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

// Screen header with a working back button (top-left) and an optional
// right-side action slot (used for the edit icon in view mode).
function ScreenHeader({ onBack, title, rightSlot }) {
  return (
    <View style={styles.screenHeader}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          tap();
          onBack();
        }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      {title ? (
        <Text style={styles.screenHeaderTitle} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={styles.screenHeaderRight}>{rightSlot}</View>
    </View>
  );
}

// Icon-led priority chip used in edit mode — matches AddAssignmentScreen.
function PriorityChip({ meta, selected, onPress }) {
  return (
    <ScaleButton
      style={[
        styles.priorityOption,
        { borderColor: selected ? meta.color : colors.border, backgroundColor: selected ? meta.bg : colors.surface },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Set priority ${meta.label}`}
      accessibilityState={{ selected }}
    >
      <Ionicons name={meta.icon} size={16} color={selected ? meta.color : colors.textMuted} />
      <Text style={[styles.priorityOptionText, { color: selected ? meta.color : colors.textSecondary }]}>
        {meta.short}
      </Text>
    </ScaleButton>
  );
}

// Icon-led reminder offset chip, revealed with a fade+slide when the
// switch is turned on rather than popping in instantly.
function ReminderChip({ option, selected, onPress }) {
  return (
    <ScaleButton
      style={[
        styles.priorityOption,
        { borderColor: colors.primary, backgroundColor: selected ? colors.primarySoft : colors.surface },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Remind ${option.label} before deadline`}
      accessibilityState={{ selected }}
    >
      <Ionicons name={option.icon} size={15} color={colors.primary} />
      <Text style={[styles.priorityOptionText, { color: colors.primary }]}>{option.label}</Text>
    </ScaleButton>
  );
}

function FadeInView({ visible, style, children, duration = 240 }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, anim, duration]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default function AssignmentDetailsScreen({
  route,
  navigation,
  assignments,
  deleteAssignment,
  toggleAssignmentStatus,
  updateAssignment,
}) {
  const { assignmentId } = route.params;
  const assignment = useMemo(
    () => assignments.find((item) => item.id === assignmentId),
    [assignments, assignmentId]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [form, setForm] = useState(null);

  // Custom reminder date+time picker state. Android needs a two-step
  // flow (date dialog, then time dialog) since its native picker can't
  // show both at once; iOS can show a single inline "datetime" picker.
  const [customPickerStep, setCustomPickerStep] = useState(null); // null | "date" | "time"

  // The native stack header's default back button was unreliable here
  // (wrong target / occasionally missing), so we hide it and render our
  // own header row with a back button that always does the right thing.
  useLayoutEffect(() => {
    navigation.setOptions?.({ headerShown: false });
  }, [navigation]);

  const goToHome = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "HomeTab" });
  }, [navigation]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
    } else {
      goToHome();
    }
  }, [navigation, goToHome]);

  const handleDelete = useCallback(() => {
    if (!assignment) return;
    tapWarning();

    Alert.alert(
      "Delete Assignment",
      `Are you sure you want to delete "${assignment.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            cancelAssignmentReminder(assignment.id);
            deleteAssignment(assignment.id);
            handleBack();
          },
        },
      ]
    );
  }, [assignment, deleteAssignment, handleBack]);

  const handleToggleStatus = useCallback(() => {
    if (!assignment) return;
    if (assignment.status !== "completed") tapSuccess();
    toggleAssignmentStatus(assignment.id);
    handleBack();
  }, [assignment, toggleAssignmentStatus, handleBack]);

  const startEditing = useCallback(() => {
    if (!assignment) return;
    const deadline = new Date(assignment.deadline);
    setForm({
      title: assignment.title,
      subject: assignment.subject,
      description: assignment.description || "",
      deadline,
      priority: assignment.priority || "medium",
      reminderEnabled: Boolean(assignment.reminderEnabled),
      reminderMinutesBefore: assignment.reminderMinutesBefore || 60,
      // Falls back to "1 hour before deadline" if no custom time was ever set.
      customReminderDateTime: assignment.reminderCustomDateTime
        ? new Date(assignment.reminderCustomDateTime)
        : new Date(deadline.getTime() - 60 * 60 * 1000),
    });
    setIsEditing(true);
  }, [assignment]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setShowPicker(false);
    setCustomPickerStep(null);
    setForm(null);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!assignment || !form) return;

    const trimmedTitle = form.title.trim();
    const trimmedSubject = form.subject.trim();

    if (!trimmedTitle || !trimmedSubject) {
      tapWarning();
      Alert.alert("Missing Information", "Title and subject can't be empty.");
      return;
    }

    const isCustomReminder = form.reminderEnabled && form.reminderMinutesBefore === "custom";

    if (isCustomReminder && form.customReminderDateTime <= new Date()) {
      tapWarning();
      Alert.alert("Invalid Reminder Time", "Pick a custom reminder time that's in the future.");
      return;
    }

    const updatedAssignment = {
      title: trimmedTitle,
      subject: trimmedSubject,
      description: form.description.trim(),
      deadline: form.deadline.toISOString(),
      priority: form.priority,
      reminderEnabled: form.reminderEnabled,
      reminderMinutesBefore: form.reminderMinutesBefore,
      reminderCustomDateTime: isCustomReminder ? form.customReminderDateTime.toISOString() : null,
    };

    updateAssignment(assignment.id, updatedAssignment);

    // Keep the scheduled notification in sync with the edited assignment.
    if (form.reminderEnabled) {
      // scheduleAssignmentReminder always works off "minutes before deadline",
      // so a custom alarm-style time just gets converted into that same shape.
      const minutesBefore = isCustomReminder
        ? Math.round((form.deadline.getTime() - form.customReminderDateTime.getTime()) / 60000)
        : form.reminderMinutesBefore;

      scheduleAssignmentReminder({
        id: assignment.id,
        title: trimmedTitle,
        deadline: form.deadline.toISOString(),
        minutesBefore,
      });
    } else {
      cancelAssignmentReminder(assignment.id);
    }

    tapSuccess();
    setIsEditing(false);
    setShowPicker(false);
    setCustomPickerStep(null);
    setForm(null);
  }, [assignment, form, updateAssignment]);

  const onChangeDate = useCallback((event, selectedDate) => {
    setShowPicker(Platform.OS === "ios");
    if (selectedDate) {
      setForm((prev) => (prev ? { ...prev, deadline: selectedDate } : prev));
    }
  }, []);

  const toggleReminderEnabled = useCallback((value) => {
    tap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setForm((prev) => (prev ? { ...prev, reminderEnabled: value } : prev));
  }, []);

  const setReminderOffset = useCallback((value) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setForm((prev) => (prev ? { ...prev, reminderMinutesBefore: value } : prev));
  }, []);

  // Opens the custom alarm-style picker. Android: date dialog first, then
  // time dialog. iOS: a single inline datetime picker.
  const openCustomReminderPicker = useCallback(() => {
    tap();
    setCustomPickerStep(Platform.OS === "ios" ? "time" : "date");
  }, []);

  const onChangeCustomDate = useCallback((event, selectedDate) => {
    if (Platform.OS === "android") {
      if (event.type === "dismissed" || !selectedDate) {
        setCustomPickerStep(null);
        return;
      }
      setForm((prev) =>
        prev
          ? {
              ...prev,
              customReminderDateTime: new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                prev.customReminderDateTime.getHours(),
                prev.customReminderDateTime.getMinutes()
              ),
            }
          : prev
      );
      // Chain straight into the time picker so it feels like one flow.
      setCustomPickerStep("time");
      return;
    }
    if (selectedDate) {
      setForm((prev) => (prev ? { ...prev, customReminderDateTime: selectedDate } : prev));
    }
  }, []);

  const onChangeCustomTime = useCallback((event, selectedDate) => {
    if (Platform.OS === "android") {
      setCustomPickerStep(null);
      if (event.type === "dismissed" || !selectedDate) return;
      setForm((prev) =>
        prev
          ? {
              ...prev,
              customReminderDateTime: new Date(
                prev.customReminderDateTime.getFullYear(),
                prev.customReminderDateTime.getMonth(),
                prev.customReminderDateTime.getDate(),
                selectedDate.getHours(),
                selectedDate.getMinutes()
              ),
            }
          : prev
      );
      return;
    }
    if (selectedDate) {
      setForm((prev) => (prev ? { ...prev, customReminderDateTime: selectedDate } : prev));
    }
  }, []);

  // Edge case: assignment was deleted elsewhere, or a stale id was passed
  if (!assignment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScreenHeader onBack={handleBack} title="Assignment" />
        <View style={styles.container}>
          <FadeInUp index={0} style={styles.notFoundBox}>
            <Ionicons name="document-outline" size={40} color={colors.textMuted} />
            <Text style={styles.notFoundText}>Assignment not found</Text>
            <Text style={styles.notFoundSubtext}>
              It may have already been deleted.
            </Text>
          </FadeInUp>

          <ScaleButton
            style={styles.homeButton}
            onPress={goToHome}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
          >
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </ScaleButton>
        </View>
      </SafeAreaView>
    );
  }

  const badgeMeta = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(assignment.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const isOverdue = assignment.status === "pending" && deadlineDate < today;
    const isCompleted = assignment.status === "completed";

    if (isOverdue) {
      return { label: "Overdue", color: colors.danger, bg: colors.dangerBg, icon: "alert-circle" };
    }
    if (isCompleted) {
      return { label: "Completed", color: colors.success, bg: colors.successBg, icon: "checkmark-circle" };
    }
    return { label: "Pending", color: colors.pending, bg: colors.pendingBg, icon: "ellipse-outline" };
  }, [assignment.deadline, assignment.status]);

  const isCompleted = assignment.status === "completed";

  const countdown = useMemo(
    () => getCountdownInfo(assignment.deadline),
    [assignment.deadline]
  );

  const priorityMeta = PRIORITY_META[assignment.priority] || null;

  const reminderValue = formatReminderLabel(assignment);

  // ---------------- EDIT MODE ----------------
  if (isEditing && form) {
    const isCustomReminder = form.reminderMinutesBefore === "custom";

    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScreenHeader onBack={cancelEditing} title="Edit Assignment" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <FadeInUp index={0}>
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(text) => setForm((prev) => ({ ...prev, title: text }))}
                placeholder="Assignment title"
                placeholderTextColor={colors.textMuted}
              />
            </FadeInUp>

            <FadeInUp index={1}>
              <Text style={styles.fieldLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                value={form.subject}
                onChangeText={(text) => setForm((prev) => ({ ...prev, subject: text }))}
                placeholder="Subject"
                placeholderTextColor={colors.textMuted}
              />
            </FadeInUp>

            <FadeInUp index={2}>
              <Text style={styles.fieldLabel}>Deadline</Text>
              <ScaleButton
                style={styles.dateInput}
                onPress={() => setShowPicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Change deadline"
              >
                <View style={styles.dateInputInner}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={styles.dateInputText}>{formatDeadline(form.deadline)}</Text>
                </View>
              </ScaleButton>
              {showPicker && Platform.OS === "ios" && (
                <View style={styles.inlinePickerCard}>
                  <DateTimePicker
                    value={form.deadline}
                    mode="date"
                    display="inline"
                    onChange={onChangeDate}
                    themeVariant="light"
                    accentColor={colors.primary}
                  />
                </View>
              )}
              {showPicker && Platform.OS === "android" && (
                <DateTimePicker
                  value={form.deadline}
                  mode="date"
                  display="default"
                  onChange={onChangeDate}
                  themeVariant="light"
                />
              )}
            </FadeInUp>

            <FadeInUp index={3}>
              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.priorityRow}>
                {PRIORITY_OPTIONS.map((option) => (
                  <PriorityChip
                    key={option}
                    meta={PRIORITY_META[option]}
                    selected={form.priority === option}
                    onPress={() => setForm((prev) => ({ ...prev, priority: option }))}
                  />
                ))}
              </View>
            </FadeInUp>

            <FadeInUp index={4}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
                placeholder="Optional description"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </FadeInUp>

            <FadeInUp index={5}>
              <View style={styles.reminderHeaderRow}>
                <View style={styles.reminderHeaderLabel}>
                  <Ionicons name="notifications-outline" size={15} color={colors.textSecondary} />
                  <Text style={[styles.fieldLabel, { marginTop: 0, marginLeft: 6 }]}>
                    Reminder Notification
                  </Text>
                </View>
                <Switch
                  value={form.reminderEnabled}
                  onValueChange={toggleReminderEnabled}
                  trackColor={{ false: colors.border, true: "#bfdbfe" }}
                  thumbColor={form.reminderEnabled ? colors.primary : "#f4f4f5"}
                  accessibilityLabel="Toggle reminder notification"
                />
              </View>

              <FadeInView visible={form.reminderEnabled} style={styles.priorityRow}>
                {REMINDER_OPTIONS.map((option) => (
                  <ReminderChip
                    key={option.value}
                    option={option}
                    selected={form.reminderMinutesBefore === option.value}
                    onPress={() => setReminderOffset(option.value)}
                  />
                ))}
              </FadeInView>

              {/* Alarm-style exact date+time picker — only shown once "Custom" is picked */}
              <FadeInView visible={form.reminderEnabled && isCustomReminder} style={{ marginTop: 4 }}>
                <ScaleButton
                  style={styles.dateInput}
                  onPress={openCustomReminderPicker}
                  accessibilityRole="button"
                  accessibilityLabel="Pick custom reminder date and time"
                >
                  <View style={styles.dateInputInner}>
                    <Ionicons name="alarm-outline" size={18} color={colors.primary} />
                    <Text style={styles.dateInputText}>
                      {formatDateTime(form.customReminderDateTime)}
                    </Text>
                  </View>
                </ScaleButton>

                {Platform.OS === "ios" && customPickerStep === "time" && (
                  <View style={styles.inlinePickerCard}>
                    <DateTimePicker
                      value={form.customReminderDateTime}
                      mode="datetime"
                      display="inline"
                      minimumDate={new Date()}
                      onChange={onChangeCustomTime}
                      themeVariant="light"
                      accentColor={colors.primary}
                    />
                    <ScaleButton
                      style={styles.customPickerDoneButton}
                      onPress={() => setCustomPickerStep(null)}
                      haptic={false}
                    >
                      <Text style={styles.customPickerDoneText}>Done</Text>
                    </ScaleButton>
                  </View>
                )}

                {Platform.OS === "android" && customPickerStep === "date" && (
                  <DateTimePicker
                    value={form.customReminderDateTime}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={onChangeCustomDate}
                  />
                )}
                {Platform.OS === "android" && customPickerStep === "time" && (
                  <DateTimePicker
                    value={form.customReminderDateTime}
                    mode="time"
                    display="default"
                    onChange={onChangeCustomTime}
                  />
                )}
              </FadeInView>
            </FadeInUp>

            <FadeInUp index={6}>
              <ScaleButton
                style={styles.completeButton}
                onPress={handleSaveEdit}
                haptic={false}
                accessibilityRole="button"
                accessibilityLabel="Save changes"
              >
                <View style={styles.buttonInner}>
                  <Ionicons name="checkmark" size={19} color={colors.textOnPrimary} />
                  <Text style={styles.buttonText}>Save Changes</Text>
                </View>
              </ScaleButton>

              <ScaleButton
                style={styles.homeButton}
                onPress={cancelEditing}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing"
              >
                <Text style={styles.homeButtonText}>Cancel</Text>
              </ScaleButton>
            </FadeInUp>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ---------------- VIEW MODE ----------------
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScreenHeader
        onBack={handleBack}
        title="Assignment"
        rightSlot={
          <TouchableOpacity
            style={styles.editIconButton}
            onPress={() => {
              tap();
              startEditing();
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit assignment"
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <FadeInUp index={0} style={styles.headerBlock}>
          <Text style={styles.title}>{assignment.title}</Text>
          <View style={styles.badgeRow}>
            <Badge {...badgeMeta} />
            {priorityMeta && <Badge icon={priorityMeta.icon} label={priorityMeta.short} color={priorityMeta.color} bg={priorityMeta.bg} />}
          </View>
        </FadeInUp>

        <FadeInUp index={1} style={[styles.countdownCard, { backgroundColor: `${countdown.color}12` }]}>
          <View style={[styles.countdownIconWrap, { backgroundColor: `${countdown.color}22` }]}>
            <Ionicons name={countdown.icon} size={20} color={countdown.color} />
          </View>
          <Text style={[styles.countdownText, { color: countdown.color }]}>
            {countdown.label}
          </Text>
        </FadeInUp>

        <FadeInUp index={2} style={styles.card}>
          <InfoRow
            icon="book-outline"
            label="Subject"
            value={assignment.subject}
            iconColor={colors.primary}
            iconBg={colors.infoBg}
          />
          <InfoRow
            icon="calendar-outline"
            label="Deadline"
            value={formatDeadline(assignment.deadline)}
            iconColor={colors.warning}
            iconBg={colors.warningBg}
          />
          <InfoRow
            icon="notifications-outline"
            label="Reminder"
            value={reminderValue}
            iconColor={colors.purple}
            iconBg={colors.purpleBg}
          />
          <InfoRow
            icon="document-text-outline"
            label="Description"
            value={assignment.description || "No description provided"}
            iconColor={colors.textSecondary}
            iconBg={colors.surfaceMuted}
            isLast
          />
        </FadeInUp>

        <FadeInUp index={3}>
          <ScaleButton
            style={[styles.completeButton, isCompleted && styles.undoButton]}
            onPress={handleToggleStatus}
            haptic={false}
            accessibilityRole="button"
            accessibilityLabel={isCompleted ? "Mark as pending" : "Mark as completed"}
          >
            <View style={styles.buttonInner}>
              <Ionicons
                name={isCompleted ? "arrow-undo" : "checkmark-circle"}
                size={19}
                color={colors.textOnPrimary}
              />
              <Text style={styles.buttonText}>
                {isCompleted ? "Mark as Pending" : "Mark as Completed"}
              </Text>
            </View>
          </ScaleButton>

          <ScaleButton
            style={styles.deleteButton}
            onPress={handleDelete}
            haptic={false}
            accessibilityRole="button"
            accessibilityLabel="Delete assignment"
          >
            <View style={styles.buttonInner}>
              <Ionicons name="trash-outline" size={19} color={colors.textOnPrimary} />
              <Text style={styles.buttonText}>Delete Assignment</Text>
            </View>
          </ScaleButton>
        </FadeInUp>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  screenHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 4,
  },
  screenHeaderRight: { width: 36, alignItems: "flex-end" },
  headerBlock: { marginBottom: 16 },
  title: { fontSize: 25, fontWeight: "800", color: colors.textPrimary, marginBottom: 10 },
  editIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.infoBg,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  countdownCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  countdownIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownText: { fontSize: 16, fontWeight: "700" },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12 },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoTextWrap: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.surfaceMuted },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  value: { fontSize: 15, color: colors.textPrimary, lineHeight: 21 },
  buttonInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  undoButton: { backgroundColor: "#64748b", shadowOpacity: 0 },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  homeButton: { backgroundColor: colors.textPrimary, paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  homeButtonText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: "bold" },
  buttonText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: "bold" },
  notFoundBox: {
    backgroundColor: colors.surface,
    padding: 28,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 60,
    marginBottom: 24,
    gap: 8,
  },
  notFoundText: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  notFoundSubtext: { fontSize: 14, color: colors.textSecondary },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: { minHeight: 100 },
  dateInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateInputInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateInputText: { fontSize: 15, color: colors.textPrimary },
  inlinePickerCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  customPickerDoneButton: {
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  customPickerDoneText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
  priorityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  priorityOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    flexGrow: 1,
  },
  priorityOptionText: { fontSize: 12, fontWeight: "700" },
  reminderHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 8,
  },
  reminderHeaderLabel: { flexDirection: "row", alignItems: "center" },
});