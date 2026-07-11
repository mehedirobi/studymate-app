import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>About StudyMate</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Project Overview</Text>
        <Text style={styles.text}>
          StudyMate is a simple student productivity mobile app designed to help
          students manage assignments, track deadlines, and stay organized in
          their academic life.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Main Features</Text>
        <Text style={styles.text}>• Add new assignments</Text>
        <Text style={styles.text}>• View assignment details</Text>
        <Text style={styles.text}>• Mark assignments as completed or pending</Text>
        <Text style={styles.text}>• Delete assignments</Text>
        <Text style={styles.text}>• Search assignments by title</Text>
        <Text style={styles.text}>• Filter assignments by status</Text>
        <Text style={styles.text}>• Save assignments locally using AsyncStorage</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Technology Used</Text>
        <Text style={styles.text}>• React Native</Text>
        <Text style={styles.text}>• Expo</Text>
        <Text style={styles.text}>• React Navigation</Text>
        <Text style={styles.text}>• AsyncStorage</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Developer</Text>
        <Text style={styles.text}>Developed by: Mehedi, Alvi, Tripal, Rohan, Arpon</Text>
        <Text style={styles.text}>Department: Computer Science & Technology</Text>
        <Text style={styles.text}>Project Type: College Mobile App Project</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 18,
  },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    color: "#334155",
    marginBottom: 6,
    lineHeight: 22,
  },
});