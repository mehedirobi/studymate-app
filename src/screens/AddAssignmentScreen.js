import { useCallback, useMemo, useState } from "react";
import {
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

const isWeb = Platform.OS === "web";

// Accepts YYYY-M-D, YYYY-MM-D, YYYY-M-DD, YYYY-MM-DD
const DATE_REGEX = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

const PRIORITIES = [
  { value: "low", label: "Low", color: "#16a34a", bg: "#f0fdf4" },
  { value: "medium", label: "Medium", color: "#d97706", bg: "#fffbeb" },
  { value: "high", label: "High", color: "#dc2626", bg: "#fef2f2" },
];

// Converts "2026-7-15" -> "2026-07-15". Returns null if invalid.
const normalizeDeadline = (value) => {
  const match = DATE_REGEX.exec(value.trim());
  if (!match) return null;

  const [, year, month, day] = match;
  const monthNum = Number(month);
  const dayNum = Number(day);

  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;

  const paddedMonth = month.padStart(2, "0");
  const paddedDay = day.padStart(2, "0");
  const normalized = `${year}-${paddedMonth}-${paddedDay}`;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : normalized;
};

// Small reusable field wrapper — keeps label + input + inline error consistent
// without needing a separate file.
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
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [isSaving, setIsSaving] = useState(false);

  // Inline field errors, cleared as the user corrects each field
  const [errors, setErrors] = useState({});

  // Native picker state (Android/iOS)
  const [reminderDateTime, setReminderDateTime] = useState(null);
  const [pickerMode, setPickerMode] = useState(null); // "date" | "time" | null
  const [tempPickerDate, setTempPickerDate] = useState(new Date());

  // Web fallback state (plain text entry)
  const [webReminderDate, setWebReminderDate] = useState("");
  const [webReminderTime, setWebReminderTime] = useState("");

  const clearFieldError = useCallback((field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleTitleChange = useCallback(
    (value) => {
      setTitle(value);
      clearFieldError("title");
    },
    [clearFieldError]
  );

  const handleSubjectChange = useCallback(
    (value) => {
      setSubject(value);
      clearFieldError("subject");
    },
    [clearFieldError]
  );

  const handleDeadlineChange = useCallback(
    (value) => {
      setDeadline(value);
      clearFieldError("deadline");
    },
    [clearFieldError]
  );

  const openReminderPicker = useCallback(() => {
    setTempPickerDate(reminderDateTime || new Date());
    setPickerMode("date");
  }, [reminderDateTime]);

  const closePicker = useCallback(() => setPickerMode(null), []);

  const handlePickerChange = useCallback(
    (event, selectedValue) => {
      if (event.type === "dismissed") {
        setPickerMode(null);
        return;
      }

      if (Platform.OS === "ios") {
        // iOS spinner fires onChange continuously as the user scrolls —
        // just track the value, don't close (closing happens via "Done").
        if (selectedValue) {
          setTempPickerDate(selectedValue);
          setReminderDateTime(selectedValue);
        }
        return;
      }

      // Android: date first, then time
      if (pickerMode === "date") {
        const updated = selectedValue || tempPickerDate;
        setTempPickerDate(updated);
        setPickerMode("time");
      } else if (pickerMode === "time") {
        const finalDateTime = selectedValue || tempPickerDate;
        setReminderDateTime(finalDateTime);
        setPickerMode(null);
      }
    },
    [pickerMode, tempPickerDate]
  );

  const clearReminder = useCallback(() => {
    setReminderDateTime(null);
    setWebReminderDate("");
    setWebReminderTime("");
  }, []);

  const formatReminderLabel = (date) => {
    const dateStr = date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr} at ${timeStr}`;
  };

  // Combines webReminderDate ("2026-07-20") + webReminderTime ("14:30") into a Date
  const buildWebReminderDate = () => {
    if (!webReminderDate.trim() || !webReminderTime.trim()) return null;

    const dateParts = webReminderDate.trim().split("-"); // YYYY-MM-DD
    const timeParts = webReminderTime.trim().split(":"); // HH:MM

    if (dateParts.length !== 3 || timeParts.length !== 2) return null;

    const [year, month, day] = dateParts.map(Number);
    const [hour, minute] = timeParts.map(Number);

    if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) {
      return null;
    }

    const composed = new Date(year, month - 1, day, hour, minute);
    return Number.isNaN(composed.getTime()) ? null : composed;
  };

  const resetForm = () => {
    setTitle("");
    setSubject("");
    setDeadline("");
    setDescription("");
    setPriority("medium");
    setReminderDateTime(null);
    setWebReminderDate("");
    setWebReminderTime("");
    setErrors({});
  };

  const handleSave = useCallback(async () => {
    if (isSaving) return; // guard against double-tap

    const fieldErrors = {};
    if (!title.trim()) fieldErrors.title = "Title is required";
    if (!subject.trim()) fieldErrors.subject = "Subject is required";
    if (!deadline.trim()) fieldErrors.deadline = "Deadline is required";

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      Alert.alert("Missing Fields", "Please fill in title, subject, and deadline.");
      return;
    }

    const normalizedDeadline = normalizeDeadline(deadline);

    if (!normalizedDeadline) {
      setErrors({ deadline: "Enter a valid date (e.g. 2026-07-20)" });
      Alert.alert(
        "Invalid Deadline",
        "Deadline must be a valid date like 2026-07-20 or 2026-7-20 (YYYY-M-D)."
      );
      return;
    }

    let finalReminderDateTime = reminderDateTime;

    if (isWeb && (webReminderDate.trim() || webReminderTime.trim())) {
      const composed = buildWebReminderDate();
      if (!composed) {
        Alert.alert(
          "Invalid Reminder",
          "Please enter reminder date as YYYY-MM-DD and time as HH:MM (24-hour), e.g. 2026-07-19 and 14:30."
        );
        return;
      }
      finalReminderDateTime = composed;
    }

    if (finalReminderDateTime && finalReminderDateTime <= new Date()) {
      Alert.alert(
        "Invalid Reminder",
        "Reminder time must be in the future. Please pick a later time."
      );
      return;
    }

    const newAssignment = {
      title: title.trim(),
      subject: subject.trim(),
      deadline: normalizedDeadline,
      description: description.trim(),
      priority,
      status: "pending",
      reminderDateTime: finalReminderDateTime || null,
    };

    try {
      setIsSaving(true);
      await addAssignment(newAssignment);
      resetForm();
      Alert.alert("Success", "Assignment added successfully! 🎉");
      navigation.navigate("HomeTab");
    } catch (err) {
      Alert.alert("Something went wrong", "Couldn't save the assignment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    title,
    subject,
    deadline,
    description,
    priority,
    reminderDateTime,
    webReminderDate,
    webReminderTime,
    addAssignment,
    navigation,
  ]);

  const hasReminder = useMemo(
    () => Boolean(reminderDateTime || webReminderDate || webReminderTime),
    [reminderDateTime, webReminderDate, webReminderTime]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>Add New Assignment</Text>
          <Text style={styles.subheading}>Enter assignment details below</Text>

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

          <FormField label="Deadline" error={errors.deadline}>
            <TextInput
              style={[styles.input, errors.deadline && styles.inputError]}
              placeholder="2026-07-20 or 2026-7-20"
              placeholderTextColor="#94a3b8"
              value={deadline}
              onChangeText={handleDeadlineChange}
              keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
              returnKeyType="next"
              accessibilityLabel="Deadline date"
            />
          </FormField>

          <FormField label="Priority">
            <View style={styles.priorityRow}>
              {PRIORITIES.map((p) => {
                const selected = priority === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.priorityChip,
                      {
                        backgroundColor: selected ? p.bg : "#f8fafc",
                        borderColor: selected ? p.color : "#e2e8f0",
                      },
                    ]}
                    onPress={() => setPriority(p.value)}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.label} priority`}
                    accessibilityState={{ selected }}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                    <Text
                      style={[
                        styles.priorityChipText,
                        { color: selected ? p.color : "#64748b" },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FormField>

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

          <FormField label="Reminder (optional)">
            {isWeb ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Reminder date - YYYY-MM-DD (e.g. 2026-07-19)"
                  placeholderTextColor="#94a3b8"
                  value={webReminderDate}
                  onChangeText={setWebReminderDate}
                  accessibilityLabel="Reminder date"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Reminder time - HH:MM, 24-hour (e.g. 14:30)"
                  placeholderTextColor="#94a3b8"
                  value={webReminderTime}
                  onChangeText={setWebReminderTime}
                  accessibilityLabel="Reminder time"
                />
              </>
            ) : (
              <TouchableOpacity
                style={styles.reminderButton}
                onPress={openReminderPicker}
                accessibilityRole="button"
                accessibilityLabel="Set reminder date and time"
              >
                <Ionicons
                  name={reminderDateTime ? "notifications" : "notifications-outline"}
                  size={18}
                  color="#1d4ed8"
                />
                <Text style={styles.reminderButtonText}>
                  {reminderDateTime
                    ? formatReminderLabel(reminderDateTime)
                    : "Set Reminder Date & Time"}
                </Text>
              </TouchableOpacity>
            )}

            {hasReminder && (
              <TouchableOpacity
                style={styles.clearReminderButton}
                onPress={clearReminder}
                accessibilityRole="button"
                accessibilityLabel="Remove reminder"
              >
                <Ionicons name="close-circle-outline" size={14} color="#dc2626" />
                <Text style={styles.clearReminderText}>Remove Reminder</Text>
              </TouchableOpacity>
            )}
          </FormField>

          {pickerMode && Platform.OS === "android" && (
            <DateTimePicker
              value={tempPickerDate}
              mode={pickerMode}
              is24Hour={false}
              display="default"
              onChange={handlePickerChange}
              minimumDate={new Date()}
              themeVariant="light"
            />
          )}

          {pickerMode && Platform.OS === "ios" && (
            <View style={styles.iosPickerCard}>
              <View style={styles.iosPickerHeader}>
                <Text style={styles.iosPickerTitle}>Set Reminder</Text>
                <TouchableOpacity
                  onPress={closePicker}
                  accessibilityRole="button"
                  accessibilityLabel="Done setting reminder"
                >
                  <Text style={styles.iosPickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempPickerDate}
                mode="datetime"
                display="spinner"
                onChange={handlePickerChange}
                minimumDate={new Date()}
                themeVariant="light"
                textColor="#0f172a"
                style={styles.iosPicker}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Save assignment"
            accessibilityState={{ disabled: isSaving }}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={19} color="#fff" />
                <Text style={styles.saveButtonText}>Save Assignment</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 22,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
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
  inputError: {
    borderColor: "#fca5a5",
    backgroundColor: "#fef2f2",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "500",
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  reminderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  reminderButtonText: {
    color: "#1d4ed8",
    fontSize: 14,
    fontWeight: "600",
  },
  clearReminderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 10,
  },
  clearReminderText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
  },
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
  iosPickerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  iosPickerDone: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563eb",
  },
  iosPicker: {
    backgroundColor: "#fff",
    height: 180,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});