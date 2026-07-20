import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
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

    <View>

    </View>

  );

}

const styles = StyleSheet.create({

});