import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Animated, Easing, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const FEATURES = [
  { icon: "add-circle-outline", label: "Add new assignments" },
  { icon: "document-text-outline", label: "View assignment details" },
  { icon: "checkmark-done-outline", label: "Mark assignments as completed or pending" },
  { icon: "trash-outline", label: "Delete assignments" },
  { icon: "search-outline", label: "Search assignments by title" },
  { icon: "filter-outline", label: "Filter assignments by status" },
  { icon: "save-outline", label: "Save assignments locally on your device" },
];

const TECH_STACK = ["React Native", "Expo", "React Navigation", "AsyncStorage"];

const TEAM = ["Mehedi", "Arpon", "Ali Hamza", "Tripal", "Alvi"];

/* Reusable staggered entrance — same pattern as Home / Add screens, so the
   whole app feels consistent instead of each screen animating differently. */
function FadeInUp({ index = 0, style, children }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index * 70, 420),
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

export default function AboutScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { maxWidth: isTablet ? 640 : undefined, alignSelf: "center", width: "100%" },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <FadeInUp index={0}>
          <LinearGradient
            colors={["#2563eb", "#4f46e5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.logoCircle}>
              <Ionicons name="book" size={34} color="#fff" />
            </View>
            <Text style={styles.heading}>StudyMate</Text>
            <Text style={styles.subheading}>
              Your companion for staying on top of every deadline
            </Text>
          </LinearGradient>
        </FadeInUp>

        {/* Overview */}
        <FadeInUp index={1}>
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
              </View>
              <Text style={styles.sectionTitle}>Project Overview</Text>
            </View>
            <Text style={styles.text}>
              StudyMate is a simple student productivity mobile app designed to
              help students manage assignments, track deadlines, and stay
              organized in their academic life.
            </Text>
          </View>
        </FadeInUp>

        {/* Features */}
        <FadeInUp index={2}>
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="star-outline" size={18} color="#2563eb" />
              </View>
              <Text style={styles.sectionTitle}>Main Features</Text>
            </View>
            {FEATURES.map((feature, i) => (
              <View
                key={feature.label}
                style={[styles.featureRow, i === FEATURES.length - 1 && styles.featureRowLast]}
              >
                <View style={styles.featureIconWrap}>
                  <Ionicons name={feature.icon} size={16} color="#2563eb" />
                </View>
                <Text style={styles.featureText}>{feature.label}</Text>
              </View>
            ))}
          </View>
        </FadeInUp>

        {/* Tech stack */}
        <FadeInUp index={3}>
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="code-slash-outline" size={18} color="#2563eb" />
              </View>
              <Text style={styles.sectionTitle}>Technology Used</Text>
            </View>
            <View style={styles.chipRow}>
              {TECH_STACK.map((tech) => (
                <View key={tech} style={styles.chip}>
                  <Text style={styles.chipText}>{tech}</Text>
                </View>
              ))}
            </View>
          </View>
        </FadeInUp>

        {/* Developer / team */}
        <FadeInUp index={4}>
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="people-outline" size={18} color="#2563eb" />
              </View>
              <Text style={styles.sectionTitle}>Developer</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Team</Text>
              <Text style={styles.infoValue}>{TEAM.join(", ")}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>Computer Science & Technology</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Project Type</Text>
              <Text style={styles.infoValue}>Mobile App Project</Text>
            </View>
          </View>
        </FadeInUp>

        <FadeInUp index={5}>
          <Text style={styles.footer}>Made with care for students everywhere 🎓</Text>
        </FadeInUp>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 18,
    shadowColor: "#4338ca",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 13,
    color: "#dbeafe",
    textAlign: "center",
    lineHeight: 19,
  },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  text: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  featureRowLast: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#eff6ff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1d4ed8",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  footer: {
    textAlign: "center",
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 8,
  },
});