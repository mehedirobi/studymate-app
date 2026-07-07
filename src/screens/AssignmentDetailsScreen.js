import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";

export default function AssignmentDetailsScreen({
  route,
  navigation,
  deleteAssignment,
  toggleAssignmentStatus,
}) {
  const { assignment } = route.params;

  const handleDelete = () => {
    Alert.alert(
      "Delete Assignment",
      "Are you sure you want to delete this assignment?",
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
  };

  const handleToggleStatus = () => {
    toggleAssignmentStatus(assignment.id);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{assignment.title}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Subject</Text>
        <Text style={styles.value}>{assignment.subject}</Text>

        <Text style={styles.label}>Deadline</Text>
        <Text style={styles.value}>{assignment.deadline}</Text>

        <Text style={styles.label}>Description</Text>
        <Text style={styles.value}>
          {assignment.description || "No description provided"}
        </Text>

        <Text style={styles.label}>Status</Text>
        <Text
          style={[
            styles.statusText,
            assignment.status === "completed"
              ? styles.completedText
              : styles.pendingText,
          ]}
        >
          {assignment.status === "completed" ? "Completed" : "Pending"}
        </Text>
      </View>

      <TouchableOpacity style={styles.completeButton} onPress={handleToggleStatus}>
        <Text style={styles.buttonText}>
          {assignment.status === "completed"
            ? "Mark as Pending"
            : "Mark as Completed"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.buttonText}>Delete Assignment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 18,
  },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 14,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#0f172a",
  },
  statusText: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "bold",
  },
  completedText: {
    color: "#16a34a",
  },
  pendingText: {
    color: "#f97316",
  },
  completeButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});