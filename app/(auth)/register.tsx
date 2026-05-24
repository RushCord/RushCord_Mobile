import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/store/themeStore";
import { Spacing, FontSize, BorderRadius } from "@/constants/theme";

export default function RegisterScreen() {
  const { colors } = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"name" | "email" | "password" | null>(null);

  const { signup, isSigningUp } = useAuthStore();

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ các trường thông tin");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải chứa ít nhất 6 ký tự");
      return;
    }
    try {
      await signup({
        displayName: fullName.trim(),
        email: email.trim(),
        password,
      });
      router.replace({
        pathname: "/(auth)/confirm",
        params: { email: email.trim() },
      });
    } catch (error: any) {
      Alert.alert("Đăng ký thất bại", error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSpacer} />

        {/* Sleek App Branding */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="chatbubbles" size={36} color="#FFFFFF" />
          </View>
          <Text style={[styles.brandText, { color: colors.textHeader }]}>RushCord</Text>
        </View>

        <AuthHeader
          title="Tạo Tài Khoản"
          subtitle="Hãy tạo tài khoản, sau đó xác nhận mã được gửi đến email của bạn"
        />

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Họ và tên</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: focusedField === "name" ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nguyễn Văn A"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: focusedField === "email" ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="name@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Mật khẩu</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: focusedField === "password" ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Ít nhất 6 ký tự"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <Button
            title="Đăng Ký"
            onPress={handleRegister}
            loading={isSigningUp}
            style={{ ...styles.submitBtn, backgroundColor: colors.primary }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Đã có tài khoản? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Đăng nhập</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  headerSpacer: {
    height: 20,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  logoIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  brandText: {
    fontSize: FontSize.xxl,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  form: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm - 1,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    height: 48,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm - 2,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: Spacing.xs,
  },
  submitBtn: {
    marginTop: Spacing.sm,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: FontSize.sm,
  },
  footerLink: {
    fontSize: FontSize.sm,
    fontWeight: "700",
  },
});
