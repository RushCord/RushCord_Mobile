import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/store/themeStore";
import { Avatar } from "@/components/ui/Avatar";
import { Spacing, FontSize, BorderRadius } from "@/constants/theme";
import type { User } from "@/types/user";

export default function FriendsScreen() {
  const { colors } = useTheme();
  const {
    users,
    friends,
    incomingFriendRequests,
    outgoingFriendRequests,
    isFriendsLoading,
    getUsers,
    getFriends,
    getFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    deleteFriendRequest,
    removeFriend,
    setSelectedUser,
  } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"all" | "requests" | "add">("all");
  const [emailInput, setEmailInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getUsers();
    getFriends();
    getFriendRequests();
  }, [getUsers, getFriends, getFriendRequests]);

  const knownIds = useMemo(() => {
    const s = new Set<string>();
    for (const f of friends || []) s.add(String(f.otherUserId));
    for (const r of incomingFriendRequests || []) s.add(String(r.otherUserId));
    for (const r of outgoingFriendRequests || []) s.add(String(r.otherUserId));
    s.add(String(authUser?._id || ""));
    return s;
  }, [friends, incomingFriendRequests, outgoingFriendRequests, authUser?._id]);

  // Suggestions for adding
  const addableUsers = useMemo(() => {
    return (users || []).filter((u) => u && u._id && !knownIds.has(String(u._id)));
  }, [users, knownIds]);

  const handleSendRequest = async (targetUser?: User) => {
    let target = targetUser;
    const email = emailInput.trim().toLowerCase();

    if (!target) {
      if (!email) {
        Alert.alert("Lỗi", "Vui lòng nhập email");
        return;
      }
      const found = (users || []).find(
        (u) => String(u?.email || "").trim().toLowerCase() === email
      );
      if (!found?._id) {
        Alert.alert("Lỗi", "Không tìm thấy người dùng với email này");
        return;
      }
      if (knownIds.has(String(found._id))) {
        Alert.alert("Lỗi", "Người này đã là bạn hoặc đang chờ xử lý");
        return;
      }
      target = found;
    }

    if (!target?._id) return;

    try {
      setIsSubmitting(true);
      await sendFriendRequest(target._id);
      Alert.alert("Thành công", `Đã gửi lời mời kết bạn tới ${target.fullName}`);
      setEmailInput("");
      getFriendRequests();
    } catch (e: any) {
      Alert.alert("Lỗi", e.message || "Gửi lời mời thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (userId: string, name: string) => {
    try {
      await acceptFriendRequest(userId);
      Alert.alert("Thành công", `Bạn và ${name} đã trở thành bạn bè`);
      getFriends();
      getFriendRequests();
    } catch (e: any) {
      Alert.alert("Lỗi", e.message || "Không thể chấp nhận lời mời");
    }
  };

  const handleDeleteRequest = async (userId: string, isIncoming: boolean) => {
    const title = isIncoming ? "Từ chối lời mời" : "Hủy yêu cầu kết bạn";
    const msg = isIncoming
      ? "Bạn có chắc muốn từ chối lời mời này?"
      : "Bạn có chắc muốn hủy yêu cầu kết bạn này?";

    Alert.alert(title, msg, [
      { text: "Không", style: "cancel" },
      {
        text: "Có",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFriendRequest(userId);
            getFriendRequests();
          } catch (e: any) {
            Alert.alert("Lỗi", e.message || "Thao tác thất bại");
          }
        },
      },
    ]);
  };

  const handleUnfriend = async (userId: string, name: string) => {
    Alert.alert(
      "Hủy kết bạn",
      `Bạn có chắc chắn muốn hủy kết bạn với ${name}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          style: "destructive",
          onPress: async () => {
            try {
              await removeFriend(userId);
              Alert.alert("Thành công", `Đã hủy kết bạn với ${name}`);
              getFriends();
            } catch (e: any) {
              Alert.alert("Lỗi", e.message || "Thao tác thất bại");
            }
          },
        },
      ]
    );
  };

  const openChatWithUser = (user: User) => {
    setSelectedUser(user);
    router.push(`/chat/${user._id}`);
  };

  // Badge count for requests
  const requestCount = (incomingFriendRequests || []).length;

  const renderFriendItem = ({ item }: { item: any }) => {
    const u = (users || []).find((x) => String(x._id) === String(item.otherUserId));
    if (!u) return null;
    const isOnline = onlineUsers.includes(u._id);

    return (
      <View style={[styles.friendCard, { backgroundColor: colors.surface }]}>
        <View style={styles.cardInfo}>
          <Avatar uri={u.profilePic} name={u.fullName} size={42} isOnline={isOnline} />
          <View style={styles.cardTexts}>
            <Text style={[styles.cardTitle, { color: colors.textHeader }]} numberOfLines={1}>
              {u.fullName}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {u.email}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => openChatWithUser(u)}
          >
            <Ionicons name="chatbubble-ellipses" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "rgba(242, 63, 67, 0.15)" }]}
            onPress={() => handleUnfriend(u._id, u.fullName)}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Dynamic Filter Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "all" && styles.tabItemActive, activeTab === "all" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("all")}
        >
          <Text style={[styles.tabText, { color: activeTab === "all" ? colors.primary : colors.textMuted }]}>
            Bạn bè ({friends?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "requests" && styles.tabItemActive, activeTab === "requests" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("requests")}
        >
          <View style={styles.tabWithBadge}>
            <Text style={[styles.tabText, { color: activeTab === "requests" ? colors.primary : colors.textMuted }]}>
              Lời mời
            </Text>
            {requestCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <Text style={styles.badgeText}>{requestCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "add" && styles.tabItemActive, activeTab === "add" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("add")}
        >
          <View style={styles.tabWithIcon}>
            <Ionicons name="person-add" size={14} color={activeTab === "add" ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === "add" ? colors.primary : colors.textMuted }]}>
              Thêm bạn
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {isFriendsLoading && (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {activeTab === "all" && (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.otherUserId}
            renderItem={renderFriendItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Chưa có bạn bè nào</Text>
              </View>
            }
          />
        )}

        {activeTab === "requests" && (
          <ScrollView contentContainerStyle={styles.listContent}>
            {/* Incoming requests */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Lời mời đã nhận ({(incomingFriendRequests || []).length})
            </Text>
            {(incomingFriendRequests || []).map((r) => {
              const u = (users || []).find((x) => String(x._id) === String(r.otherUserId));
              if (!u) return null;
              return (
                <View key={`in-${r.otherUserId}`} style={[styles.requestCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.cardInfo}>
                    <Avatar uri={u.profilePic} name={u.fullName} size={38} />
                    <View style={styles.cardTexts}>
                      <Text style={[styles.cardTitle, { color: colors.textHeader }]} numberOfLines={1}>
                        {u.fullName}
                      </Text>
                      <Text style={[styles.cardSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                        {u.email}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.circleBtn, { backgroundColor: colors.success }]}
                      onPress={() => handleAccept(u._id, u.fullName)}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.circleBtn, { backgroundColor: "rgba(242, 63, 67, 0.15)" }]}
                      onPress={() => handleDeleteRequest(u._id, true)}
                    >
                      <Ionicons name="close" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            {(!incomingFriendRequests || incomingFriendRequests.length === 0) && (
              <Text style={[styles.noRequestText, { color: colors.textMuted }]}>Không có lời mời mới</Text>
            )}

            {/* Outgoing requests */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: Spacing.lg }]}>
              Lời mời đã gửi ({(outgoingFriendRequests || []).length})
            </Text>
            {(outgoingFriendRequests || []).map((r) => {
              const u = (users || []).find((x) => String(x._id) === String(r.otherUserId));
              if (!u) return null;
              return (
                <View key={`out-${r.otherUserId}`} style={[styles.requestCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.cardInfo}>
                    <Avatar uri={u.profilePic} name={u.fullName} size={38} />
                    <View style={styles.cardTexts}>
                      <Text style={[styles.cardTitle, { color: colors.textHeader }]} numberOfLines={1}>
                        {u.fullName}
                      </Text>
                      <Text style={[styles.cardSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                        {u.email}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.surfaceHover }]}
                      onPress={() => handleDeleteRequest(u._id, false)}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.textHeader }]}>Hủy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            {(!outgoingFriendRequests || outgoingFriendRequests.length === 0) && (
              <Text style={[styles.noRequestText, { color: colors.textMuted }]}>Không có lời mời đang chờ</Text>
            )}
          </ScrollView>
        )}

        {activeTab === "add" && (
          <ScrollView contentContainerStyle={styles.addTabContent}>
            <View style={[styles.addCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.addCardTitle, { color: colors.textHeader }]}>
                Kết bạn qua Email
              </Text>
              <Text style={[styles.addCardDesc, { color: colors.textMuted }]}>
                Nhập email của người dùng RushCord để gửi yêu cầu kết bạn nhanh.
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  placeholder="friend@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={emailInput}
                  onChangeText={setEmailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary }, (!emailInput.trim() || isSubmitting) && styles.submitBtnDisabled]}
                  onPress={() => handleSendRequest()}
                  disabled={!emailInput.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Suggestions list */}
            {addableUsers.length > 0 && (
              <View style={{ marginTop: Spacing.lg }}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: Spacing.sm }]}>
                  Gợi ý kết bạn ({addableUsers.length})
                </Text>
                {addableUsers.slice(0, 10).map((u) => (
                  <View key={u._id} style={[styles.requestCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.cardInfo}>
                      <Avatar uri={u.profilePic} name={u.fullName} size={38} />
                      <View style={styles.cardTexts}>
                        <Text style={[styles.cardTitle, { color: colors.textHeader }]} numberOfLines={1}>
                          {u.fullName}
                        </Text>
                        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                          {u.email}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.circleBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleSendRequest(u)}
                    >
                      <Ionicons name="person-add" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    height: 48,
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {},
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  tabWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tabWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  loader: {
    padding: Spacing.sm,
    alignItems: "center",
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  emptyContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: "500",
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
  },
  cardTexts: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: FontSize.xs,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.sm,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: FontSize.sm - 1,
    fontWeight: "700",
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  noRequestText: {
    fontSize: FontSize.sm,
    fontStyle: "italic",
    paddingVertical: Spacing.sm,
  },
  addTabContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  addCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  addCardTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  addCardDesc: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
  },
  submitBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
});
