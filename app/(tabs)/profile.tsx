import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

export default function ProfileScreen() {
  const { authUser, updateProfile, isUpdatingProfile, logout } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      try {
        await updateProfile({ profilePic: base64Image });
      } catch (error: any) {
        Alert.alert("Error", error.message);
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true);
          await logout();
          setIsLoggingOut(false);
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (!authUser) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickImage} disabled={isUpdatingProfile}>
          <Avatar
            uri={authUser.profilePic}
            name={authUser.fullName}
            size={96}
          />
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>Edit</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{authUser.fullName}</Text>
        <Text style={styles.email}>{authUser.email}</Text>
      </View>

      <View style={styles.infoCard}>
        <InfoRow label="Full Name" value={authUser.fullName} />
        <InfoRow label="Email" value={authUser.email} />
        <InfoRow
          label="Member Since"
          value={new Date(authUser.createdAt).toLocaleDateString()}
        />
      </View>

      <Button
        title="Logout"
        onPress={handleLogout}
        variant="danger"
        loading={isLoggingOut}
        style={styles.logoutBtn}
      />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  avatarSection: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  editBadgeText: {
    color: Colors.textHeader,
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  name: {
    color: Colors.textHeader,
    fontSize: FontSize.xl,
    fontWeight: "700",
    marginTop: Spacing.sm,
  },
  email: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  infoCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    color: Colors.text,
    fontSize: FontSize.sm,
    flex: 1,
    textAlign: "right",
  },
  logoutBtn: {
    marginTop: Spacing.sm,
  },
});
