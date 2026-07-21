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
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

/* ------------------------------------------------------------------ */
/* Design tokens — kept in this file so there's nothing extra to wire  */
/* up. If you add more screens later, pulling these into a shared      */
/* theme.js file is worth it then, but not required now.               */
/* ------------------------------------------------------------------ */
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

const type = {
  display: { fontSize: 28, fontWeight: "800", letterSpacing: -0.4 },
  title: { fontSize: 19, fontWeight: "800", letterSpacing: -0.2 },
  subtitle: { fontSize: 14, fontWeight: "500" },
  body: { fontSize: 15, fontWeight: "500" },
  label: { fontSize: 13, fontWeight: "700" },
  caption: { fontSize: 12, fontWeight: "600" },
  tiny: { fontSize: 10, fontWeight: "700" },
};

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

const breakpoints = { small: 360, tablet: 768 };

function getResponsiveMetrics(width) {
  const isSmall = width < breakpoints.small;
  const isTablet = width >= breakpoints.tablet;
  return {
    isSmall,
    isTablet,
    horizontalPadding: isTablet ? 32 : isSmall ? 16 : 20,
    maxContentWidth: isTablet ? 900 : undefined,
    columns: isTablet ? 2 : 1,
  };
}

// Fires a haptic tick where supported; silently no-ops on web / unsupported
// devices instead of throwing, so this is always safe to call.
const tap = (style = Haptics.ImpactFeedbackStyle.Light) => {
  Haptics.impactAsync(style).catch(() => {});
};

const PRIORITY_META = {
  low: { color: colors.success, bg: colors.successBg, label: "Low" },
  medium: { color: colors.warning, bg: colors.warningBg, label: "Medium" },
  high: { color: colors.danger, bg: colors.dangerBg, label: "High" },
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

  if (diff < 0) return { label: "Overdue", icon: "alert-circle", color: colors.danger };
  if (diff === 0) return { label: "Due Today", icon: "flame", color: colors.danger };
  if (diff === 1) return { label: "1 Day Left", icon: "time", color: colors.warning };
  return { label: `${diff} Days Left`, icon: "time-outline", color: colors.info };
};

const isAssignmentOverdue = (assignment) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(assignment.deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  return assignment.status === "pending" && deadlineDate < today;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up?";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
};

/* ------------------------------------------------------------------ */
/* Reusable animated progress bar — animates width whenever % changes  */
/* ------------------------------------------------------------------ */
const AnimatedProgressBar = React.memo(function AnimatedProgressBar({
  percentage,
  trackStyle,
  fillColor = colors.surface,
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
/* Stat card — mounts with a gentle scale+fade, staggered by index     */
/* ------------------------------------------------------------------ */
const StatCard = React.memo(function StatCard({ icon, iconBg, iconColor, number, label, index }) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      delay: 120 + index * 70,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          opacity: entrance,
          transform: [
            { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
          ],
        },
      ]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.statNumber}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
});

/* ------------------------------------------------------------------ */
/* Assignment card — press feedback + staggered entrance animation     */
/* ------------------------------------------------------------------ */
const AssignmentCard = React.memo(function AssignmentCard({ assignment, onPress, index, columns }) {
  const overdue = isAssignmentOverdue(assignment);
  const isCompleted = assignment.status === "completed";

  const scale = useRef(new Animated.Value(1)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 320,
      delay: Math.min((index % 12) * 40, 350),
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

  let badgeMeta = { label: "Pending", color: colors.pending, bg: colors.pendingBg };
  if (overdue) {
    badgeMeta = { label: "Overdue", color: colors.danger, bg: colors.dangerBg };
  } else if (isCompleted) {
    badgeMeta = { label: "Completed", color: colors.success, bg: colors.successBg };
  }

  const countdown = getCountdownInfo(assignment.deadline);
  const priorityMeta = PRIORITY_META[assignment.priority];

  return (
    <Animated.View
      style={[
        columns > 1 && styles.gridItem,
        {
          opacity: entrance,
          transform: [
            { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            { scale },
          ],
        },
      ]}
    >
      <Pressable
        onPress={() => {
          tap();
          onPress(assignment);
        }}
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
            fillColor={colors.success}
            trackStyle={{ backgroundColor: colors.surfaceMuted, marginTop: 10 }}
          />
        )}
      </Pressable>
    </Animated.View>
  );
});

/* ------------------------------------------------------------------ */
/* Filter tabs with a sliding pill indicator — pure Animated, no       */
/* LayoutAnimation, so there's exactly one animation system driving it */
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
      Animated.parallel([
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
      ]).start();
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
              if (filter.key !== activeFilter) tap();
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
function ScaleButton({ onPress, style, children, haptic = true, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          if (haptic) tap();
          onPress?.();
        }}
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

/* ------------------------------------------------------------------ */
/* Fade + slide wrapper for content that should ease in on mount       */
/* (alert strip, empty state) instead of popping in instantly          */
/* ------------------------------------------------------------------ */
function FadeInView({ visible, style, children, duration = 260 }) {
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
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Search input with an animated focus ring — subtle but reads premium */
/* ------------------------------------------------------------------ */
function SearchBar({ value, onChangeText }) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: focused ? 1 : 0,
      duration: 180,
      useNativeDriver: false, // animating borderColor, not a transform
    }).start();
  }, [focused, focusAnim]);

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  return (
    <Animated.View style={[styles.searchWrap, { borderColor }]}>
      <Ionicons
        name="search-outline"
        size={18}
        color={focused ? colors.primary : colors.textMuted}
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.searchInput}
        placeholder="Search assignments..."
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="Search assignments"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText("")}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export default function HomeScreen({ navigation, assignments, resetAssignments }) {
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const { width } = useWindowDimensions();

  // Responsive: compact phones get tighter padding, tablets get a
  // centered max-width column AND a 2-up grid so space isn't wasted.
  const { horizontalPadding, maxContentWidth, columns } = useMemo(
    () => getResponsiveMetrics(width),
    [width]
  );

  const greeting = useMemo(() => getGreeting(), []);
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
    ({ item, index }) => (
      <AssignmentCard assignment={item} onPress={handleOpenAssignment} index={index} columns={columns} />
    ),
    [handleOpenAssignment, columns]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <View>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.heading}>StudyMate</Text>
            <Text style={styles.subheading}>Manage your assignments and deadlines easily</Text>
          </View>
        </View>

        {/* Progress summary */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
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
            fillColor={colors.surface}
          />
          <Text style={styles.summarySubtext}>
            {completedAssignments} of {totalAssignments} assignments completed
          </Text>
        </LinearGradient>

        {/* Stat cards */}
        <View style={styles.statsContainer}>
          <StatCard
            index={0}
            icon="list-outline"
            iconBg={colors.infoBg}
            iconColor={colors.info}
            number={totalAssignments}
            label="Total"
          />
          <StatCard
            index={1}
            icon="hourglass-outline"
            iconBg={colors.pendingBg}
            iconColor={colors.pending}
            number={pendingAssignments}
            label="Pending"
          />
          <StatCard
            index={2}
            icon="checkmark-circle-outline"
            iconBg={colors.successBg}
            iconColor={colors.success}
            number={completedAssignments}
            label="Done"
          />
        </View>

        {/* Due today / overdue alert strip — fades in only when relevant */}
        <FadeInView visible={dueTodayCount > 0 || overdueCount > 0} style={styles.alertRow}>
          <>
            {dueTodayCount > 0 && (
              <View style={[styles.alertChip, { backgroundColor: colors.warningBg }]}>
                <Ionicons name="flame" size={14} color={colors.warning} />
                <Text style={[styles.alertChipText, { color: colors.warning }]}>
                  {dueTodayCount} due today
                </Text>
              </View>
            )}
            {overdueCount > 0 && (
              <View style={[styles.alertChip, { backgroundColor: colors.dangerBg }]}>
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text style={[styles.alertChipText, { color: colors.danger }]}>
                  {overdueCount} overdue
                </Text>
              </View>
            )}
          </>
        </FadeInView>

        <ScaleButton
          style={styles.addButton}
          onPress={goToAdd}
          accessibilityRole="button"
          accessibilityLabel="Add new assignment"
        >
          <View style={styles.buttonInner}>
            <Ionicons name="add-circle" size={20} color={colors.textOnPrimary} />
            <Text style={styles.addButtonText}>Add Assignment</Text>
          </View>
        </ScaleButton>

        <ScaleButton
          style={styles.resetButton}
          onPress={handleReset}
          haptic={false}
          accessibilityRole="button"
          accessibilityLabel="Reset all assignments"
        >
          <View style={styles.buttonInner}>
            <Ionicons name="refresh-outline" size={16} color={colors.danger} />
            <Text style={styles.resetButtonText}>Reset All Assignments</Text>
          </View>
        </ScaleButton>

        <SearchBar value={searchText} onChangeText={setSearchText} />

        <FilterTabs activeFilter={activeFilter} onChange={handleFilterChange} />

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Assignments</Text>
          <Text style={styles.sectionCount}>{filteredAssignments.length}</Text>
        </View>
      </View>
    ),
    [
      greeting,
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
      <FadeInView visible style={styles.emptyBox}>
        <>
          <Ionicons name="file-tray-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No assignments found</Text>
          <Text style={styles.emptyText}>Try changing your search or filter, or add a new assignment.</Text>
        </>
      </FadeInView>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        // Key forces FlatList to remount when column count changes
        // (e.g. phone <-> tablet / rotation), which RN requires for numColumns changes.
        key={`cols-${columns}`}
        data={filteredAssignments}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
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
    backgroundColor: colors.bg,
  },
  container: {
    paddingTop: spacing.xl,
    paddingBottom: 40,
  },
  headerRow: {
    marginBottom: spacing.xl - 2,
  },
  greeting: {
    fontSize: type.subtitle.fontSize,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 2,
  },
  heading: {
    ...type.display,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryBox: {
    padding: spacing.xl - 2,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    ...shadow.colored("#4338ca"),
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textOnPrimarySoft,
  },
  progressPercent: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textOnPrimary,
  },
  summarySubtext: {
    color: colors.textOnPrimarySoft,
    fontSize: 13,
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm + 2,
    marginBottom: spacing.md + 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    ...shadow.sm,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm + 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  statLabel: {
    marginTop: 2,
    color: colors.textSecondary,
    ...type.caption,
  },
  alertRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md + 2,
  },
  alertChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  alertChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg - 2,
    borderRadius: radius.md,
    marginBottom: spacing.sm + 2,
    ...shadow.colored(colors.primary),
  },
  addButtonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  resetButton: {
    backgroundColor: colors.dangerBg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xl - 2,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  resetButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md + 2,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm + 2,
    marginBottom: spacing.xl,
    position: "relative",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  filterIndicator: {
    position: "absolute",
    top: spacing.xs,
    bottom: spacing.xs,
    left: 0,
    backgroundColor: colors.primary,
    borderRadius: radius.sm + 1,
    ...shadow.colored(colors.primary),
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm + 1,
    alignItems: "center",
    zIndex: 1,
  },
  filterButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 13,
  },
  activeFilterButtonText: {
    color: colors.textOnPrimary,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md + 2,
  },
  sectionTitle: {
    ...type.title,
    color: colors.textPrimary,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  // Tablet grid support — FlatList's columnWrapperStyle needs a gap between
  // columns, and each item needs a flexBasis so cards line up evenly.
  gridRow: {
    gap: spacing.md,
  },
  gridItem: {
    flex: 1,
  },
  assignmentCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadow.sm,
  },
  overdueStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.danger,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: spacing.sm,
  },
  assignmentTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  priorityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    ...type.tiny,
  },
  assignmentMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm + 2,
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
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyBox: {
    backgroundColor: colors.surface,
    padding: spacing.xxl + 4,
    borderRadius: radius.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});