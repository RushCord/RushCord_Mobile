import React from "react";
import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

export default function SettingsScreen() {
  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <SettingRow label="Push Notifications" rightEl={<Switch value={true} onValueChange={() => {}} thumbColor={Colors.textHeader} trackColor={{ true: Colors.primary, false: Colors.surface }} />} />
          <SettingRow label="Message Sounds" rightEl={<Switch value={true} onValueChange={() => {}} thumbColor={Colors.textHeader} trackColor={{ true: Colors.primary, false: Colors.surface }} />} />
        </View>

        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.card}>
          <SettingRow label="Show Online Status" rightEl={<Switch value={true} onValueChange={() => {}} thumbColor={Colors.textHeader} trackColor={{ true: Colors.primary, false: Colors.surface }} />} />
          <SettingRow label="Read Receipts" rightEl={<Switch value={false} onValueChange={() => {}} thumbColor={Colors.textHeader} trackColor={{ true: Colors.primary, false: Colors.surface }} />} />
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <SettingRow label="Version" rightEl={<Text style={styles.valueText}>1.0.0</Text>} />
          <SettingRow label="Build" rightEl={<Text style={styles.valueText}>Expo SDK 52</Text>} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({ label, rightEl }: { label: string; rightEl: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {rightEl}
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
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
  valueText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
});
