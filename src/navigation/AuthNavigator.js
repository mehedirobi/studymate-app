import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#2563eb",
        },
        headerTintColor: "#fff",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Register"
        component={RegisterScreen}
      />

      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: "Reset Password",
        }}
      />
    </Stack.Navigator>
  );
}