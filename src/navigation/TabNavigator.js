import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useMemo } from "react";

import HomeScreen from "../screens/HomeScreen";
import AddAssignmentScreen from "../screens/AddAssignmentScreen";
import AboutScreen from "../screens/AboutScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  HomeTab: ["home", "home-outline"],
  AddTab: ["add-circle", "add-circle-outline"],
  AboutTab: ["information-circle", "information-circle-outline"],
  ProfileTab: ["person", "person-outline"],
};

export default function TabNavigator({
  assignments,
  addAssignment,
  resetAssignments,
}) {
  const insets = useSafeAreaInsets();

  const tabBarStyle = useMemo(
    () => ({
      height: 60 + insets.bottom,
      paddingBottom: Math.max(insets.bottom, 8),
      paddingTop: 8,
      backgroundColor: "#fff",
      borderTopWidth: 0,
      elevation: 8,
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    }),
    [insets.bottom]
  );

  const screenOptions = useCallback(
    ({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: "#2563eb",
      tabBarInactiveTintColor: "#94a3b8",
      tabBarStyle,

      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: "600",
      },

      tabBarIcon: ({ color, size, focused }) => {
        const [filled, outline] =
          TAB_ICONS[route.name] ?? ["ellipse", "ellipse-outline"];

        return (
          <Ionicons
            name={focused ? filled : outline}
            size={route.name === "AddTab" ? size + 6 : size}
            color={color}
          />
        );
      },
    }),
    [tabBarStyle]
  );

  const renderHome = useCallback(
    (props) => (
      <HomeScreen
        {...props}
        assignments={assignments}
        resetAssignments={resetAssignments}
      />
    ),
    [assignments, resetAssignments]
  );

  const renderAdd = useCallback(
    (props) => (
      <AddAssignmentScreen
        {...props}
        addAssignment={addAssignment}
      />
    ),
    [addAssignment]
  );

  const renderAbout = useCallback(
    (props) => <AboutScreen {...props} />,
    []
  );

  const renderProfile = useCallback(
    (props) => <ProfileScreen {...props} />,
    []
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="HomeTab"
        options={{ title: "Home" }}
      >
        {renderHome}
      </Tab.Screen>

      <Tab.Screen
        name="AddTab"
        options={{ title: "Add" }}
      >
        {renderAdd}
      </Tab.Screen>

      <Tab.Screen
        name="AboutTab"
        options={{ title: "About" }}
      >
        {renderAbout}
      </Tab.Screen>

      <Tab.Screen
        name="ProfileTab"
        options={{ title: "Profile" }}
      >
        {renderProfile}
      </Tab.Screen>
    </Tab.Navigator>
  );
}