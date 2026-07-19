import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { cancelAssignmentReminder } from "../utils/notificationHelper";

const PRIORITY_META = {
  low: { label: "Low Priority", color: "#16a34a", bg: "#f0fdf4" },
  medium: { label: "Medium Priority", color: "#d97706", bg: "#fffbeb" },
  high: { label: "High Priority", color: "#dc2626", bg: "#fef2f2" },
};

const getCountdownInfo = (deadline) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(deadline);
  due.setHours(0, 0, 0, 0);

  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    return { label: `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"}`, icon: "alert-circle", color: "#dc2626" };
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

export default function AssignmentDetailsScreen({
  route,
  navigation,
  assignments,
  deleteAssignment,
  toggleAssignmentStatus,
}) {
  const { assignmentId } = route.params;
  const assignment = useMemo(
    () => assignments.find((item) => item.id === assignmentId),
    [assignments, assignmentId]
  );

  const goToHome = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "HomeTab" });
  }, [navigation]);

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
          deleteAssignment(assignment.id);
          navigation.goBack();
        },
      },
    ]
  );
}, [assignment, deleteAssignment, navigation]);

  const handleToggleStatus = useCallback(() => {
  if (!assignment) return;

  toggleAssignmentStatus(assignment.id);
  navigation.goBack();
}, [assignment, toggleAssignmentStatus, navigation]);

  // Edge case: assignment was deleted elsewhere, or a stale id was passed
  if (!assignment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(assignment.deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const isOverdue = assignment.status === "pending" && deadlineDate < today;
  const isCompleted = assignment.status === "completed";

  let badgeMeta = { label: "Pending", color: "#f97316", bg: "#fff7ed", icon: "ellipse-outline" };
  if (isOverdue) {
    badgeMeta = { label: "Overdue", color: "#dc2626", bg: "#fef2f2", icon: "alert-circle" };
  } else if (isCompleted) {
    badgeMeta = { label: "Completed", color: "#16a34a", bg: "#f0fdf4", icon: "checkmark-circle" };
  }

  const countdown = getCountdownInfo(assignment.deadline);
  const priorityMeta = PRIORITY_META[assignment.priority] || null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Title + badges */}
        <View style={styles.headerBlock}>
          <Text style={styles.title}>{assignment.title}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: badgeMeta.bg }]}>
              <Ionicons name={badgeMeta.icon} size={14} color={badgeMeta.color} />
              <Text style={[styles.badgeText, { color: badgeMeta.color }]}>
                {badgeMeta.label}
              </Text>
            </View>
            {priorityMeta && (
              <View style={[styles.badge, { backgroundColor: priorityMeta.bg }]}>
                <View style={[styles.priorityDot, { backgroundColor: priorityMeta.color }]} />
                <Text style={[styles.badgeText, { color: priorityMeta.color }]}>
                  {priorityMeta.label}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Countdown card */}
        <View style={[styles.countdownCard, { backgroundColor: `${countdown.color}12` }]}>
          <Ionicons name={countdown.icon} size={22} color={countdown.color} />
          <Text style={[styles.countdownText, { color: countdown.color }]}>
            {countdown.label}
          </Text>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="book-outline" size={18} color="#2563eb" />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.label}>Subject</Text>
              <Text style={styles.value}>{assignment.subject}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="calendar-outline" size={18} color="#2563eb" />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.label}>Deadline</Text>
              <Text style={styles.value}>{formatDeadline(assignment.deadline)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="document-text-outline" size={18} color="#2563eb" />
            </View>
            <View style={styles.infoTextWrap}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.value}>
                {assignment.description || "No description provided"}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
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

        <TouchableOpacity
          style={styles.homeButton}
          onPress={goToHome}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  headerBlock: {
    marginBottom: 16,
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  countdownCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  countdownText: {
    fontSize: 16,
    fontWeight: "700",
  },
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
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoTextWrap: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    color: "#0f172a",
    lineHeight: 21,
  },
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
  undoButton: {
    backgroundColor: "#64748b",
  },
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
  homeButton: {
    backgroundColor: "#0f172a",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  homeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  notFoundBox: {
    backgroundColor: "#fff",
    padding: 28,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 60,
    marginBottom: 24,
    gap: 8,
  },
  notFoundText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  notFoundSubtext: {
    fontSize: 14,
    color: "#64748b",
  },
});