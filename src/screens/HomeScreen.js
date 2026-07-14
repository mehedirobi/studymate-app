import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIORITY_META = {
  low: { color: "#16a34a", bg: "#f0fdf4" },
  medium: { color: "#d97706", bg: "#fffbeb" },
  high: { color: "#dc2626", bg: "#fef2f2" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
];

const getCountdownInfo = (deadline) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(deadline);
  due.setHours(0, 0, 0, 0);

  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { label: "Overdue", icon: "alert-circle", color: "#dc2626" };
  if (diff === 0) return { label: "Due Today", icon: "flame", color: "#dc2626" };
  if (diff === 1) return { label: "1 Day Left", icon: "time", color: "#d97706" };
  return { label: `${diff} Days Left`, icon: "time-outline", color: "#2563eb" };
};

const isAssignmentOverdue = (assignment) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(assignment.deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  return assignment.status === "pending" && deadlineDate < today;
};

// Extracted + memoized so re-rendering the list (e.g. typing in the search
// box) doesn't re-render every card — only the ones whose props actually
// changed re-render.
const AssignmentCard = React.memo(function AssignmentCard({ assignment, onPress }) {
  const overdue = isAssignmentOverdue(assignment);
  const isCompleted = assignment.status === "completed";

  let badgeMeta = { label: "Pending", color: "#f97316", bg: "#fff7ed" };
  if (overdue) {
    badgeMeta = { label: "Overdue", color: "#dc2626", bg: "#fef2f2" };
  } else if (isCompleted) {
    badgeMeta = { label: "Completed", color: "#16a34a", bg: "#f0fdf4" };
  }

  const countdown = getCountdownInfo(assignment.deadline);
  const priorityMeta = PRIORITY_META[assignment.priority];

  return (
    <TouchableOpacity
      style={styles.assignmentCard}
      onPress={() => onPress(assignment)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${assignment.title}, ${assignment.subject}, ${badgeMeta.label}, ${countdown.label}`}
    >
      <View style={styles.cardTopRow}>
        <Text style={styles.assignmentTitle} numberOfLines={1}>
          {assignment.title}
        </Text>
        {priorityMeta && (
          <View style={[styles.priorityDot, { backgroundColor: priorityMeta.color }]} />
        )}
      </View>

      {!!assignment.subject && (
        <Text style={styles.assignmentMeta} numberOfLines={1}>
          {assignment.subject}
        </Text>
      )}

      <View style={styles.cardBottomRow}>
        <View style={styles.countdownWrap}>
          <Ionicons name={countdown.icon} size={13} color={countdown.color} />
          <Text style={[styles.countdown, { color: countdown.color }]}>
            {countdown.label}
          </Text>
        </View>

        <View style={[styles.badge, { backgroundColor: badgeMeta.bg }]}>
          <Text style={[styles.badgeText, { color: badgeMeta.color }]}>
            {badgeMeta.label}
          </Text>
        </View>
      </View>

      {isCompleted && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: "100%" }]} />
        </View>
      )}
    </TouchableOpacity>
  );
});

export default function HomeScreen({ navigation, assignments, resetAssignments }) {
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const totalAssignments = assignments.length;

  const pendingAssignments = useMemo(
    () => assignments.filter((item) => item.status === "pending").length,
    [assignments]
  );

  const completedAssignments = useMemo(
    () => assignments.filter((item) => item.status === "completed").length,
    [assignments]
  );

  const overdueCount = useMemo(
    () => assignments.filter(isAssignmentOverdue).length,
    [assignments]
  );

  const dueTodayCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return assignments.filter((item) => {
      if (item.status !== "pending") return false;
      const due = new Date(item.deadline);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === today.getTime();
    }).length;
  }, [assignments]);

  const progressPercentage = useMemo(() => {
    if (totalAssignments === 0) return 0;
    return Math.round((completedAssignments / totalAssignments) * 100);
  }, [totalAssignments, completedAssignments]);

  const filteredAssignments = useMemo(() => {
    let filtered = [...assignments];

    filtered.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    if (activeFilter === "pending") {
      filtered = filtered.filter((item) => item.status === "pending");
    } else if (activeFilter === "completed") {
      filtered = filtered.filter((item) => item.status === "completed");
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter((item) => item.title.toLowerCase().includes(query));
    }

    return filtered;
  }, [assignments, activeFilter, searchText]);

  const handleReset = useCallback(() => {
    Alert.alert(
      "Reset Assignments",
      "Do you want to reset all assignments to default data? This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: resetAssignments },
      ]
    );
  }, [resetAssignments]);

  const handleOpenAssignment = useCallback(
    (assignment) => {
      navigation.navigate("AssignmentDetails", {
        assignmentId: assignment.id,
        title: assignment.title,
      });
    },
    [navigation]
  );

  const goToAdd = useCallback(() => navigation.navigate("AddTab"), [navigation]);

  const renderItem = useCallback(
    ({ item }) => <AssignmentCard assignment={item} onPress={handleOpenAssignment} />,
    [handleOpenAssignment]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <View>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.heading}>StudyMate</Text>
            <Text style={styles.subheading}>
              Manage your assignments and deadlines easily
            </Text>
          </View>
        </View>

        {/* Progress summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryTitle}>Your Progress</Text>
            <Text style={styles.progressPercent}>{progressPercentage}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
            />
          </View>
          <Text style={styles.summarySubtext}>
            {completedAssignments} of {totalAssignments} assignments completed
          </Text>
        </View>

        {/* Stat cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="list-outline" size={18} color="#2563eb" />
            </View>
            <Text style={styles.statNumber}>{totalAssignments}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#fff7ed" }]}>
              <Ionicons name="hourglass-outline" size={18} color="#f97316" />
            </View>
            <Text style={styles.statNumber}>{pendingAssignments}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#f0fdf4" }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#16a34a" />
            </View>
            <Text style={styles.statNumber}>{completedAssignments}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </View>

        {/* Due today / overdue alert strip — only shows when relevant */}
        {(dueTodayCount > 0 || overdueCount > 0) && (
          <View style={styles.alertRow}>
            {dueTodayCount > 0 && (
              <View style={[styles.alertChip, { backgroundColor: "#fff7ed" }]}>
                <Ionicons name="flame" size={14} color="#d97706" />
                <Text style={[styles.alertChipText, { color: "#d97706" }]}>
                  {dueTodayCount} due today
                </Text>
              </View>
            )}
            {overdueCount > 0 && (
              <View style={[styles.alertChip, { backgroundColor: "#fef2f2" }]}>
                <Ionicons name="alert-circle" size={14} color="#dc2626" />
                <Text style={[styles.alertChipText, { color: "#dc2626" }]}>
                  {overdueCount} overdue
                </Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={goToAdd}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Add new assignment"
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Assignment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Reset all assignments"
        >
          <Ionicons name="refresh-outline" size={16} color="#dc2626" />
          <Text style={styles.resetButtonText}>Reset All Assignments</Text>
        </TouchableOpacity>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assignments..."
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={setSearchText}
            accessibilityLabel="Search assignments"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterButton, active && styles.activeFilterButton]}
                onPress={() => setActiveFilter(filter.key)}
                accessibilityRole="button"
                accessibilityLabel={`Filter: ${filter.label}`}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.filterButtonText, active && styles.activeFilterButtonText]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Assignments</Text>
          <Text style={styles.sectionCount}>{filteredAssignments.length}</Text>
        </View>
      </View>
    ),
    [
      progressPercentage,
      completedAssignments,
      totalAssignments,
      pendingAssignments,
      dueTodayCount,
      overdueCount,
      goToAdd,
      handleReset,
      searchText,
      activeFilter,
      filteredAssignments.length,
    ]
  );

  const ListEmpty = useMemo(
    () => (
      <View style={styles.emptyBox}>
        <Ionicons name="file-tray-outline" size={40} color="#94a3b8" />
        <Text style={styles.emptyTitle}>No assignments found</Text>
        <Text style={styles.emptyText}>
          Try changing your search or filter, or add a new assignment.
        </Text>
      </View>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        data={filteredAssignments}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    marginBottom: 18,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: "#64748b",
  },
  summaryBox: {
    backgroundColor: "#2563eb",
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#dbeafe",
  },
  progressPercent: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  summarySubtext: {
    color: "#dbeafe",
    fontSize: 13,
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  statLabel: {
    marginTop: 2,
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  alertRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  alertChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  alertChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  resetButtonText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "700",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0f172a",
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  activeFilterButton: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  filterButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 13,
  },
  activeFilterButtonText: {
    color: "#fff",
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  assignmentCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  assignmentTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginRight: 8,
  },
  priorityDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  assignmentMeta: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 10,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countdownWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  countdown: {
    fontSize: 13,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "#f1f5f9",
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#16a34a",
  },
  emptyBox: {
    backgroundColor: "#fff",
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});