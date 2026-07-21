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
import { login } from "../services/authService";

const EMAIL_REGEX = /\S+@\S+\.\S+/;

const LOGIN_ERROR_MESSAGES = {
  "auth/invalid-email": "Invalid email address.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
};

// Shared input row (icon + text field + optional password-visibility toggle)
// so the two fields below don't each repeat the same markup.
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

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef(null);

  const handleLogin = useCallback(async () => {
    const userEmail = email.trim();

    if (!userEmail || !password) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    if (!EMAIL_REGEX.test(userEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      await login(userEmail, password);
      // AuthContext will automatically redirect user
    } catch (error) {
      const message =
        LOGIN_ERROR_MESSAGES[error.code] ||
        "Something went wrong. Please try again.";
      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  }, [email, password]);

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
          <Ionicons name="school" size={60} color="#2563eb" />
          <Text style={styles.title}>StudyMate</Text>
          <Text style={styles.subtitle}>
            Welcome back! Sign in to continue.
          </Text>
        </View>

        <FormField
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
          secureEntry={secure}
          onToggleSecure={() => setSecure((prev) => !prev)}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          editable={!loading}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassword")}
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
        >
          <Text style={styles.forgot}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          disabled={loading}
          onPress={handleLogin}
          accessibilityRole="button"
          accessibilityLabel="Login"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Don't have an account?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Register")}
            accessibilityRole="button"
            accessibilityLabel="Create account"
          >
            <Text style={styles.register}>Create Account</Text>
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

  register: {
    marginLeft: 5,
    color: "#2563eb",
    fontWeight: "700",
    fontSize: 15,
  },
});