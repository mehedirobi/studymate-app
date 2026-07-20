import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  cancelAssignmentReminder,
  scheduleAssignmentReminder,
} from "../utils/notificationHelper";

const PRIORITY_META = {
  low: { label: "Low Priority", color: "#16a34a", bg: "#f0fdf4" },
  medium: { label: "Medium Priority", color: "#d97706", bg: "#fffbeb" },
  high: { label: "High Priority", color: "#dc2626", bg: "#fef2f2" },
};

const PRIORITY_OPTIONS = ["low", "medium", "high"];

// (minutes-before-deadline, display label)
const REMINDER_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 180, label: "3 hours" },
  { value: 1440, label: "1 day" },
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
      color: "#dc2626",
    };
  }
  if (diff === 0) {
    return { label: "Due Today", icon: "flame", color: "#dc2626" };
  }
  if (diff === 1) {
    return { label: "1 Day Left", icon: "time", color: "#d97706" };
  }
  return { label: `${diff} Days Left`, icon: "time-outline", color: "#2563eb" };
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

const formatReminderLabel = (minutes) => {
  const match = REMINDER_OPTIONS.find((option) => option.value === minutes);
  return match ? `${match.label} before deadline` : "Reminder on";
};

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

function InfoRow({ icon, label, value, isLast }) {
  return (
    <>
      <View style={styles.infoRow}>
        <View style={styles.infoIconWrap}>
          <Ionicons name={icon} size={18} color="#2563eb" />
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
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={24} color="#0f172a" />
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

    toggleAssignmentStatus(assignment.id);
    handleBack();
  }, [assignment, toggleAssignmentStatus, handleBack]);

  const startEditing = useCallback(() => {
    if (!assignment) return;
    setForm({
      title: assignment.title,
      subject: assignment.subject,
      description: assignment.description || "",
      deadline: new Date(assignment.deadline),
      priority: assignment.priority || "medium",
      reminderEnabled: Boolean(assignment.reminderEnabled),
      reminderMinutesBefore: assignment.reminderMinutesBefore || 60,
    });
    setIsEditing(true);
  }, [assignment]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setShowPicker(false);
    setForm(null);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!assignment || !form) return;

    const trimmedTitle = form.title.trim();
    const trimmedSubject = form.subject.trim();

    if (!trimmedTitle || !trimmedSubject) {
      Alert.alert("Missing Information", "Title and subject can't be empty.");
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
    };

    updateAssignment(assignment.id, updatedAssignment);

    // Keep the scheduled notification in sync with the edited assignment.
    if (form.reminderEnabled) {
      scheduleAssignmentReminder({
        id: assignment.id,
        title: trimmedTitle,
        deadline: form.deadline.toISOString(),
        minutesBefore: form.reminderMinutesBefore,
      });
    } else {
      cancelAssignmentReminder(assignment.id);
    }

    setIsEditing(false);
    setShowPicker(false);
    setForm(null);
  }, [assignment, form, updateAssignment]);

  const onChangeDate = useCallback((event, selectedDate) => {
    setShowPicker(Platform.OS === "ios");
    if (selectedDate) {
      setForm((prev) => (prev ? { ...prev, deadline: selectedDate } : prev));
    }
  }, []);

  const toggleReminderEnabled = useCallback((value) => {
    setForm((prev) => (prev ? { ...prev, reminderEnabled: value } : prev));
  }, []);

  const setReminderOffset = useCallback((minutes) => {
    setForm((prev) => (prev ? { ...prev, reminderMinutesBefore: minutes } : prev));
  }, []);

  // Edge case: assignment was deleted elsewhere, or a stale id was passed
  if (!assignment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScreenHeader onBack={handleBack} title="Assignment" />
        <View style={styles.container}>
          <View style={styles.notFoundBox}>
            <Ionicons name="document-outline" size={40} color="#94a3b8" />
            <Text style={styles.notFoundText}>Assignment not found</Text>
            <Text style={styles.notFoundSubtext}>
              It may have already been deleted.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={goToHome}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
          >
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
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
      return { label: "Overdue", color: "#dc2626", bg: "#fef2f2", icon: "alert-circle" };
    }
    if (isCompleted) {
      return { label: "Completed", color: "#16a34a", bg: "#f0fdf4", icon: "checkmark-circle" };
    }
    return { label: "Pending", color: "#f97316", bg: "#fff7ed", icon: "ellipse-outline" };
  }, [assignment.deadline, assignment.status]);

  const isCompleted = assignment.status === "completed";

  const countdown = useMemo(
    () => getCountdownInfo(assignment.deadline),
    [assignment.deadline]
  );

  const priorityMeta = PRIORITY_META[assignment.priority] || null;

  const reminderValue = assignment.reminderEnabled
    ? formatReminderLabel(assignment.reminderMinutesBefore)
    : "No reminder set";

  // ---------------- EDIT MODE ----------------
  if (isEditing && form) {
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
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(text) => setForm((prev) => ({ ...prev, title: text }))}
              placeholder="Assignment title"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              value={form.subject}
              onChangeText={(text) => setForm((prev) => ({ ...prev, subject: text }))}
              placeholder="Subject"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Deadline</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Change deadline"
            >
              <Ionicons name="calendar-outline" size={18} color="#2563eb" />
              <Text style={styles.dateInputText}>{formatDeadline(form.deadline)}</Text>
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={form.deadline}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={onChangeDate}
                themeVariant="light"
              />
            )}

            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((option) => {
                const meta = PRIORITY_META[option];
                const selected = form.priority === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.priorityOption,
                      { borderColor: meta.color },
                      selected && { backgroundColor: meta.bg },
                    ]}
                    onPress={() => setForm((prev) => ({ ...prev, priority: option }))}
                    accessibilityRole="button"
                    accessibilityLabel={`Set priority ${meta.label}`}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: meta.color }]} />
                    <Text style={[styles.priorityOptionText, { color: meta.color }]}>
                      {meta.label.replace(" Priority", "")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
              placeholder="Optional description"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.reminderHeaderRow}>
              <Text style={[styles.fieldLabel, { marginTop: 0 }]}>Reminder Notification</Text>
              <Switch
                value={form.reminderEnabled}
                onValueChange={toggleReminderEnabled}
                trackColor={{ false: "#e2e8f0", true: "#bfdbfe" }}
                thumbColor={form.reminderEnabled ? "#2563eb" : "#f4f4f5"}
                accessibilityLabel="Toggle reminder notification"
              />
            </View>

            {form.reminderEnabled && (
              <View style={styles.priorityRow}>
                {REMINDER_OPTIONS.map((option) => {
                  const selected = form.reminderMinutesBefore === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.priorityOption,
                        { borderColor: "#2563eb" },
                        selected && { backgroundColor: "#eff6ff" },
                      ]}
                      onPress={() => setReminderOffset(option.value)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remind ${option.label} before deadline`}
                    >
                      <Text style={[styles.priorityOptionText, { color: "#2563eb" }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleSaveEdit}
              accessibilityRole="button"
              accessibilityLabel="Save changes"
            >
              <Ionicons name="checkmark" size={19} color="#fff" />
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeButton}
              onPress={cancelEditing}
              accessibilityRole="button"
              accessibilityLabel="Cancel editing"
            >
              <Text style={styles.homeButtonText}>Cancel</Text>
            </TouchableOpacity>
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
            onPress={startEditing}
            accessibilityRole="button"
            accessibilityLabel="Edit assignment"
          >
            <Ionicons name="create-outline" size={20} color="#2563eb" />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.title}>{assignment.title}</Text>
          <View style={styles.badgeRow}>
            <Badge {...badgeMeta} />
            {priorityMeta && <Badge {...priorityMeta} dot />}
          </View>
        </View>

        <View style={[styles.countdownCard, { backgroundColor: `${countdown.color}12` }]}>
          <Ionicons name={countdown.icon} size={22} color={countdown.color} />
          <Text style={[styles.countdownText, { color: countdown.color }]}>
            {countdown.label}
          </Text>
        </View>

        <View style={styles.card}>
          <InfoRow icon="book-outline" label="Subject" value={assignment.subject} />
          <InfoRow icon="calendar-outline" label="Deadline" value={formatDeadline(assignment.deadline)} />
          <InfoRow icon="notifications-outline" label="Reminder" value={reminderValue} />
          <InfoRow
            icon="document-text-outline"
            label="Description"
            value={assignment.description || "No description provided"}
            isLast
          />
        </View>

        <TouchableOpacity
          style={[styles.completeButton, isCompleted && styles.undoButton]}
          onPress={handleToggleStatus}
          accessibilityRole="button"
          accessibilityLabel={isCompleted ? "Mark as pending" : "Mark as completed"}
        >
          <Ionicons
            name={isCompleted ? "arrow-undo" : "checkmark-circle"}
            size={19}
            color="#fff"
          />
          <Text style={styles.buttonText}>
            {isCompleted ? "Mark as Pending" : "Mark as Completed"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete assignment"
        >
          <Ionicons name="trash-outline" size={19} color="#fff" />
          <Text style={styles.buttonText}>Delete Assignment</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  container: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
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
    color: "#0f172a",
    textAlign: "center",
    marginHorizontal: 4,
  },
  screenHeaderRight: { width: 36, alignItems: "flex-end" },
  headerBlock: { marginBottom: 16 },
  title: { fontSize: 25, fontWeight: "800", color: "#0f172a", marginBottom: 10 },
  editIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
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
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  countdownText: { fontSize: 16, fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
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
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoTextWrap: { flex: 1 },
  divider: { height: 1, backgroundColor: "#f1f5f9" },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  value: { fontSize: 15, color: "#0f172a", lineHeight: 21 },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  undoButton: { backgroundColor: "#64748b" },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#dc2626",
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  homeButton: { backgroundColor: "#0f172a", paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  homeButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  notFoundBox: {
    backgroundColor: "#fff",
    padding: 28,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 60,
    marginBottom: 24,
    gap: 8,
  },
  notFoundText: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  notFoundSubtext: { fontSize: 14, color: "#64748b" },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  textArea: { minHeight: 100 },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateInputText: { fontSize: 15, color: "#0f172a" },
  priorityRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  priorityOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  priorityOptionText: { fontSize: 12, fontWeight: "700" },
  reminderHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 8,
  },
});