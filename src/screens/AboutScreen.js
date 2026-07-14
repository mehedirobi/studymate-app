import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

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

const TEAM = ["Mehedi", "Alvi", "Tripal", "Rohan", "Arpon"];

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="book" size={36} color="#2563eb" />
          </View>
          <Text style={styles.heading}>StudyMate</Text>
          <Text style={styles.subheading}>
            Your companion for staying on top of every deadline
          </Text>
        </View>

        {/* Overview */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Project Overview</Text>
          </View>
          <Text style={styles.text}>
            StudyMate is a simple student productivity mobile app designed to
            help students manage assignments, track deadlines, and stay
            organized in their academic life.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star-outline" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Main Features</Text>
          </View>
          {FEATURES.map((feature) => (
            <View key={feature.label} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={feature.icon} size={16} color="#2563eb" />
              </View>
              <Text style={styles.featureText}>{feature.label}</Text>
            </View>
          ))}
        </View>

        {/* Tech stack */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="code-slash-outline" size={20} color="#2563eb" />
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

        {/* Developer / team */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={20} color="#2563eb" />
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

        <Text style={styles.footer}>Made with care for students everywhere 🎓</Text>
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
    marginBottom: 24,
    marginTop: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
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
    gap: 8,
    marginBottom: 14,
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
    marginBottom: 12,
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
    backgroundColor: "#f1f5f9",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
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