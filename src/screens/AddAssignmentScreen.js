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
  UIManager,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import { scheduleAssignmentReminders } from "../utils/notificationHelper";

const isWeb = Platform.OS === "web";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const REPEAT_OPTIONS = [
  { value: "none", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "#16a34a", bg: "#f0fdf4" },
  { value: "medium", label: "Medium", color: "#d97706", bg: "#fffbeb" },
  { value: "high", label: "High", color: "#dc2626", bg: "#fef2f2" },
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

function ScaleButton({ onPress, style, disabled, children, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
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

// Small reusable field wrapper — keeps label + input + inline error consistent.
function FormField({ label, error, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
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
    setTempPickerDate(deadlineDate || new Date());
    setPickerStage("date");
    setActivePicker({ type: "deadline" });
  }, [deadlineDate, clearFieldError]);

  /* ---------------------------- Reminder rows ---------------------------- */
  const addReminder = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
        setDeadlineDate(selectedValue || tempPickerDate);
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

  const resetForm = () => {
    setTitle("");
    setSubject("");
    setDescription("");
    setPriority("medium");
    setDeadlineDate(null);
    setWebDeadlineText("");
    setReminders([]);
    setErrors({});
  };

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
      Alert.alert("Success", "Assignment added successfully! 🎉");
      navigation.navigate("HomeTab");
    } catch (err) {
      Alert.alert("Something went wrong", "Couldn't save the assignment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, title, subject, deadlineDate, webDeadlineText, description, priority, reminders, addAssignment, navigation]);

  const showNativePicker = activePicker && !isWeb;
  const nativePickerMode =
    activePicker?.type === "deadline" ? "date" : Platform.OS === "ios" ? "datetime" : pickerStage;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { maxWidth: isTablet ? 640 : undefined, alignSelf: "center", width: "100%" },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeInUp index={0}>
            <LinearGradient
              colors={["#2563eb", "#4f46e5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerBanner}
            >
              <View style={styles.headerIconWrap}>
                <Ionicons name="document-text" size={22} color="#fff" />
              </View>
              <View style={styles.flexShrink}>
                <Text style={styles.heading}>Add New Assignment</Text>
                <Text style={styles.subheading}>Enter assignment details below</Text>
              </View>
            </LinearGradient>
          </FadeInUp>

          <FadeInUp index={1}>
            <FormField label="Assignment Title" error={errors.title}>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                placeholder="e.g. Chapter 5 Problem Set"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={handleTitleChange}
                returnKeyType="next"
                accessibilityLabel="Assignment title"
              />
            </FormField>
          </FadeInUp>

          <FadeInUp index={2}>
            <FormField label="Subject" error={errors.subject}>
              <TextInput
                style={[styles.input, errors.subject && styles.inputError]}
                placeholder="e.g. Mathematics"
                placeholderTextColor="#94a3b8"
                value={subject}
                onChangeText={handleSubjectChange}
                returnKeyType="next"
                accessibilityLabel="Subject"
              />
            </FormField>
          </FadeInUp>

          <FadeInUp index={3}>
            <FormField label="Deadline" error={errors.deadline}>
              {isWeb ? (
                <TextInput
                  style={[styles.input, errors.deadline && styles.inputError]}
                  placeholder="DD-MM-YYYY, e.g. 20-07-2026"
                  placeholderTextColor="#94a3b8"
                  value={webDeadlineText}
                  onChangeText={handleWebDeadlineChange}
                  returnKeyType="next"
                  accessibilityLabel="Deadline date, day month year"
                />
              ) : (
                <TouchableOpacity
                  style={[styles.dateButton, errors.deadline && styles.inputError]}
                  onPress={openDeadlinePicker}
                  accessibilityRole="button"
                  accessibilityLabel="Pick deadline date"
                >
                  <Ionicons name="calendar-outline" size={18} color="#1d4ed8" />
                  <Text style={[styles.dateButtonText, !deadlineDate && styles.placeholderText]}>
                    {deadlineDate ? formatDDMMYYYY(deadlineDate) : "Select date (Day - Month - Year)"}
                  </Text>
                </TouchableOpacity>
              )}
            </FormField>
          </FadeInUp>

          <FadeInUp index={4}>
            <FormField label="Priority">
              <View style={styles.priorityRow}>
                {PRIORITIES.map((p) => {
                  const selected = priority === p.value;
                  return (
                    <ScaleButton
                      key={p.value}
                      style={[
                        styles.priorityChip,
                        { backgroundColor: selected ? p.bg : "#f8fafc", borderColor: selected ? p.color : "#e2e8f0" },
                      ]}
                      onPress={() => setPriority(p.value)}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.label} priority`}
                      accessibilityState={{ selected }}
                    >
                      <View style={styles.priorityChipInner}>
                        <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                        <Text style={[styles.priorityChipText, { color: selected ? p.color : "#64748b" }]}>
                          {p.label}
                        </Text>
                      </View>
                    </ScaleButton>
                  );
                })}
              </View>
            </FormField>
          </FadeInUp>

          <FadeInUp index={5}>
            <FormField label="Description (optional)">
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write assignment details"
                placeholderTextColor="#94a3b8"
                value={description}
                onChangeText={setDescription}
                multiline
                accessibilityLabel="Description"
              />
            </FormField>
          </FadeInUp>

          <FadeInUp index={6}>
            <FormField label="Reminders (optional)">
              <Text style={styles.helperText}>
                Add one or more reminders. Set a reminder to repeat Daily or Weekly if you want
                recurring nudges instead of a one-time alert.
              </Text>

              {reminders.map((reminder, i) => (
                <View key={reminder.id} style={styles.reminderRow}>
                  <View style={styles.reminderRowTop}>
                    <Text style={styles.reminderIndex}>Reminder {i + 1}</Text>
                    <TouchableOpacity
                      onPress={() => removeReminder(reminder.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove reminder ${i + 1}`}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    </TouchableOpacity>
                  </View>

                  {isWeb ? (
                    <View style={styles.webReminderInputs}>
                      <TextInput
                        style={[styles.input, styles.webReminderInput]}
                        placeholder="DD-MM-YYYY"
                        placeholderTextColor="#94a3b8"
                        value={reminder.webDate}
                        onChangeText={(v) => updateReminder(reminder.id, { webDate: v })}
                        accessibilityLabel={`Reminder ${i + 1} date`}
                      />
                      <TextInput
                        style={[styles.input, styles.webReminderInput]}
                        placeholder="HH:MM"
                        placeholderTextColor="#94a3b8"
                        value={reminder.webTime}
                        onChangeText={(v) => updateReminder(reminder.id, { webTime: v })}
                        accessibilityLabel={`Reminder ${i + 1} time`}
                      />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => openReminderPicker(reminder.id, reminder.dateTime)}
                      accessibilityRole="button"
                      accessibilityLabel={`Pick date and time for reminder ${i + 1}`}
                    >
                      <Ionicons
                        name={reminder.dateTime ? "notifications" : "notifications-outline"}
                        size={18}
                        color="#1d4ed8"
                      />
                      <Text style={[styles.dateButtonText, !reminder.dateTime && styles.placeholderText]}>
                        {reminder.dateTime
                          ? `${formatDDMMYYYY(reminder.dateTime)} at ${formatTime(reminder.dateTime)}`
                          : "Select date & time"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.repeatRow}>
                    {REPEAT_OPTIONS.map((opt) => {
                      const active = reminder.repeat === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.repeatChip, active && styles.repeatChipActive]}
                          onPress={() => updateReminder(reminder.id, { repeat: opt.value })}
                          accessibilityRole="button"
                          accessibilityLabel={`Repeat ${opt.label}`}
                          accessibilityState={{ selected: active }}
                        >
                          <Text style={[styles.repeatChipText, active && styles.repeatChipTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addReminderButton}
                onPress={addReminder}
                accessibilityRole="button"
                accessibilityLabel="Add another reminder"
              >
                <Ionicons name="add-circle-outline" size={18} color="#1d4ed8" />
                <Text style={styles.addReminderText}>Add Reminder</Text>
              </TouchableOpacity>
            </FormField>
          </FadeInUp>

          {showNativePicker && Platform.OS === "android" && (
            <DateTimePicker
              value={tempPickerDate}
              mode={nativePickerMode}
              is24Hour={false}
              display="default"
              onChange={handlePickerChange}
              minimumDate={new Date()}
              themeVariant="light"
            />
          )}

          {showNativePicker && Platform.OS === "ios" && (
            <View style={styles.iosPickerCard}>
              <View style={styles.iosPickerHeader}>
                <Text style={styles.iosPickerTitle}>
                  {activePicker.type === "deadline" ? "Set Deadline" : "Set Reminder"}
                </Text>
                <TouchableOpacity onPress={closePicker} accessibilityRole="button" accessibilityLabel="Done">
                  <Text style={styles.iosPickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempPickerDate}
                mode={nativePickerMode}
                display="spinner"
                onChange={handlePickerChange}
                minimumDate={new Date()}
                themeVariant="light"
                textColor="#0f172a"
                style={styles.iosPicker}
              />
            </View>
          )}

          <FadeInUp index={7}>
            <ScaleButton
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Save assignment"
              accessibilityState={{ disabled: isSaving }}
            >
              <View style={styles.buttonInner}>
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={19} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Assignment</Text>
                  </>
                )}
              </View>
            </ScaleButton>
          </FadeInUp>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  container: { padding: 20, paddingBottom: 40 },
  headerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    borderRadius: 20,
    marginBottom: 22,
    shadowColor: "#4338ca",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 2 },
  subheading: { fontSize: 13, color: "#dbeafe" },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: 8 },
  helperText: { fontSize: 12, color: "#64748b", marginBottom: 10, lineHeight: 17 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0f172a",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  inputError: { borderColor: "#fca5a5", backgroundColor: "#fef2f2" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  errorText: { fontSize: 12, color: "#dc2626", fontWeight: "500" },
  textArea: { minHeight: 110, textAlignVertical: "top" },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  dateButtonText: { color: "#1d4ed8", fontSize: 14, fontWeight: "600" },
  placeholderText: { color: "#60a5fa", fontWeight: "500" },
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  priorityChipInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityChipText: { fontSize: 13, fontWeight: "700" },
  reminderRow: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  reminderRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reminderIndex: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  webReminderInputs: { flexDirection: "row", gap: 8 },
  webReminderInput: { flex: 1 },
  repeatRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  repeatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  repeatChipActive: { backgroundColor: "#2563eb" },
  repeatChipText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  repeatChipTextActive: { color: "#fff" },
  addReminderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
    borderStyle: "dashed",
  },
  addReminderText: { color: "#1d4ed8", fontSize: 13, fontWeight: "700" },
  iosPickerCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  iosPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  iosPickerTitle: { fontSize: 14, fontWeight: "700", color: "#334155" },
  iosPickerDone: { fontSize: 14, fontWeight: "700", color: "#2563eb" },
  iosPicker: { backgroundColor: "#fff", height: 180 },
  buttonInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});