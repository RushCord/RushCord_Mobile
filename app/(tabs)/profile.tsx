import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore, useTheme } from "@/store/themeStore";
import { ThemesColors } from "@/constants/theme";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { uploadAssetViaPresign } from "@/services/upload";

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { authUser, updateProfile, isUpdatingProfile, logout } = useAuthStore();
  const { theme: currentTheme, setTheme } = useThemeStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Quyền truy cập", "Vui lòng cho phép truy cập thư viện ảnh.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const uploaded = await uploadAssetViaPresign(result.assets[0], "avatar");
        await updateProfile({ profilePic: uploaded.publicUrl });
        Alert.alert("Thành công", "Đã cập nhật ảnh đại diện.");
      } catch (error: any) {
        Alert.alert("Lỗi", error.message || "Tải ảnh lên thất bại");
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
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

  const themesList = [
    { id: "dark", label: "Dark", desc: "Tối, nguyên bản Discord" },
    { id: "light", label: "Light", desc: "Sáng, tinh giản" },
    { id: "cupcake", label: "Cupcake", desc: "Pastel dịu ngọt, tông ấm" },
    { id: "retro", label: "Retro", desc: "Cổ điển, xanh lá hoài niệm" },
    { id: "valentine", label: "Valentine", desc: "Hồng tình yêu ấm áp" },
    { id: "nord", label: "Nord", desc: "Xanh tuyết tuyền Bắc Âu" },
  ];

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Discord User Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          {/* Banner */}
          <View style={[styles.banner, { backgroundColor: colors.primary }]} />
          
          {/* Overlapping Avatar */}
          <View style={styles.avatarWrapper}>
            <TouchableOpacity onPress={handlePickImage} disabled={isUpdatingProfile} activeOpacity={0.8}>
              <View style={[styles.avatarBorder, { borderColor: colors.backgroundSecondary }]}>
                <Avatar uri={authUser.profilePic} name={authUser.fullName} size={90} />
              </View>
              <View style={[styles.editBadge, { backgroundColor: colors.primary, borderColor: colors.backgroundSecondary }]}>
                {isUpdatingProfile ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* User Name & Info */}
          <View style={styles.userInfoWrapper}>
            <Text style={[styles.name, { color: colors.textHeader }]}>{authUser.fullName}</Text>
            <Text style={[styles.email, { color: colors.textMuted }]}>{authUser.email}</Text>
            
            <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
            
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  Thành viên từ: {new Date(authUser.createdAt || Date.now()).toLocaleDateString("vi-VN")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dynamic Theme Switcher Grid */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          Giao diện ứng dụng (Theme Switcher)
        </Text>
        <View style={styles.themeGrid}>
          {themesList.map((item) => {
            const isApplied = currentTheme === item.id;
            const themeColors = ThemesColors[item.id as keyof typeof ThemesColors];
            
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: themeColors.backgroundSecondary,
                    borderColor: isApplied ? colors.primary : colors.border,
                    borderWidth: isApplied ? 2 : 1,
                  },
                ]}
                onPress={() => setTheme(item.id)}
                activeOpacity={0.7}
              >
                {/* Theme Palette Preview Box */}
                <View style={[styles.palettePreview, { backgroundColor: themeColors.background }]}>
                  <View style={[styles.colorDot, { backgroundColor: themeColors.primary }]} />
                  <View style={[styles.colorDot, { backgroundColor: themeColors.surface }]} />
                  <View style={[styles.colorDot, { backgroundColor: themeColors.text }]} />
                </View>
                
                <View style={styles.themeCardMeta}>
                  <Text style={[styles.themeLabel, { color: themeColors.textHeader }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={[styles.themeDesc, { color: themeColors.textMuted }]} numberOfLines={1}>
                    {item.desc}
                  </Text>
                </View>

                {isApplied && (
                  <View style={[styles.checkIndicator, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark-sharp" size={10} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logout Button */}
        <Button
          title="Đăng xuất tài khoản"
          onPress={handleLogout}
          variant="danger"
          loading={isLoggingOut}
          style={styles.logoutBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  profileCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  banner: {
    height: 72,
  },
  avatarWrapper: {
    marginTop: -45,
    marginLeft: Spacing.md,
    alignSelf: "flex-start",
    position: "relative",
  },
  avatarBorder: {
    borderWidth: 5,
    borderRadius: 50,
    overflow: "hidden",
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfoWrapper: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: "800",
  },
  email: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  dividerLine: {
    height: 1,
    marginVertical: Spacing.md,
  },
  detailsList: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  themeCard: {
    width: "48.5%",
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
    position: "relative",
  },
  palettePreview: {
    height: 32,
    borderRadius: BorderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  themeCardMeta: {
    gap: 2,
  },
  themeLabel: {
    fontSize: FontSize.sm + 1,
    fontWeight: "700",
  },
  themeDesc: {
    fontSize: 10,
  },
  checkIndicator: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: {
    marginTop: Spacing.sm,
  },
});
