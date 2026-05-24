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
import { SafeAreaView } from "react-native-safe-area-context";
import { getMessagePreview } from "@/lib/messagePreview";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import type { RecentConversation } from "@/types/conversation";
import type { User } from "@/types/user";

type ConversationListItem = {
  conversationId: string;
  user: User;
  lastMessageAt: string | null;
  lastMessage: RecentConversation["lastMessage"] | null;
};

export default function MessagesScreen() {
  const {
    users,
    recentConversations,
    isUsersLoading,
    isRecentConversationsLoading,
    getUsers,
    getRecentConversations,
    setSelectedUser,
  } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getUsers();
    getRecentConversations();
  }, [getRecentConversations, getUsers]);

  const handleUserPress = (user: User) => {
    setSelectedUser(user);
    router.push(`/chat/${user._id}`);
  };

  const recentByUserId = new Map(
    (recentConversations || [])
      .filter((c) => c?.user?._id)
      .map((c) => [String(c.user._id), c] as const),
  );

  const allConversations: ConversationListItem[] = (users || [])
    .filter((u) => u && u._id)
    .map((user) => {
      const recent = recentByUserId.get(String(user._id));
      return {
        conversationId:
          recent?.conversationId ||
          `DM#${[String(user._id)].sort().join("#")}`,
        user,
        lastMessageAt: recent?.lastMessageAt ?? null,
        lastMessage: recent?.lastMessage ?? null,
      };
    })
    .sort((a, b) =>
      String(b.lastMessageAt || "").localeCompare(String(a.lastMessageAt || "")),
    );

  if (isUsersLoading || isRecentConversationsLoading) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <FlatList
        data={allConversations}
        keyExtractor={(item) => item.user._id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }: { item: ConversationListItem }) => {
          const isOnline = onlineUsers.includes(item.user._id);
          return (
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => handleUserPress(item.user)}
              activeOpacity={0.7}
            >
              <Avatar
                uri={item.user.profilePic}
                name={item.user.fullName}
                size={48}
                isOnline={isOnline}
              />
              <View style={styles.userInfo}>
                <View style={styles.userTopRow}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {item.user.fullName}
                  </Text>
                  {item.lastMessageAt ? (
                    <Text style={styles.messageTime}>
                      {new Date(item.lastMessageAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.previewText} numberOfLines={1}>
                  {item.lastMessage
                    ? getMessagePreview(item.lastMessage)
                    : "No messages yet"}
                </Text>
                <Text style={styles.userStatus}>
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No users yet</Text>
          </View>
        }
      />
    </SafeAreaView>
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
    gap: 2,
  },
  userTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  userName: {
    color: Colors.textHeader,
    fontSize: FontSize.md,
    fontWeight: "600",
    flex: 1,
  },
  previewText: {
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  messageTime: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
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
