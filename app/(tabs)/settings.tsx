import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/store/themeStore";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

export default function SettingsScreen() {
  const { colors } = useTheme();

  // State switches
  const [pushNotif, setPushNotif] = useState(true);
  const [msgSounds, setMsgSounds] = useState(true);
  const [showStatus, setShowStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(false);

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Thông báo</Text>
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <SettingRow
            icon="notifications"
            iconColor={colors.primary}
            label="Thông báo đẩy (Push)"
            rightEl={
              <Switch
                value={pushNotif}
                onValueChange={setPushNotif}
                thumbColor="#FFFFFF"
                trackColor={{ true: colors.primary, false: colors.surface }}
              />
            }
          />
          <SettingRow
            icon="volume-high"
            iconColor="#FAA61A"
            label="Âm thanh tin nhắn"
            rightEl={
              <Switch
                value={msgSounds}
                onValueChange={setMsgSounds}
                thumbColor="#FFFFFF"
                trackColor={{ true: colors.primary, false: colors.surface }}
              />
            }
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Quyền riêng tư</Text>
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <SettingRow
            icon="eye"
            iconColor={colors.success}
            label="Hiển thị trạng thái hoạt động"
            rightEl={
              <Switch
                value={showStatus}
                onValueChange={setShowStatus}
                thumbColor="#FFFFFF"
                trackColor={{ true: colors.primary, false: colors.surface }}
              />
            }
          />
          <SettingRow
            icon="mail-open"
            iconColor={colors.danger}
            label="Xác nhận đã đọc (Read receipts)"
            rightEl={
              <Switch
                value={readReceipts}
                onValueChange={setReadReceipts}
                thumbColor="#FFFFFF"
                trackColor={{ true: colors.primary, false: colors.surface }}
              />
            }
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Thông tin</Text>
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <SettingRow
            icon="information-circle"
            iconColor="#80848E"
            label="Phiên bản ứng dụng"
            rightEl={<Text style={[styles.valueText, { color: colors.textMuted }]}>1.0.0 (Premium)</Text>}
          />
          <SettingRow
            icon="code-working"
            iconColor="#80848E"
            label="Môi trường chạy"
            rightEl={<Text style={[styles.valueText, { color: colors.textMuted }]}>Expo SDK 54 / React Native</Text>}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SettingRowProps {
  icon: any;
  iconColor: string;
  label: string;
  rightEl: React.ReactNode;
}

function SettingRow({ icon, iconColor, label, rightEl }: SettingRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }]}>
      <View style={styles.leftRow}>
        <View style={[styles.iconBox, { backgroundColor: "rgba(255,255,255,0.03)" }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      </View>
      {rightEl}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.xs + 1,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md - 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm + 2,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  valueText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
});
