import { useCallback, useRef, useState } from "react";
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

const EMAIL_REGEX = /\S+@\S+\.\S+/;

const REGISTER_ERROR_MESSAGES = {
  "auth/email-already-in-use": "Email already exists.",
  "auth/invalid-email": "Invalid email.",
  "auth/weak-password": "Weak password.",
};

// Shared input row (icon + text field + optional password-visibility toggle)
// so the four fields below don't each repeat the same markup.
function FormField({
  icon,
  secureEntry,
  onToggleSecure,
  inputRef,
  ...textInputProps
}) {
  return (
    <View style={styles.inputContainer}>
      <Ionicons name={icon} size={20} color="#64748b" />
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureEntry}
        {...textInputProps}
      />
      {onToggleSecure && (
        <TouchableOpacity
          onPress={onToggleSecure}
          accessibilityRole="button"
          accessibilityLabel={secureEntry ? "Show password" : "Hide password"}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={secureEntry ? "eye-off-outline" : "eye-outline"}
            size={22}
            color="#64748b"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const [loading, setLoading] = useState(false);

  // Lets "next" on the keyboard jump to the following field instead of
  // dismissing the keyboard after every entry.
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const handleRegister = useCallback(async () => {
    const fullName = name.trim();
    const userEmail = email.trim();

    if (!fullName || !userEmail || !password || !confirmPassword) {
      Alert.alert("Missing Information", "Please fill all fields.");
      return;
    }

    if (!EMAIL_REGEX.test(userEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await register(fullName, userEmail, password);

      Alert.alert("Success", "Account created successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      const message =
        REGISTER_ERROR_MESSAGES[error.code] || "Something went wrong.";
      Alert.alert("Registration Failed", message);
    } finally {
      setLoading(false);
    }
  }, [name, email, password, confirmPassword, navigation]);

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
          <Ionicons name="person-add" size={60} color="#2563eb" />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join StudyMate and manage your assignments smarter.
          </Text>
        </View>

        <FormField
          icon="person-outline"
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          editable={!loading}
          onSubmitEditing={() => emailRef.current?.focus()}
        />

        <FormField
          inputRef={emailRef}
          icon="mail-outline"
          placeholder="Email Address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
          editable={!loading}
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <FormField
          inputRef={passwordRef}
          icon="lock-closed-outline"
          placeholder="Password"
          secureEntry={securePassword}
          onToggleSecure={() => setSecurePassword((prev) => !prev)}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password-new"
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
          returnKeyType="next"
          editable={!loading}
          onSubmitEditing={() => confirmRef.current?.focus()}
        />

        <FormField
          inputRef={confirmRef}
          icon="shield-checkmark-outline"
          placeholder="Confirm Password"
          secureEntry={secureConfirm}
          onToggleSecure={() => setSecureConfirm((prev) => !prev)}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password-new"
          textContentType="newPassword"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          returnKeyType="done"
          editable={!loading}
          onSubmitEditing={handleRegister}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          disabled={loading}
          onPress={handleRegister}
          accessibilityRole="button"
          accessibilityLabel="Create account"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Already have an account?</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go to login"
          >
            <Text style={styles.login}>Login</Text>
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

  buttonDisabled: {
    opacity: 0.7,
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