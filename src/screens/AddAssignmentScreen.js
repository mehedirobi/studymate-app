import { useState } from "react";
import {
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";

export default function AddAssignmentScreen({ navigation, addAssignment }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    if (!title || !subject || !deadline) {
      Alert.alert("Missing Fields", "Please fill in title, subject, and deadline.");
      return;
    }

    const newAssignment = {
      id: Date.now().toString(),
      title,
      subject,
      deadline,
      description,
      status: "pending",
    };

    addAssignment(newAssignment);

    setTitle("");
    setSubject("");
    setDeadline("");
    setDescription("");

    Alert.alert("Success", "Assignment added successfully! 🎉");
    navigation.navigate("HomeTab");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Add New Assignment</Text>
      <Text style={styles.subheading}>
        Enter assignment details below
      </Text>

      <Text style={styles.label}>Assignment Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter assignment title"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Subject</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter subject name"
        value={subject}
        onChangeText={setSubject}
      />

      <Text style={styles.label}>Deadline</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 2026-07-10"
        value={deadline}
        onChangeText={setDeadline}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Write assignment details"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Assignment</Text>
      </TouchableOpacity>
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
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});