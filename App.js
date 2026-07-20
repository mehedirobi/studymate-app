import { useCallback, useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createNavigationContainerRef } from "@react-navigation/native";
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

  // Guards the very first save-effect run so we don't immediately
  // re-write default data over whatever was just loaded from disk.
  const hasHydrated = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const getAssignments = async () => {
      const savedAssignments = await loadAssignments();

      if (isMounted && savedAssignments && savedAssignments.length > 0) {
        setAssignments(savedAssignments);
      }

      if (isMounted) {
        hasHydrated.current = true;
        setIsLoaded(true);
      }
    };

    getAssignments();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !hasHydrated.current) return;
    saveAssignments(assignments);
  }, [assignments, isLoaded]);

  // Deep-link: tapping a reminder notification navigates to that
  // assignment's details screen, if the app can resolve the navigator.
  useEffect(() => {
    const subscription = addNotificationResponseListener((assignmentId) => {
      if (!assignmentId || !navigationRef.isReady()) return;
      navigationRef.navigate("AssignmentDetails", { assignmentId });
    });

    return () => subscription.remove();
  }, []);

  // newAssignment can optionally include `reminderDateTime` (a JS Date)
  // if the user picked a reminder time on the Add screen.
  const addAssignment = useCallback(async (newAssignment) => {
    if (!newAssignment?.title) return;

    // Safety net: always ensure a unique id exists
    const id = newAssignment.id || Date.now().toString();

    let notificationId = null;

    if (newAssignment.reminderDateTime) {
      const result = await scheduleAssignmentReminder(
        { id, title: newAssignment.title, subject: newAssignment.subject },
        newAssignment.reminderDateTime,
      );
      if (result.success) {
        notificationId = result.notificationId;
      }
      // If scheduling failed, we still save the assignment — reminder
      // helper already alerted the user, no need to block the whole save.
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
    console.log("Delete ID:", id);

    setAssignments((prev) => {
      console.log("Assignments:", prev);

      return prev.filter((item) => {
        console.log(item.id, typeof item.id);
        console.log(id, typeof id);

        return item.id !== id;
      });
    });
  }, []);

  const toggleAssignmentStatus = useCallback((id) => {
    setAssignments((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const newStatus = item.status === "pending" ? "completed" : "pending";

        // If marking as completed, no need for the reminder anymore
        if (newStatus === "completed" && item.notificationId) {
          cancelAssignmentReminder(item.notificationId);
        }

        return {
          ...item,
          status: newStatus,
          notificationId:
            newStatus === "completed" ? null : item.notificationId,
        };
      }),
    );
  }, []);

  // New: lets an Edit screen (if you add one later) update an assignment's
  // fields and correctly reschedule/cancel its reminder in one call.
  const updateAssignment = useCallback(async (id, changes) => {
    let updatedNotificationId = null;
    let currentAssignment = null;

    setAssignments((prev) => {
      currentAssignment = prev.find((item) => item.id === id) || null;
      return prev;
    });

    if (!currentAssignment) return;

    const merged = { ...currentAssignment, ...changes };

    if ("reminderDateTime" in changes) {
      const result = await updateAssignmentReminder(
        { id, title: merged.title, subject: merged.subject },
        currentAssignment.notificationId,
        changes.reminderDateTime,
      );
      updatedNotificationId = result.notificationId ?? null;
    } else {
      updatedNotificationId = currentAssignment.notificationId;
    }

    setAssignments((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...merged, notificationId: updatedNotificationId }
          : item,
      ),
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
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
});
