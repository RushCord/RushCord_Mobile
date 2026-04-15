import React, { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/Button";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";

export default function ConfirmScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = useMemo(() => String(params.email || "").trim(), [params.email]);
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState("");
  const { confirmSignup, resendConfirmation, isConfirming } = useAuthStore();
  const [isResending, setIsResending] = useState(false);

  const handleConfirm = async () => {
    if (!email.trim() || !otpCode.trim()) {
      Alert.alert("Error", "Please enter email and verification code");
      return;
    }

    try {
      await confirmSignup({ email: email.trim(), otpCode: otpCode.trim() });
      Alert.alert("Success", "Email verified. You can sign in now.", [
        {
          text: "Continue",
          onPress: () => router.replace("/(auth)/login"),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Verification Failed", error.message);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email first");
      return;
    }

    try {
      setIsResending(true);
      await resendConfirmation(email.trim());
      Alert.alert("Code Sent", "A new verification code has been sent to your email.");
    } catch (error: any) {
      Alert.alert("Resend Failed", error.message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <AuthHeader
        title="Verify your email"
        subtitle="RushCord backend requires email confirmation before sign in"
      />

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Verification Code</Text>
          <TextInput
            style={styles.input}
            value={otpCode}
            onChangeText={setOtpCode}
            placeholder="6-digit code"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={6}
          />
        </View>

        <Button
          title="Verify Email"
          onPress={handleConfirm}
          loading={isConfirming}
          style={styles.submitBtn}
        />

        <TouchableOpacity
          onPress={handleResend}
          disabled={isResending}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryBtnText}>
            {isResending ? "Sending..." : "Resend code"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already verified? </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  form: {
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
});
