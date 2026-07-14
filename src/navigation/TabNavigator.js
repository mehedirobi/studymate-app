import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useMemo } from "react";
import HomeScreen from "../screens/HomeScreen";
import AddAssignmentScreen from "../screens/AddAssignmentScreen";
import AboutScreen from "../screens/AboutScreen";

const Tab = createBottomTabNavigator();

// Maps route name -> [focused icon, unfocused icon]. Hoisted so it's not
// recreated on every render, and using outline/filled pairs gives a much
// clearer "selected" state than color alone.
const TAB_ICONS = {
  HomeTab: ["home", "home-outline"],
  AddTab: ["add-circle", "add-circle-outline"],
  AboutTab: ["information-circle", "information-circle-outline"],
};

export default function TabNavigator({
  assignments,
  addAssignment,
  resetAssignments,
}) {
  const insets = useSafeAreaInsets();

  // Bottom inset handles the home indicator on iOS / gesture nav on Android
  // so the tab bar doesn't get overlapped by system UI on newer devices.
  const tabBarStyle = useMemo(
    () => ({
      height: 60 + insets.bottom,
      paddingBottom: Math.max(insets.bottom, 8),
      paddingTop: 8,
      backgroundColor: "#ffffff",
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
        marginTop: -2,
      },
      tabBarItemStyle: {
        // Ensures a comfortable min touch target (accessibility)
        minHeight: 44,
      },
      tabBarIcon: ({ color, size, focused }) => {
        const [filled, outline] = TAB_ICONS[route.name] ?? ["ellipse", "ellipse-outline"];
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
      <HomeScreen {...props} assignments={assignments} resetAssignments={resetAssignments} />
    ),
    [assignments, resetAssignments]
  );

  const renderAdd = useCallback(
    (props) => <AddAssignmentScreen {...props} addAssignment={addAssignment} />,
    [addAssignment]
  );

  const renderAbout = useCallback((props) => <AboutScreen {...props} />, []);

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="HomeTab"
        options={{ title: "Home", tabBarAccessibilityLabel: "Home tab" }}
      >
        {renderHome}
      </Tab.Screen>

      <Tab.Screen
        name="AddTab"
        options={{ title: "Add", tabBarAccessibilityLabel: "Add assignment tab" }}
      >
        {renderAdd}
      </Tab.Screen>

      <Tab.Screen
        name="AboutTab"
        options={{ title: "About", tabBarAccessibilityLabel: "About tab" }}
      >
        {renderAbout}
      </Tab.Screen>
    </Tab.Navigator>
  );
}