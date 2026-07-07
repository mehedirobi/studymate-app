import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AssignmentDetailsScreen from "../screens/AssignmentDetailsScreen";
import TabNavigator from "./TabNavigator";

const Stack = createNativeStackNavigator();

export default function AppNavigator({
  assignments,
  addAssignment,
  deleteAssignment,
  toggleAssignmentStatus,
  resetAssignments,
}) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: "#2563eb",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          contentStyle: {
            backgroundColor: "#f8fafc",
          },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          options={{ headerShown: false }}
        >
          {(props) => (
            <TabNavigator
              {...props}
              assignments={assignments}
              addAssignment={addAssignment}
              resetAssignments={resetAssignments}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="AssignmentDetails"
          options={{ title: "Assignment Details" }}
        >
          {(props) => (
            <AssignmentDetailsScreen
              {...props}
              deleteAssignment={deleteAssignment}
              toggleAssignmentStatus={toggleAssignmentStatus}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}