import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { forgotPassword } from "../services/authService";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleReset = async () => {
    const userEmail = email.trim();

    if (!userEmail) {
      Alert.alert("Missing Email", "Please enter your email.");
      return;
    }

    if (!validateEmail(userEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email.");
      return;
    }

    try {
      setLoading(true);

      await forgotPassword(userEmail);

      Alert.alert(
        "Success",
        "Password reset email has been sent.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      let message = "Something went wrong.";

      switch (error.code) {
        case "auth/user-not-found":
          message = "No account found with this email.";
          break;

        case "auth/invalid-email":
          message = "Invalid email address.";
          break;
      }

      Alert.alert("Reset Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons
        name="lock-closed"
        size={70}
        color="#2563eb"
        style={styles.icon}
      />

      <Text style={styles.title}>Forgot Password?</Text>

      <Text style={styles.subtitle}>
        Enter your registered email address and we'll send you a password reset link.
      </Text>

      <TextInput
        placeholder="Enter your email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleReset}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 25,
    backgroundColor: "#fff",
  },

  icon: {
    alignSelf: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    color: "#111827",
    marginBottom: 10,
  },

  subtitle: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 35,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },

  button: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  link: {
    textAlign: "center",
    color: "#2563eb",
    marginTop: 20,
    fontWeight: "600",
  },
});