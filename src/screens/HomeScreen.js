import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";

export default function HomeScreen({
  navigation,
  assignments,
  resetAssignments,
}) {
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const totalAssignments = assignments.length;
  const pendingAssignments = assignments.filter(
    (item) => item.status === "pending"
  ).length;
  const completedAssignments = assignments.filter(
    (item) => item.status === "completed"
  ).length;

  const filteredAssignments = useMemo(() => {
    let filtered = [...assignments];

    if (activeFilter === "pending") {
      filtered = filtered.filter((item) => item.status === "pending");
    } else if (activeFilter === "completed") {
      filtered = filtered.filter((item) => item.status === "completed");
    }

    if (searchText.trim()) {
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    return filtered;
  }, [assignments, activeFilter, searchText]);

  const handleReset = () => {
    Alert.alert(
      "Reset Assignments",
      "Do you want to reset all assignments to default data?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            resetAssignments();
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>StudyMate</Text>
      <Text style={styles.subheading}>
        Manage your assignments and deadlines easily
      </Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Your Progress</Text>
        <Text style={styles.summaryText}>
          Total: {totalAssignments} | Pending: {pendingAssignments} | Completed:{" "}
          {completedAssignments}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalAssignments}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingAssignments}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedAssignments}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddTab")}
      >
        <Text style={styles.addButtonText}>+ Add Assignment</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetButtonText}>Reset All Assignments</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.searchInput}
        placeholder="Search assignments..."
        value={searchText}
        onChangeText={setSearchText}
      />

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === "all" && styles.activeFilterButton,
          ]}
          onPress={() => setActiveFilter("all")}
        >
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === "all" && styles.activeFilterButtonText,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === "pending" && styles.activeFilterButton,
          ]}
          onPress={() => setActiveFilter("pending")}
        >
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === "pending" && styles.activeFilterButtonText,
            ]}
          >
            Pending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === "completed" && styles.activeFilterButton,
          ]}
          onPress={() => setActiveFilter("completed")}
        >
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === "completed" && styles.activeFilterButtonText,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Assignments</Text>

      {filteredAssignments.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No assignments found.</Text>
        </View>
      ) : (
        filteredAssignments.map((assignment) => (
          <TouchableOpacity
            key={assignment.id}
            style={styles.assignmentCard}
            onPress={() =>
              navigation.navigate("AssignmentDetails", {
                assignment,
              })
            }
          >
            <Text style={styles.assignmentTitle}>{assignment.title}</Text>
            <Text style={styles.assignmentMeta}>
              Subject: {assignment.subject}
            </Text>
            <Text style={styles.assignmentMeta}>
              Deadline: {assignment.deadline}
            </Text>

            <Text
              style={
                assignment.status === "completed"
                  ? styles.completedBadge
                  : styles.pendingBadge
              }
            >
              {assignment.status === "completed" ? "Completed" : "Pending"}
            </Text>
          </TouchableOpacity>
        ))
      )}
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
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    color: "#475569",
    marginBottom: 16,
  },
  summaryBox: {
    backgroundColor: "#dbeafe",
    padding: 16,
    borderRadius: 14,
    marginBottom: 18,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1d4ed8",
    marginBottom: 4,
  },
  summaryText: {
    color: "#1e3a8a",
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#fff",
    width: "31%",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2563eb",
  },
  statLabel: {
    marginTop: 6,
    color: "#475569",
    fontSize: 14,
  },
  addButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  resetButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  activeFilterButton: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  filterButtonText: {
    color: "#334155",
    fontWeight: "600",
  },
  activeFilterButtonText: {
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 14,
  },
  assignmentCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    elevation: 2,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },
  assignmentMeta: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 4,
  },
  pendingBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#f97316",
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "bold",
  },
  completedBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#16a34a",
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 15,
  },
});