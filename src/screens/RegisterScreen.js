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
import { register } from "../services/authService";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleRegister = async () => {
    const fullName = name.trim();
    const userEmail = email.trim();

    if (!fullName || !userEmail || !password || !confirmPassword) {
      Alert.alert("Missing Information", "Please fill all fields.");
      return;
    }

    if (!validateEmail(userEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Password Mismatch",
        "Passwords do not match."
      );
      return;
    }

    try {
      setLoading(true);

      await register(fullName, userEmail, password);

      Alert.alert(
        "Success",
        "Account created successfully!"
      );

    } catch (error) {
      let message = "Something went wrong.";

      switch (error.code) {
        case "auth/email-already-in-use":
          message = "Email already exists.";
          break;

        case "auth/invalid-email":
          message = "Invalid email.";
          break;

        case "auth/weak-password":
          message = "Weak password.";
          break;
      }

      Alert.alert("Registration Failed", message);

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
            name="person-add"
            size={60}
            color="#2563eb"
          />

          <Text style={styles.title}>
            Create Account
          </Text>

          <Text style={styles.subtitle}>
            Join StudyMate and manage your assignments smarter.
          </Text>
        </View>

        {/* Name */}

        <View style={styles.inputContainer}>
          <Ionicons
            name="person-outline"
            size={20}
            color="#64748b"
          />

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
          />
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
            secureTextEntry={securePassword}
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            onPress={() =>
              setSecurePassword(!securePassword)
            }
          >
            <Ionicons
              name={
                securePassword
                  ? "eye-off-outline"
                  : "eye-outline"
              }
              size={22}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>

        {/* Confirm Password */}

        <View style={styles.inputContainer}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color="#64748b"
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            secureTextEntry={secureConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            onPress={() =>
              setSecureConfirm(!secureConfirm)
            }
          >
            <Ionicons
              name={
                secureConfirm
                  ? "eye-off-outline"
                  : "eye-outline"
              }
              size={22}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>

        {/* Register Button */}

        <TouchableOpacity
          style={[
            styles.button,
            loading && { opacity: 0.7 },
          ]}
          disabled={loading}
          onPress={handleRegister}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        {/* Login */}

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>
            Already have an account?
          </Text>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.login}>
              Login
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
    marginBottom: 40,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#2563eb",
    marginTop: 12,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
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

  button: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
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

  login: {
    marginLeft: 5,
    color: "#2563eb",
    fontWeight: "700",
    fontSize: 15,
  },
});