import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { ActivityIndicator, View } from "react-native";

import AssignmentDetailsScreen from "../screens/AssignmentDetailsScreen";
import TabNavigator from "./TabNavigator";
import AuthNavigator from "./AuthNavigator";
import { useAuth } from "../context/AuthContext";

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: "#2563eb" },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "700", fontSize: 18 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: "#f8fafc" },
  animation: "slide_from_right",
};

export default function AppNavigator({
  assignments,
  addAssignment,
  deleteAssignment,
  toggleAssignmentStatus,
  updateAssignment,
  resetAssignments,
}) {
  // ✅ Hook সবসময় Component-এর ভিতরে থাকবে
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const renderTabNavigator = useCallback(
    (props) => (
      <TabNavigator
        {...props}
        assignments={assignments}
        addAssignment={addAssignment}
        resetAssignments={resetAssignments}
      />
    ),
    [assignments, addAssignment, resetAssignments]
  );

  const renderAssignmentDetails = useCallback(
    (props) => (
      <AssignmentDetailsScreen
        {...props}
        assignments={assignments}
        deleteAssignment={deleteAssignment}
        toggleAssignmentStatus={toggleAssignmentStatus}
        updateAssignment={updateAssignment}
      />
    ),
    [
      assignments,
      deleteAssignment,
      toggleAssignmentStatus,
      updateAssignment,
    ]
  );

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen
            name="MainTabs"
            options={{ headerShown: false }}
          >
            {renderTabNavigator}
          </Stack.Screen>

          <Stack.Screen
            name="AssignmentDetails"
            options={({ route }) => ({
              title: route.params?.title ?? "Assignment Details",
            })}
          >
            {renderAssignmentDetails}
          </Stack.Screen>
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}