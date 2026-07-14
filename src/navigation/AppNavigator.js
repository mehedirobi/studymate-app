import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCallback } from "react";
import AssignmentDetailsScreen from "../screens/AssignmentDetailsScreen";
import TabNavigator from "./TabNavigator";

const Stack = createNativeStackNavigator();

// Hoisted outside the component so it's a stable reference across renders
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
  resetAssignments,
}) {
  // useCallback keeps these render-prop functions referentially stable,
  // so React Navigation doesn't treat the screen as "changed" on every
  // parent re-render (which happens often here since `assignments` updates)
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
      />
    ),
    [assignments, deleteAssignment, toggleAssignmentStatus]
  );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
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
    </NavigationContainer>
  );
}