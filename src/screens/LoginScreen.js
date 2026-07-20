import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { login } from "../services/authService";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  const validateEmail = (value) => {
    return /\S+@\S+\.\S+/.test(value);
  };

  const handleLogin = async () => {
    const userEmail = email.trim();

    if (!userEmail || !password) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    if (!validateEmail(userEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      await login(userEmail, password);

      // AuthContext will automatically redirect user

    } catch (error) {
      let message = "Something went wrong. Please try again.";

      switch (error.code) {
        case "auth/invalid-email":
          message = "Invalid email address.";
          break;

        case "auth/user-not-found":
          message = "No account found with this email.";
          break;

        case "auth/wrong-password":
          message = "Incorrect password.";
          break;

        case "auth/invalid-credential":
          message = "Invalid email or password.";
          break;

        case "auth/too-many-requests":
          message =
            "Too many attempts. Please try again later.";
          break;
      }

      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Ionicons
            name="school"
            size={60}
            color="#2563eb"
          />

          <Text style={styles.title}>StudyMate</Text>

          <Text style={styles.subtitle}>
            Welcome back! Sign in to continue.
          </Text>
        </View>

        {/* Email */}

        <View style={styles.inputContainer}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#64748b"
          />

          <TextInput
            style={styles.input}
            placeholder="Email Address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password */}

        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#64748b"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry={secure}
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            onPress={() => setSecure(!secure)}
          >
            <Ionicons
              name={secure ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>

        {/* Forgot */}

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("ForgotPassword")
          }
        >
          <Text style={styles.forgot}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        {/* Login */}

        <TouchableOpacity
          style={[
            styles.button,
            loading && { opacity: 0.7 },
          ]}
          disabled={loading}
          onPress={handleLogin}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Login
            </Text>
          )}
        </TouchableOpacity>

        {/* Register */}

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>
            Don't have an account?
          </Text>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Register")
            }
          >
            <Text style={styles.register}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 25,
    backgroundColor: "#f8fafc",
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 45,
  },

  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#2563eb",
    marginTop: 12,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 15,
    marginBottom: 18,
    height: 58,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#0f172a",
  },

  forgot: {
    textAlign: "right",
    color: "#2563eb",
    fontWeight: "600",
    marginBottom: 25,
  },

  button: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },

  bottomText: {
    color: "#64748b",
    fontSize: 15,
  },

  register: {
    marginLeft: 5,
    color: "#2563eb",
    fontWeight: "700",
    fontSize: 15,
  },
});