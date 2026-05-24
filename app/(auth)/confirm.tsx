import React, { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/store/themeStore";
import { Spacing, FontSize, BorderRadius } from "@/constants/theme";

export default function ConfirmScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = useMemo(() => String(params.email || "").trim(), [params.email]);
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState("");
  const [focusedField, setFocusedField] = useState<"email" | "otp" | null>(null);

  const { confirmSignup, resendConfirmation, isConfirming } = useAuthStore();
  const [isResending, setIsResending] = useState(false);

  const handleConfirm = async () => {
    if (!email.trim() || !otpCode.trim()) {
      Alert.alert("Lỗi", "Vui lòng điền email và mã xác minh");
      return;
    }

    try {
      await confirmSignup({ email: email.trim(), otpCode: otpCode.trim() });
      Alert.alert("Thành công", "Xác thực thành công! Hãy đăng nhập tài khoản của bạn.", [
        {
          text: "Tiếp tục",
          onPress: () => router.replace("/(auth)/login"),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Xác thực thất bại", error.message);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập email của bạn trước");
      return;
    }

    try {
      setIsResending(true);
      await resendConfirmation(email.trim());
      Alert.alert("Đã gửi mã", "Mã xác thực mới đã được gửi vào email của bạn.");
    } catch (error: any) {
      Alert.alert("Gửi lại thất bại", error.message);
    } finally {
      setIsResending(false);
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
          title="Xác minh Email"
          subtitle="Hệ thống Backend yêu cầu kích hoạt tài khoản bằng mã xác nhận gửi tới Email của bạn"
        />

        <View style={styles.form}>
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
            <Text style={[styles.label, { color: colors.text }]}>Mã kích hoạt OTP</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: focusedField === "otp" ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons name="key-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="Nhập 6 chữ số"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={6}
                onFocus={() => setFocusedField("otp")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <Button
            title="Kích Hoạt Tài Khoản"
            onPress={handleConfirm}
            loading={isConfirming}
            style={{ ...styles.submitBtn, backgroundColor: colors.primary }}
          />

          <TouchableOpacity
            onPress={handleResend}
            disabled={isResending}
            style={styles.secondaryBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
              {isResending ? "Đang gửi..." : "Gửi lại mã kích hoạt"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Đã được kích hoạt? </Text>
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
  submitBtn: {
    marginTop: Spacing.sm,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  secondaryBtnText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
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
