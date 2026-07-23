import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  View,
  Animated,
  Easing,
  LayoutAnimation,
  Modal,
  UIManager,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { scheduleAssignmentReminders } from "../utils/notificationHelper";


const colors = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primarySoft: "#eff6ff",
  gradientStart: "#2563eb",
  gradientEnd: "#4f46e5",
  bg: "#f8fafc",
  surface: "#ffffff",
  surfaceMuted: "#f1f5f9",
  border: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  textOnPrimary: "#ffffff",
  textOnPrimarySoft: "#dbeafe",
  success: "#16a34a",
  successBg: "#f0fdf4",
  warning: "#d97706",
  warningBg: "#fffbeb",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  dangerBorder: "#fecaca",
  info: "#2563eb",
  infoBg: "#eff6ff",
  pending: "#f97316",
  pendingBg: "#fff7ed",
};

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

const shadow = {
  sm: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  colored: (hex) => ({
    shadowColor: hex,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  }),
};

// Hoisted so we don't allocate a new array/object on every render.
const GRADIENT_COLORS = [colors.gradientStart, colors.gradientEnd];
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };
const HEADER_SHADOW = shadow.colored("#4338ca");
const SAVE_SHADOW = shadow.colored(colors.primary);

// Fires a haptic tick where supported; silently no-ops on web / unsupported
// devices instead of throwing, so this is always safe to call.
const tap = (style = Haptics.ImpactFeedbackStyle.Light) => {
  Haptics.impactAsync(style).catch(() => {});
};
const tapSuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
const tapWarning = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};

const isWeb = Platform.OS === "web";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const REPEAT_OPTIONS = [
  { value: "none", label: "Once", icon: "checkmark-done-outline" },
  { value: "daily", label: "Daily", icon: "sunny-outline" },
  { value: "weekly", label: "Weekly", icon: "calendar-outline" },
];

const PRIORITIES = [
  { value: "low", label: "Low", icon: "arrow-down-circle", color: colors.success, bg: colors.successBg },
  { value: "medium", label: "Medium", icon: "remove-circle", color: colors.warning, bg: colors.warningBg },
  { value: "high", label: "High", icon: "alert-circle", color: colors.danger, bg: colors.dangerBg },
];

// Day-first entry: 20-7-2026, 20-07-2026, etc.
const DAY_FIRST_REGEX = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;

const normalizeDayFirstDate = (value) => {
  const match = DAY_FIRST_REGEX.exec(value.trim());
  if (!match) return null;

  const [, day, month, year] = match;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);

  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const date = new Date(y, m - 1, d);
  // Guards against JS silently rolling "31-04-2026" into May 1st.
  if (date.getDate() !== d || date.getMonth() !== m - 1) return null;

  return date;
};

const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDDMMYYYY = (date) => {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};

const formatTime = (date) =>
  date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

// Midnight of the current day — used as the picker's minimumDate so that
// "today" is always a selectable date. Passing `new Date()` (with the
// current time) as minimumDate is the classic bug: as soon as the user
// picks a date-only value, its time resets to 00:00:00, which then falls
// *before* minimumDate (e.g. 3:45 PM) and gets silently rejected/clamped
// by the native picker — making "today" appear unselectable.
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

let reminderIdCounter = 0;
const nextReminderId = () => `reminder-${Date.now()}-${reminderIdCounter++}`;

/* ------------------------------------------------------------------ */
/* Small animation helpers                                             */
/* ------------------------------------------------------------------ */
function FadeInUp({ index = 0, style, children }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index * 55, 400),
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

function ScaleButton({ onPress, style, disabled, haptic = true, children, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  }, [disabled, scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    if (haptic && !disabled) tap();
    onPress?.();
  }, [haptic, disabled, onPress]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// Text input with an animated focus ring, matching HomeScreen's search bar.
function AnimatedInput({ style, error, multiline, ...rest }) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: focused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [focused, focusAnim]);

  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);

  const borderColor = error
    ? colors.dangerBorder
    : focusAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.primary] });

  return (
    <Animated.View
      style={[
        styles.input,
        multiline && styles.textArea,
        { borderColor },
        error && styles.inputErrorBg,
        style,
      ]}
    >
      <TextInput
        style={styles.inputInner}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest}
      />
    </Animated.View>
  );
}

// Small reusable field wrapper — keeps label + input + inline error consistent.
function FormField({ label, error, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}


function PriorityChip({ item, selected, onPress }) {
  const lift = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(lift, {
      toValue: selected ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [selected, lift]);

  const shadowOpacity = lift.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] });

  return (
    <ScaleButton
      style={[
        styles.priorityChip,
        {
          backgroundColor: selected ? item.bg : colors.surface,
          borderColor: selected ? item.color : colors.border,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.label} priority`}
      accessibilityState={{ selected }}
    >
      <Animated.View
        style={[
          styles.priorityChipInner,
          { shadowColor: item.color, shadowOpacity, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
        ]}
      >
        <Ionicons name={item.icon} size={18} color={selected ? item.color : colors.textMuted} />
        <Text style={[styles.priorityChipText, { color: selected ? item.color : colors.textSecondary }]}>
          {item.label}
        </Text>
        {selected && (
          <View style={[styles.priorityCheck, { backgroundColor: item.color }]}>
            <Ionicons name="checkmark" size={9} color={colors.textOnPrimary} />
          </View>
        )}
      </Animated.View>
    </ScaleButton>
  );
}


function ReminderCard({ reminder, index, onRemove, onUpdate, onPickDateTime }) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const handleWebDateChange = useCallback((v) => onUpdate({ webDate: v }), [onUpdate]);
  const handleWebTimeChange = useCallback((v) => onUpdate({ webTime: v }), [onUpdate]);

  const handleRemove = useCallback(() => {
    tap();
    onRemove();
  }, [onRemove]);

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [{ scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
      }}
    >
      <View style={styles.reminderRow}>
        <View style={styles.reminderRowTop}>
          <View style={styles.reminderIndexBadge}>
            <Text style={styles.reminderIndexBadgeText}>{index + 1}</Text>
          </View>
          <Text style={styles.reminderIndex}>Reminder</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={handleRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove reminder ${index + 1}`}
            hitSlop={8}
            style={styles.reminderRemoveBtn}
          >
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
          </TouchableOpacity>
        </View>

        {isWeb ? (
          <View style={styles.webReminderInputs}>
            <AnimatedInput
              style={styles.webReminderInput}
              placeholder="DD-MM-YYYY"
              value={reminder.webDate}
              onChangeText={handleWebDateChange}
              accessibilityLabel={`Reminder ${index + 1} date`}
            />
            <AnimatedInput
              style={styles.webReminderInput}
              placeholder="HH:MM"
              value={reminder.webTime}
              onChangeText={handleWebTimeChange}
              accessibilityLabel={`Reminder ${index + 1} time`}
            />
          </View>
        ) : (
          <ScaleButton
            style={styles.dateButton}
            onPress={onPickDateTime}
            accessibilityRole="button"
            accessibilityLabel={`Pick date and time for reminder ${index + 1}`}
          >
            <View style={styles.dateButtonInner}>
              <Ionicons
                name={reminder.dateTime ? "notifications" : "notifications-outline"}
                size={18}
                color={colors.primaryDark}
              />
              <Text style={[styles.dateButtonText, !reminder.dateTime && styles.placeholderText]}>
                {reminder.dateTime
                  ? `${formatDDMMYYYY(reminder.dateTime)} at ${formatTime(reminder.dateTime)}`
                  : "Select date & time"}
              </Text>
            </View>
          </ScaleButton>
        )}

        <View style={styles.repeatRow}>
          {REPEAT_OPTIONS.map((opt) => {
            const active = reminder.repeat === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.repeatChip, active && styles.repeatChipActive]}
                onPress={() => {
                  if (!active) tap();
                  onUpdate({ repeat: opt.value });
                }}
                accessibilityRole="button"
                accessibilityLabel={`Repeat ${opt.label}`}
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={opt.icon}
                  size={13}
                  color={active ? colors.textOnPrimary : colors.textSecondary}
                />
                <Text style={[styles.repeatChipText, active && styles.repeatChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}


function PickerSheet({ visible, title, onDone, children }) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onDone}>
      <Pressable style={styles.sheetBackdrop} onPress={onDone}>
        <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={styles.iosPickerHeader}>
            <Text style={styles.iosPickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onDone} accessibilityRole="button" accessibilityLabel="Done">
              <Text style={styles.iosPickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function AddAssignmentScreen({ navigation, addAssignment }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Deadline — native Date on phones, day-first text fallback on web.
  const [deadlineDate, setDeadlineDate] = useState(null);
  const [webDeadlineText, setWebDeadlineText] = useState("");

  // Multiple reminders, each optionally repeating.
  const [reminders, setReminders] = useState([]);

  // Shared picker state — works for the deadline field AND any reminder row.
  const [activePicker, setActivePicker] = useState(null); // { type: "deadline" } | { type: "reminder", id }
  const [pickerStage, setPickerStage] = useState("date"); // android: date -> time
  const [tempPickerDate, setTempPickerDate] = useState(new Date());

  const clearFieldError = useCallback((field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleTitleChange = useCallback((v) => { setTitle(v); clearFieldError("title"); }, [clearFieldError]);
  const handleSubjectChange = useCallback((v) => { setSubject(v); clearFieldError("subject"); }, [clearFieldError]);
  const handleWebDeadlineChange = useCallback((v) => { setWebDeadlineText(v); clearFieldError("deadline"); }, [clearFieldError]);

  /* ---------------------------- Deadline picker ---------------------------- */
  const openDeadlinePicker = useCallback(() => {
    clearFieldError("deadline");
    // Seed the picker with the existing deadline, or today at midnight so
    // the wheel/calendar opens sitting exactly on a valid, selectable day.
    setTempPickerDate(deadlineDate || startOfToday());
    setPickerStage("date");
    setActivePicker({ type: "deadline" });
  }, [deadlineDate, clearFieldError]);

  /* ---------------------------- Reminder rows ---------------------------- */
  const addReminder = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    tap();
    const id = nextReminderId();
    setReminders((prev) => [
      ...prev,
      { id, dateTime: null, repeat: "none", webDate: "", webTime: "" },
    ]);
    if (!isWeb) {
      setTempPickerDate(new Date(Date.now() + 60 * 60 * 1000)); // default: 1 hour from now
      setPickerStage("date");
      setActivePicker({ type: "reminder", id });
    }
  }, []);

  const removeReminder = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateReminder = useCallback((id, patch) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const openReminderPicker = useCallback((id, existingDateTime) => {
    setTempPickerDate(existingDateTime || new Date(Date.now() + 60 * 60 * 1000));
    setPickerStage("date");
    setActivePicker({ type: "reminder", id });
  }, []);

  /* ---------------------------- Shared picker logic ---------------------------- */
  const closePicker = useCallback(() => {
    setActivePicker(null);
    setPickerStage("date");
  }, []);

  const handlePickerChange = useCallback(
    (event, selectedValue) => {
      if (event.type === "dismissed") {
        closePicker();
        return;
      }
      if (!activePicker) return;

      if (Platform.OS === "ios") {
        // iOS spinner fires continuously — track live, close via "Done".
        if (!selectedValue) return;
        setTempPickerDate(selectedValue);
        if (activePicker.type === "deadline") {
          setDeadlineDate(selectedValue);
        } else {
          updateReminder(activePicker.id, { dateTime: selectedValue });
        }
        return;
      }

      // Android
      if (activePicker.type === "deadline") {
  if (selectedValue) {
    const picked = new Date(selectedValue);

    // Keep today's date valid
    picked.setHours(23, 59, 59, 999);

    setDeadlineDate(picked);
  }

  closePicker();
  return;
}

      // Android reminder — two-step: date, then time
      if (pickerStage === "date") {
        const updated = selectedValue || tempPickerDate;
        setTempPickerDate(updated);
        setPickerStage("time");
      } else {
        const finalDateTime = selectedValue || tempPickerDate;
        updateReminder(activePicker.id, { dateTime: finalDateTime });
        closePicker();
      }
    },
    [activePicker, pickerStage, tempPickerDate, closePicker, updateReminder]
  );

  const resetForm = useCallback(() => {
    setTitle("");
    setSubject("");
    setDescription("");
    setPriority("medium");
    setDeadlineDate(null);
    setWebDeadlineText("");
    setReminders([]);
    setErrors({});
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    const fieldErrors = {};
    if (!title.trim()) fieldErrors.title = "Title is required";
    if (!subject.trim()) fieldErrors.subject = "Subject is required";

    let finalDeadline = deadlineDate;
    if (isWeb) {
      finalDeadline = normalizeDayFirstDate(webDeadlineText);
      if (!webDeadlineText.trim()) fieldErrors.deadline = "Deadline is required";
      else if (!finalDeadline) fieldErrors.deadline = "Use DD-MM-YYYY, e.g. 20-07-2026";
    } else if (!finalDeadline) {
      fieldErrors.deadline = "Deadline is required";
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      tapWarning();
      Alert.alert("Missing Fields", "Please check the highlighted fields.");
      return;
    }

    // Resolve reminders — skip rows the user never finished filling in.
    const resolvedReminders = [];
    for (let i = 0; i < reminders.length; i++) {
      const r = reminders[i];
      let dateTime = r.dateTime;

      if (isWeb) {
        if (!r.webDate.trim() && !r.webTime.trim()) continue; // untouched row, skip silently
        const datePart = normalizeDayFirstDate(r.webDate);
        const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(r.webTime.trim());
        if (!datePart || !timeMatch) {
          tapWarning();
          Alert.alert(
            "Invalid Reminder",
            `Reminder ${i + 1}: use DD-MM-YYYY for date and HH:MM (24-hour) for time.`
          );
          return;
        }
        datePart.setHours(Number(timeMatch[1]), Number(timeMatch[2]));
        dateTime = datePart;
      } else if (!dateTime) {
        continue; // row added but never picked, skip
      }

      if (r.repeat === "none" && dateTime <= new Date()) {
        tapWarning();
        Alert.alert("Invalid Reminder", `Reminder ${i + 1}: pick a time in the future.`);
        return;
      }

      resolvedReminders.push({ dateTime, repeat: r.repeat });
    }

    const deadlineLabel = formatDDMMYYYY(finalDeadline);

    try {
      setIsSaving(true);

      // scheduleAssignmentReminders() asks for permission (and alerts the
      // user if denied) internally, so no need to duplicate that here.
      const scheduledReminders = await scheduleAssignmentReminders(
        { title: title.trim(), subject: subject.trim(), deadlineLabel },
        resolvedReminders
      );

      const newAssignment = {
        title: title.trim(),
        subject: subject.trim(),
        deadline: toISODate(finalDeadline),
        description: description.trim(),
        priority,
        status: "pending",
        reminderNotifications: scheduledReminders, // keep these to cancel later if needed
      };

      await addAssignment(newAssignment);
      resetForm();
      tapSuccess();
      Alert.alert("Success", "Assignment added successfully! 🎉");
      navigation.navigate("HomeTab");
    } catch (err) {
      tapWarning();
      Alert.alert("Something went wrong", "Couldn't save the assignment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    title,
    subject,
    deadlineDate,
    webDeadlineText,
    description,
    priority,
    reminders,
    addAssignment,
    navigation,
    resetForm,
  ]);

  const showNativePicker = activePicker && !isWeb;
  const nativePickerMode =
    activePicker?.type === "deadline" ? "date" : Platform.OS === "ios" ? "datetime" : pickerStage;

  // --- THE FIX -------------------------------------------------------
  // Only clamp to the exact current moment when we're on Android's
  // time-selection stage for a reminder (there, a same-day past time is
  // genuinely invalid and worth blocking at the UI level). Every other
  // case — deadline date picking, and iOS's combined datetime spinner —
  // uses the start of today, so "today" itself is always selectable.
  // Past-time reminders still get caught by validation in handleSave.
  const pickerMinimumDate = useMemo(() => {
    const isAndroidReminderTimeStage =
      Platform.OS === "android" && activePicker?.type === "reminder" && pickerStage === "time";
    return isAndroidReminderTimeStage ? new Date() : startOfToday();
    // Re-derive whenever the picker opens/changes stage so "now" stays fresh.
  }, [activePicker, pickerStage]);

  const containerStyle = useMemo(
    () => [styles.container, { maxWidth: isTablet ? 640 : undefined, alignSelf: "center", width: "100%" }],
    [isTablet]
  );

  const handlePriorityLow = useCallback(() => setPriority("low"), []);
  const handlePriorityMedium = useCallback(() => setPriority("medium"), []);
  const handlePriorityHigh = useCallback(() => setPriority("high"), []);
  const priorityHandlers = { low: handlePriorityLow, medium: handlePriorityMedium, high: handlePriorityHigh };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={containerStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeInUp index={0}>
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={[styles.headerBanner, HEADER_SHADOW]}
            >
              <View style={styles.headerIconWrap}>
                <Ionicons name="document-text" size={22} color={colors.textOnPrimary} />
              </View>
              <View style={styles.flexShrink}>
                <Text style={styles.heading}>Add New Assignment</Text>
                <Text style={styles.subheading}>Enter assignment details below</Text>
              </View>
            </LinearGradient>
          </FadeInUp>

          <FadeInUp index={1}>
            <FormField label="Assignment Title" error={errors.title}>
              <AnimatedInput
                placeholder="e.g. Chapter 5 Problem Set"
                value={title}
                onChangeText={handleTitleChange}
                error={errors.title}
                returnKeyType="next"
                accessibilityLabel="Assignment title"
              />
            </FormField>
          </FadeInUp>

          <FadeInUp index={2}>
            <FormField label="Subject" error={errors.subject}>
              <AnimatedInput
                placeholder="e.g. Mathematics"
                value={subject}
                onChangeText={handleSubjectChange}
                error={errors.subject}
                returnKeyType="next"
                accessibilityLabel="Subject"
              />
            </FormField>
          </FadeInUp>

          <FadeInUp index={3}>
            <FormField label="Deadline" error={errors.deadline}>
              {isWeb ? (
                <AnimatedInput
                  placeholder="DD-MM-YYYY, e.g. 20-07-2026"
                  value={webDeadlineText}
                  onChangeText={handleWebDeadlineChange}
                  error={errors.deadline}
                  returnKeyType="next"
                  accessibilityLabel="Deadline date, day month year"
                />
              ) : (
                <ScaleButton
                  style={[styles.dateButton, errors.deadline && styles.inputErrorBg]}
                  onPress={openDeadlinePicker}
                  accessibilityRole="button"
                  accessibilityLabel="Pick deadline date"
                >
                  <View style={styles.dateButtonInner}>
                    <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
                    <Text style={[styles.dateButtonText, !deadlineDate && styles.placeholderText]}>
                      {deadlineDate ? formatDDMMYYYY(deadlineDate) : "Select date (Day - Month - Year)"}
                    </Text>
                  </View>
                </ScaleButton>
              )}
            </FormField>
          </FadeInUp>

          <FadeInUp index={4}>
            <FormField label="Priority">
              <View style={styles.priorityRow}>
                {PRIORITIES.map((p) => (
                  <PriorityChip
                    key={p.value}
                    item={p}
                    selected={priority === p.value}
                    onPress={priorityHandlers[p.value]}
                  />
                ))}
              </View>
            </FormField>
          </FadeInUp>

          <FadeInUp index={5}>
            <FormField label="Description (optional)">
              <AnimatedInput
                placeholder="Write assignment details"
                value={description}
                onChangeText={setDescription}
                multiline
                accessibilityLabel="Description"
              />
            </FormField>
          </FadeInUp>

          <FadeInUp index={6}>
            <FormField label={`Reminders${reminders.length ? ` (${reminders.length})` : " (optional)"}`}>
              <Text style={styles.helperText}>
                Add one or more reminders. Set a reminder to repeat Daily or Weekly if you want
                recurring nudges instead of a one-time alert.
              </Text>

              {reminders.map((reminder, i) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  index={i}
                  onRemove={() => removeReminder(reminder.id)}
                  onUpdate={(patch) => updateReminder(reminder.id, patch)}
                  onPickDateTime={() => openReminderPicker(reminder.id, reminder.dateTime)}
                />
              ))}

              <ScaleButton
                style={styles.addReminderButton}
                onPress={addReminder}
                haptic={false}
                accessibilityRole="button"
                accessibilityLabel="Add another reminder"
              >
                <View style={styles.buttonInner}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primaryDark} />
                  <Text style={styles.addReminderText}>Add Reminder</Text>
                </View>
              </ScaleButton>
            </FormField>
          </FadeInUp>

          <FadeInUp index={7}>
            <ScaleButton
              style={[styles.saveButton, SAVE_SHADOW, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              haptic={false}
              accessibilityRole="button"
              accessibilityLabel="Save assignment"
              accessibilityState={{ disabled: isSaving }}
            >
              <View style={styles.buttonInner}>
                {isSaving ? (
                  <ActivityIndicator color={colors.textOnPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={19} color={colors.textOnPrimary} />
                    <Text style={styles.saveButtonText}>Save Assignment</Text>
                  </>
                )}
              </View>
            </ScaleButton>
          </FadeInUp>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Android: DateTimePicker renders its own native OS dialog, so no
          wrapper is needed — it already overlays the whole screen. */}
      {showNativePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={tempPickerDate}
          mode={nativePickerMode}
          is24Hour={false}
          display="default"
          onChange={handlePickerChange}
          minimumDate={pickerMinimumDate}
          themeVariant="light"
        />
      )}

      {/* iOS: bottom-sheet Modal — anchored to the screen, not the
          ScrollView, so it always appears right where you're looking
          regardless of how far down the form you've scrolled. */}
      <PickerSheet
        visible={!!(showNativePicker && Platform.OS === "ios")}
        title={activePicker?.type === "deadline" ? "Set Deadline" : "Set Reminder"}
        onDone={closePicker}
      >
        {showNativePicker && Platform.OS === "ios" && (
          <DateTimePicker
            value={tempPickerDate}
            mode={nativePickerMode}
            display="spinner"
            onChange={handlePickerChange}
            minimumDate={pickerMinimumDate}
            themeVariant="light"
            textColor={colors.textPrimary}
            style={styles.iosPicker}
          />
        )}
      </PickerSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  container: { padding: spacing.xl, paddingBottom: 40 },
  headerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl - 2,
    borderRadius: radius.xl,
    marginBottom: spacing.xxl - 6,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { fontSize: 20, fontWeight: "800", color: colors.textOnPrimary, marginBottom: 2 },
  subheading: { fontSize: 13, color: colors.textOnPrimarySoft },
  fieldWrap: { marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: spacing.sm },
  helperText: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md - 2, lineHeight: 17 },

  // AnimatedInput: outer wrapper carries the animated border, inner
  // TextInput stays borderless/transparent so only one border ever shows.
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md + 2,
  },
  inputInner: {
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputErrorBg: { backgroundColor: colors.dangerBg },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  errorText: { fontSize: 12, color: colors.danger, fontWeight: "500" },
  textArea: { minHeight: 110 },

  dateButton: {
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  dateButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.md + 2,
  },
  dateButtonText: { color: colors.primaryDark, fontSize: 14, fontWeight: "600" },
  placeholderText: { color: "#60a5fa", fontWeight: "500" },

  priorityRow: { flexDirection: "row", gap: spacing.sm },
  priorityChip: {
    flex: 1,
    borderRadius: radius.md - 2,
    borderWidth: 1.5,
  },
  priorityChipInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm + 2,
  },
  priorityChipText: { fontSize: 13, fontWeight: "700" },
  priorityCheck: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.surface,
  },

  reminderRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg - 2,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  reminderRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm - 2,
    marginBottom: spacing.sm,
  },
  reminderIndexBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderIndexBadgeText: { fontSize: 11, fontWeight: "800", color: colors.primary },
  reminderIndex: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  reminderRemoveBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.dangerBg,
    alignItems: "center",
    justifyContent: "center",
  },
  webReminderInputs: { flexDirection: "row", gap: spacing.sm },
  webReminderInput: { flex: 1 },
  repeatRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  repeatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  repeatChipActive: { backgroundColor: colors.primary },
  repeatChipText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  repeatChipTextActive: { color: colors.textOnPrimary },

  addReminderButton: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
    borderStyle: "dashed",
    paddingVertical: spacing.md,
  },
  addReminderText: { color: colors.primaryDark, fontSize: 13, fontWeight: "700" },

  // Bottom sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: "hidden",
    paddingBottom: spacing.xl,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: spacing.sm,
  },
  iosPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  iosPickerTitle: { fontSize: 15, fontWeight: "700", color: "#334155" },
  iosPickerDone: { fontSize: 15, fontWeight: "700", color: colors.primary },
  iosPicker: { backgroundColor: colors.surface, height: 200 },

  buttonInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg - 1,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: colors.textOnPrimary, fontSize: 16, fontWeight: "700" },
});