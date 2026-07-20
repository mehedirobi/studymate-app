import { useCallback, useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createNavigationContainerRef } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";

import {
  loadAssignments,
  saveAssignments,
} from "./src/storage/assignmentStorage";

import {
  scheduleAssignmentReminder,
  cancelAssignmentReminder,
  updateAssignmentReminder,
  cancelAllReminders,
  addNotificationResponseListener,
} from "./src/utils/notificationHelper";

const navigationRef = createNavigationContainerRef();

const defaultAssignments = [];

export default function App() {
  const [assignments, setAssignments] = useState(defaultAssignments);
  const [isLoaded, setIsLoaded] = useState(false);

  // Mirrors `assignments` so callbacks (e.g. updateAssignment) can read the
  // latest list without needing `assignments` in their dependency array.
  // This keeps those callbacks referentially stable across renders.
  const assignmentsRef = useRef(assignments);
  useEffect(() => {
    assignmentsRef.current = assignments;
  }, [assignments]);

  // Skips the one write-back that would otherwise fire right after the
  // initial load resolves (saving data that was just read is redundant).
  const skipNextSave = useRef(true);

  useEffect(() => {
    let isMounted = true;

    const getAssignments = async () => {
      try {
        const savedAssignments = await loadAssignments();
        if (isMounted && savedAssignments?.length > 0) {
          setAssignments(savedAssignments);
        }
      } catch (error) {
        console.warn("Failed to load assignments:", error);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    };

    getAssignments();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    saveAssignments(assignments).catch((error) =>
      console.warn("Failed to save assignments:", error)
    );
  }, [assignments, isLoaded]);

  useEffect(() => {
    const subscription = addNotificationResponseListener((assignmentId) => {
      if (!assignmentId || !navigationRef.isReady()) return;

      navigationRef.navigate("AssignmentDetails", { assignmentId });
    });

    return () => subscription.remove();
  }, []);

  const addAssignment = useCallback(async (newAssignment) => {
    if (!newAssignment?.title) return;

    const id = newAssignment.id || Date.now().toString();

    let notificationId = null;

    if (newAssignment.reminderDateTime) {
      try {
        const result = await scheduleAssignmentReminder(
          {
            id,
            title: newAssignment.title,
            subject: newAssignment.subject,
          },
          newAssignment.reminderDateTime
        );

        if (result.success) {
          notificationId = result.notificationId;
        }
      } catch (error) {
        console.warn("Failed to schedule reminder:", error);
      }
    }

    const finalAssignment = {
      id,
      title: newAssignment.title,
      subject: newAssignment.subject || "",
      deadline: newAssignment.deadline,
      description: newAssignment.description || "",
      status: newAssignment.status || "pending",
      priority: newAssignment.priority || "medium",
      reminderDateTime: newAssignment.reminderDateTime || null,
      notificationId,
    };

    setAssignments((prev) => [finalAssignment, ...prev]);
  }, []);

  const deleteAssignment = useCallback((id) => {
    setAssignments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleAssignmentStatus = useCallback((id) => {
    setAssignments((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const newStatus = item.status === "pending" ? "completed" : "pending";

        if (newStatus === "completed" && item.notificationId) {
          cancelAssignmentReminder(item.notificationId);
        }

        return {
          ...item,
          status: newStatus,
          notificationId: newStatus === "completed" ? null : item.notificationId,
        };
      })
    );
  }, []);

  const updateAssignment = useCallback(async (id, changes) => {
    const currentAssignment = assignmentsRef.current.find((item) => item.id === id);
    if (!currentAssignment) return;

    const merged = { ...currentAssignment, ...changes };
    let updatedNotificationId = currentAssignment.notificationId;

    if ("reminderDateTime" in changes) {
      try {
        const result = await updateAssignmentReminder(
          { id, title: merged.title, subject: merged.subject },
          currentAssignment.notificationId,
          changes.reminderDateTime
        );

        updatedNotificationId = result.notificationId ?? null;
      } catch (error) {
        console.warn("Failed to update reminder:", error);
      }
    }

    setAssignments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...merged, notificationId: updatedNotificationId } : item
      )
    );
  }, []);

  const resetAssignments = useCallback(() => {
    cancelAllReminders();
    setAssignments(defaultAssignments);
  }, []);

  if (!isLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator
          navigationRef={navigationRef}
          assignments={assignments}
          addAssignment={addAssignment}
          deleteAssignment={deleteAssignment}
          toggleAssignmentStatus={toggleAssignmentStatus}
          updateAssignment={updateAssignment}
          resetAssignments={resetAssignments}
        />

        <Toast />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
});