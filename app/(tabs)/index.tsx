import React, { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import type { User } from "@/types/user";

export default function MessagesScreen() {
  const { users, isUsersLoading, getUsers, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getUsers();
  }, []);

  const handleUserPress = (user: User) => {
    setSelectedUser(user);
    router.push(`/chat/${user._id}`);
  };

  if (isUsersLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const isOnline = onlineUsers.includes(item._id);
          return (
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => handleUserPress(item)}
              activeOpacity={0.7}
            >
              <Avatar
                uri={item.profilePic}
                name={item.fullName}
                size={48}
                isOnline={isOnline}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.fullName}</Text>
                <Text style={styles.userStatus}>
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: Colors.textHeader,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  userStatus: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.md + 48 + Spacing.md,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
});
