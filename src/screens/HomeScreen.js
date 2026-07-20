import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  Alert,
  FlatList,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

// Android needs this flag before LayoutAnimation works.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRIORITY_META = {
  low: { color: "#16a34a", bg: "#f0fdf4", label: "Low" },
  medium: { color: "#d97706", bg: "#fffbeb", label: "Medium" },
  high: { color: "#dc2626", bg: "#fef2f2", label: "High" },
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

/* ------------------------------------------------------------------ */
/* Reusable animated progress bar — animates width whenever % changes  */
/* ------------------------------------------------------------------ */
const AnimatedProgressBar = React.memo(function AnimatedProgressBar({
  percentage,
  trackStyle,
  fillColor = "#fff",
  height = 8,
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: percentage,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width isn't a transform, can't use native driver
    }).start();
  }, [percentage, anim]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View style={[{ height, borderRadius: height / 2, overflow: "hidden" }, trackStyle]}>
      <Animated.View
        style={{ height: "100%", width, borderRadius: height / 2, backgroundColor: fillColor }}
      />
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Assignment card — press feedback + staggered entrance animation     */
/* ------------------------------------------------------------------ */
const AssignmentCard = React.memo(function AssignmentCard({ assignment, onPress, index }) {
  const overdue = isAssignmentOverdue(assignment);
  const isCompleted = assignment.status === "completed";

  const scale = useRef(new Animated.Value(1)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index * 45, 350),
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };

  let badgeMeta = { label: "Pending", color: "#f97316", bg: "#fff7ed" };
  if (overdue) {
    badgeMeta = { label: "Overdue", color: "#dc2626", bg: "#fef2f2" };
  } else if (isCompleted) {
    badgeMeta = { label: "Completed", color: "#16a34a", bg: "#f0fdf4" };
  }

  const countdown = getCountdownInfo(assignment.deadline);
  const priorityMeta = PRIORITY_META[assignment.priority];

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          { scale },
        ],
      }}
    >
      <Pressable
        onPress={() => onPress(assignment)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.assignmentCard}
        accessibilityRole="button"
        accessibilityLabel={`${assignment.title}, ${assignment.subject}, ${badgeMeta.label}, ${countdown.label}`}
      >
        {overdue && <View style={styles.overdueStripe} />}

        <View style={styles.cardTopRow}>
          <Text style={styles.assignmentTitle} numberOfLines={1}>
            {assignment.title}
          </Text>
          {priorityMeta && (
            <View style={[styles.priorityPill, { backgroundColor: priorityMeta.bg }]}>
              <View style={[styles.priorityDot, { backgroundColor: priorityMeta.color }]} />
              <Text style={[styles.priorityText, { color: priorityMeta.color }]}>
                {priorityMeta.label}
              </Text>
            </View>
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
            <Text style={[styles.countdown, { color: countdown.color }]}>{countdown.label}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: badgeMeta.bg }]}>
            <Text style={[styles.badgeText, { color: badgeMeta.color }]}>{badgeMeta.label}</Text>
          </View>
        </View>

        {isCompleted && (
          <AnimatedProgressBar
            percentage={100}
            height={3}
            fillColor="#16a34a"
            trackStyle={{ backgroundColor: "#f1f5f9", marginTop: 10 }}
          />
        )}
      </Pressable>
    </Animated.View>
  );
});

/* ------------------------------------------------------------------ */
/* Filter tabs with a sliding pill indicator                           */
/* ------------------------------------------------------------------ */
function FilterTabs({ activeFilter, onChange }) {
  const [layouts, setLayouts] = useState({});
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorW = useRef(new Animated.Value(0)).current;
  const hasMeasured = useRef(false);

  const animateTo = useCallback(
    (key, immediate = false) => {
      const layout = layouts[key];
      if (!layout) return;
      const anims = [
        Animated.timing(indicatorX, {
          toValue: layout.x,
          duration: immediate ? 0 : 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(indicatorW, {
          toValue: layout.width,
          duration: immediate ? 0 : 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ];
      Animated.parallel(anims).start();
    },
    [layouts, indicatorX, indicatorW]
  );

  useEffect(() => {
    if (layouts[activeFilter] && !hasMeasured.current) {
      hasMeasured.current = true;
      animateTo(activeFilter, true);
    } else {
      animateTo(activeFilter, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, layouts]);

  return (
    <View style={styles.filterRow}>
      <Animated.View
        style={[
          styles.filterIndicator,
          { transform: [{ translateX: indicatorX }], width: indicatorW },
        ]}
      />
      {FILTERS.map((filter) => {
        const active = activeFilter === filter.key;
        return (
          <TouchableOpacity
            key={filter.key}
            style={styles.filterButton}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setLayouts((prev) => ({ ...prev, [filter.key]: { x, width } }));
            }}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onChange(filter.key);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Filter: ${filter.label}`}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.filterButtonText, active && styles.activeFilterButtonText]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Small press-scale wrapper for the primary / secondary buttons       */
/* ------------------------------------------------------------------ */
function ScaleButton({ onPress, style, children, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
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

export default function HomeScreen({ navigation, assignments, resetAssignments }) {
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const { width } = useWindowDimensions();

  // Responsive breakpoints — tablets/large screens get roomier spacing
  // and a 4-column stat row instead of squeezing 3 cards edge to edge.
  const isTablet = width >= 768;
  const horizontalPadding = isTablet ? 32 : 20;
  const maxContentWidth = isTablet ? 640 : undefined;

  const totalAssignments = assignments.length;

  const pendingAssignments = useMemo(
    () => assignments.filter((item) => item.status === "pending").length,
    [assignments]
  );

  const completedAssignments = useMemo(
    () => assignments.filter((item) => item.status === "completed").length,
    [assignments]
  );

  const overdueCount = useMemo(() => assignments.filter(isAssignmentOverdue).length, [assignments]);

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

  const handleFilterChange = useCallback((key) => setActiveFilter(key), []);

  const renderItem = useCallback(
    ({ item, index }) => <AssignmentCard assignment={item} onPress={handleOpenAssignment} index={index} />,
    [handleOpenAssignment]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <View>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.heading}>StudyMate</Text>
            <Text style={styles.subheading}>Manage your assignments and deadlines easily</Text>
          </View>
        </View>

        {/* Progress summary */}
        <LinearGradient
          colors={["#2563eb", "#4f46e5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryBox}
        >
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryTitle}>Your Progress</Text>
            <Text style={styles.progressPercent}>{progressPercentage}%</Text>
          </View>
          <AnimatedProgressBar
            percentage={progressPercentage}
            trackStyle={{ backgroundColor: "rgba(255,255,255,0.25)", marginBottom: 10 }}
            fillColor="#fff"
          />
          <Text style={styles.summarySubtext}>
            {completedAssignments} of {totalAssignments} assignments completed
          </Text>
        </LinearGradient>

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
                <Text style={[styles.alertChipText, { color: "#d97706" }]}>{dueTodayCount} due today</Text>
              </View>
            )}
            {overdueCount > 0 && (
              <View style={[styles.alertChip, { backgroundColor: "#fef2f2" }]}>
                <Ionicons name="alert-circle" size={14} color="#dc2626" />
                <Text style={[styles.alertChipText, { color: "#dc2626" }]}>{overdueCount} overdue</Text>
              </View>
            )}
          </View>
        )}

        <ScaleButton style={styles.addButton} onPress={goToAdd} accessibilityRole="button" accessibilityLabel="Add new assignment">
          <View style={styles.buttonInner}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Assignment</Text>
          </View>
        </ScaleButton>

        <ScaleButton
          style={styles.resetButton}
          onPress={handleReset}
          accessibilityRole="button"
          accessibilityLabel="Reset all assignments"
        >
          <View style={styles.buttonInner}>
            <Ionicons name="refresh-outline" size={16} color="#dc2626" />
            <Text style={styles.resetButtonText}>Reset All Assignments</Text>
          </View>
        </ScaleButton>

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
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        <FilterTabs activeFilter={activeFilter} onChange={handleFilterChange} />

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
      handleFilterChange,
      filteredAssignments.length,
    ]
  );

  const ListEmpty = useMemo(
    () => (
      <View style={styles.emptyBox}>
        <Ionicons name="file-tray-outline" size={40} color="#94a3b8" />
        <Text style={styles.emptyTitle}>No assignments found</Text>
        <Text style={styles.emptyText}>Try changing your search or filter, or add a new assignment.</Text>
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
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: horizontalPadding, maxWidth: maxContentWidth, alignSelf: "center", width: "100%" },
        ]}
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
    paddingTop: 20,
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
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 14,
    color: "#64748b",
  },
  summaryBox: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#4338ca",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
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
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addButton: {
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
    position: "relative",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
  },
  filterIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 0,
    backgroundColor: "#2563eb",
    borderRadius: 9,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    zIndex: 1,
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
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  overdueStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#dc2626",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  assignmentTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  priorityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
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