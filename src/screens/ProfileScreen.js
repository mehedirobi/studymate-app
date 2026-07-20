import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { logout } from "../services/authService";

export default function ProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await logout();
            } catch (error) {
              Alert.alert("Error", error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Ionicons name="person" size={60} color="#fff" />
      </View>

      {/* User Name */}
      <Text style={styles.name}>
        {user?.displayName || "StudyMate User"}
      </Text>

      {/* Email */}
      <Text style={styles.email}>
        {user?.email}
      </Text>

      {/* Card */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="mail-outline" size={22} color="#2563eb" />
          <Text style={styles.rowText}>{user?.email}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Ionicons
            name="checkmark-circle-outline"
            size={22}
            color="#16a34a"
          />
          <Text style={styles.rowText}>
            {user?.emailVerified
              ? "Email Verified"
              : "Email Not Verified"}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Ionicons
            name="phone-portrait-outline"
            size={22}
            color="#2563eb"
          />
          <Text style={styles.rowText}>
            StudyMate v1.0.0
          </Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#fff"
            />
            <Text style={styles.logoutText}>
              Logout
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.footer}>
        
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    padding: 25,
    paddingTop: 60,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },

  email: {
    fontSize: 15,
    color: "#6b7280",
    marginTop: 5,
    marginBottom: 30,
  },

  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    marginBottom: 30,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  rowText: {
    marginLeft: 15,
    fontSize: 16,
    color: "#111827",
    flex: 1,
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
  },

  logoutButton: {
    width: "100%",
    height: 55,
    backgroundColor: "#dc2626",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  logoutText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 8,
  },

  footer: {
    marginTop: 40,
    color: "#94a3b8",
    fontSize: 14,
  },
});