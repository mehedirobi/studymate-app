import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "../screens/HomeScreen";
import AddAssignmentScreen from "../screens/AddAssignmentScreen";
import AboutScreen from "../screens/AboutScreen";

const Tab = createBottomTabNavigator();

export default function TabNavigator({
  assignments,
  addAssignment,
  resetAssignments,
}) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === "HomeTab") {
            iconName = "home";
          } else if (route.name === "AddTab") {
            iconName = "add-circle";
          } else if (route.name === "AboutTab") {
            iconName = "information-circle";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        options={{ title: "Home" }}
      >
        {(props) => (
          <HomeScreen
            {...props}
            assignments={assignments}
            resetAssignments={resetAssignments}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="AddTab"
        options={{ title: "Add" }}
      >
        {(props) => (
          <AddAssignmentScreen
            {...props}
            addAssignment={addAssignment}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="AboutTab"
        options={{ title: "About" }}
      >
        {(props) => <AboutScreen {...props} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}