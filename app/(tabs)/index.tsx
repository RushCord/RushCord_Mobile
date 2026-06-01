import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getMessagePreview } from "@/lib/messagePreview";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/store/themeStore";
import { Avatar } from "@/components/ui/Avatar";
import { Spacing, FontSize, BorderRadius } from "@/constants/theme";
import type { RecentConversation } from "@/types/conversation";
import type { User } from "@/types/user";

export default function MessagesScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const {
    users,
    recentConversations,
    isUsersLoading,
    isRecentConversationsLoading,
    getUsers,
    getRecentConversations,
    setSelectedUser,
    selectedConversation,
    setSelectedConversation,
    channels,
    selectedChannel,
    setSelectedChannel,
    voiceSession,
    voiceMembersByRoom,
    joinVoiceChannel,
    leaveVoiceChannel,
    voiceMicMuted,
    voiceOutputMuted,
    toggleVoiceMic,
    toggleVoiceOutput,
    incomingFriendRequests,
    getFriendRequests,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [searchText, setSearchText] = useState("");
  const [isTextCollapseOpen, setIsTextCollapseOpen] = useState(true);
  const [isVoiceCollapseOpen, setIsVoiceCollapseOpen] = useState(true);

  useEffect(() => {
    getUsers();
    getRecentConversations();
    getFriendRequests().catch(() => {});
  }, [getRecentConversations, getUsers, getFriendRequests]);

  // Separate Conversations into DMs and GROUP Servers
  const groupServers = useMemo(() => {
    return (recentConversations || []).filter((c) => c?.type === "GROUP");
  }, [recentConversations]);

  const recentDms = useMemo(() => {
    return (recentConversations || [])
      .filter((c) => c?.type === "DM" && c.user && c.user._id)
      .sort((a, b) =>
        String(b.lastMessageAt || "").localeCompare(String(a.lastMessageAt || ""))
      );
  }, [recentConversations]);

  const filteredDms = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return recentDms;
    return recentDms.filter((item) => {
      const name = String(item.user.fullName || "").toLowerCase();
      const preview = item.lastMessage ? getMessagePreview(item.lastMessage).toLowerCase() : "";
      return name.includes(q) || preview.includes(q);
    });
  }, [searchText, recentDms]);

  const handleUserPress = (user: User, conv: RecentConversation) => {
    setSelectedUser(user);
    setSelectedConversation(conv);
    router.push(`/chat/${user._id}`);
  };

  const handleChannelPress = (ch: any) => {
    if (!selectedConversation) return;
    setSelectedChannel(ch);
    router.push(`/chat/${selectedConversation.conversationId}`);
  };

  const activeVoiceChannelName = useMemo(() => {
    if (!voiceSession || !channels.length) return "";
    const ch = channels.find((c) => c.channelId === voiceSession.voiceChannelId);
    return ch?.name || "Kênh thoại";
  }, [voiceSession, channels]);

  if (isUsersLoading || isRecentConversationsLoading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const isHomeSelected = selectedConversation === null;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.mainLayout}>
        {/* ==================================================== */}
        {/* COLUMN 1: LEFT VERTICAL SERVER SIDEBAR (RAIL)        */}
        {/* ==================================================== */}
        <View style={[styles.serverSidebar, { backgroundColor: colors.backgroundSecondary, borderRightColor: colors.border }]}>
          {/* Home / DM Icon */}
          <TouchableOpacity
            style={[
              styles.serverIconBtn,
              isHomeSelected && { backgroundColor: colors.primary, borderRadius: 16 },
            ]}
            onPress={() => setSelectedConversation(null)}
            activeOpacity={0.7}
          >
            {isHomeSelected && <View style={[styles.activeIndicator, { backgroundColor: colors.textHeader }]} />}
            <Ionicons
              name={isHomeSelected ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
              size={24}
              color={isHomeSelected ? "#FFFFFF" : colors.textHeader}
            />
          </TouchableOpacity>

          <View style={[styles.sidebarDivider, { backgroundColor: colors.divider }]} />

          {/* Joined Group Servers */}
          <FlatList
            data={groupServers}
            keyExtractor={(item) => item.conversationId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.serverListContainer}
            renderItem={({ item }) => {
              const isSelected = selectedConversation?.conversationId === item.conversationId;
              const serverInitials = String(item.title || "GP")
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <TouchableOpacity
                  style={[
                    styles.serverIconBtn,
                    isSelected && { backgroundColor: colors.primary, borderRadius: 16 },
                  ]}
                  onPress={() => setSelectedConversation(item)}
                  activeOpacity={0.7}
                >
                  {isSelected && <View style={[styles.activeIndicator, { backgroundColor: colors.textHeader }]} />}
                  {item.avatar ? (
                    <Avatar uri={item.avatar} name={item.title} size={48} />
                  ) : (
                    <View style={styles.serverInitialCircle}>
                      <Text style={[styles.serverInitialText, { color: colors.textHeader }]}>
                        {serverInitials}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={null}
          />

          {/* Add Server Button */}
          <TouchableOpacity
            style={[styles.serverIconBtn, styles.addServerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => {}}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ==================================================== */}
        {/* COLUMN 2: RIGHT CONTENT AREA (DMs / Server Channels) */}
        {/* ==================================================== */}
        <View style={styles.contentArea}>
          {isHomeSelected ? (
            // ==========================================
            // CHẾ ĐỘ HOME: ACTIVE DMs & FRIENDS
            // ==========================================
            <>
              {/* Sleek Search Bar */}
              <View style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="search" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="Tìm cuộc trò chuyện..."
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText("")}>
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Friends Tab Quick Link */}
              <TouchableOpacity
                style={[styles.friendsShortcutRow, { borderBottomColor: colors.border }]}
                onPress={() => router.push("/friends")}
                activeOpacity={0.65}
              >
                <View style={[styles.friendsIconBg, { backgroundColor: colors.primary }]}>
                  <Ionicons name="people" size={20} color="#FFFFFF" />
                </View>
                <Text style={[styles.friendsShortcutText, { color: colors.textHeader }]}>
                  Bạn bè
                </Text>
                {incomingFriendRequests.length > 0 && (
                  <View style={[styles.friendsRequestBadge, { backgroundColor: colors.danger }]}>
                    <Text style={styles.friendsRequestBadgeText}>
                      {incomingFriendRequests.length}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.friendsArrow} />
              </TouchableOpacity>

              {/* Active Conversations list */}
              <FlatList
                data={filteredDms}
                keyExtractor={(item) => item.conversationId}
                ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.divider }]} />}
                renderItem={({ item }) => {
                  const isOnline = onlineUsers.includes(item.user._id);
                  return (
                    <TouchableOpacity
                      style={[styles.userRow, { backgroundColor: colors.background }]}
                      onPress={() => handleUserPress(item.user, item)}
                      activeOpacity={0.65}
                    >
                      <Avatar
                        uri={item.user.profilePic}
                        name={item.user.fullName}
                        size={46}
                        isOnline={isOnline}
                      />
                      <View style={styles.userInfo}>
                        <View style={styles.userTopRow}>
                          <Text style={[styles.userName, { color: colors.textHeader }]} numberOfLines={1}>
                            {item.user.fullName}
                          </Text>
                          {item.lastMessageAt ? (
                            <Text style={[styles.messageTime, { color: colors.textMuted }]}>
                              {new Date(item.lastMessageAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.userBottomRow}>
                          <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={1}>
                            {item.lastMessage
                              ? getMessagePreview(item.lastMessage)
                              : "Chưa có tin nhắn nào"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyCentered}>
                    <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: Spacing.sm }]}>
                      Chưa có cuộc trò chuyện 1-1 gần đây
                    </Text>
                  </View>
                }
              />
            </>
          ) : (
            // ==========================================
            // CHẾ ĐỘ SERVER: HEADER & CHANNELS
            // ==========================================
            <View style={styles.serverChannelLayout}>
              {/* Server Header Card */}
              <View style={[styles.serverHeader, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
                <Text style={[styles.serverTitleText, { color: colors.textHeader }]} numberOfLines={1}>
                  {selectedConversation.title || "Group Server"}
                </Text>
                {!!selectedConversation.topic && (
                  <Text style={[styles.serverTopicText, { color: colors.text }]} numberOfLines={2}>
                    {selectedConversation.topic}
                  </Text>
                )}
                {!!selectedConversation.memberCount && (
                  <Text style={[styles.serverMemberCountText, { color: colors.textMuted }]}>
                    • {selectedConversation.memberCount} Thành viên
                  </Text>
                )}
              </View>

              <ScrollView style={styles.channelsScroll} showsVerticalScrollIndicator={false}>
                {/* 1. TEXT CHANNELS CATEGORY */}
                <View style={styles.categorySection}>
                  <TouchableOpacity
                    style={styles.categoryHeader}
                    activeOpacity={0.7}
                    onPress={() => setIsTextCollapseOpen(!isTextCollapseOpen)}
                  >
                    <Ionicons
                      name={isTextCollapseOpen ? "chevron-down" : "chevron-forward"}
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text style={[styles.categoryTitleText, { color: colors.textMuted }]}>
                      Kênh văn bản
                    </Text>
                  </TouchableOpacity>

                  {isTextCollapseOpen &&
                    channels
                      .filter((ch) => ch.channelType === "INFO" || ch.channelType === "CHAT")
                      .map((ch) => {
                        const isChSelected = selectedChannel?.channelId === ch.channelId;
                        return (
                          <TouchableOpacity
                            key={ch.channelId}
                            style={[
                              styles.channelRow,
                              isChSelected && { backgroundColor: colors.surface },
                            ]}
                            activeOpacity={0.65}
                            onPress={() => handleChannelPress(ch)}
                          >
                            <Text
                              style={{
                                fontSize: 18,
                                fontWeight: "700",
                                color: isChSelected ? colors.primary : colors.textMuted,
                                width: 18,
                                textAlign: "center",
                              }}
                            >
                              #
                            </Text>
                            <Text
                              style={[
                                styles.channelNameText,
                                { color: isChSelected ? colors.textHeader : colors.text },
                                isChSelected && styles.channelSelectedText,
                              ]}
                              numberOfLines={1}
                            >
                              {ch.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                </View>

                {/* 2. VOICE CHANNELS CATEGORY */}
                <View style={styles.categorySection}>
                  <TouchableOpacity
                    style={styles.categoryHeader}
                    activeOpacity={0.7}
                    onPress={() => setIsVoiceCollapseOpen(!isVoiceCollapseOpen)}
                  >
                    <Ionicons
                      name={isVoiceCollapseOpen ? "chevron-down" : "chevron-forward"}
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text style={[styles.categoryTitleText, { color: colors.textMuted }]}>
                      Kênh thoại
                    </Text>
                  </TouchableOpacity>

                  {isVoiceCollapseOpen &&
                    channels
                      .filter((ch) => ch.channelType === "VOICE")
                      .map((ch) => {
                        const isSessionJoined =
                          voiceSession &&
                          voiceSession.conversationId === selectedConversation.conversationId &&
                          voiceSession.voiceChannelId === ch.channelId;

                        const roomKey = `${selectedConversation.conversationId}#VOICE#${ch.channelId}`;
                        const membersInRoom = voiceMembersByRoom[roomKey] || [];

                        return (
                          <View key={ch.channelId} style={styles.voiceChannelGroup}>
                            <TouchableOpacity
                              style={[
                                styles.channelRow,
                                isSessionJoined && { backgroundColor: colors.surface },
                              ]}
                              activeOpacity={0.65}
                              onPress={() =>
                                joinVoiceChannel(selectedConversation.conversationId, ch.channelId)
                              }
                            >
                              <Ionicons
                                name="volume-high"
                                size={18}
                                color={isSessionJoined ? colors.online : colors.textMuted}
                              />
                              <Text
                                style={[
                                  styles.channelNameText,
                                  { color: isSessionJoined ? colors.textHeader : colors.text },
                                  isSessionJoined && styles.channelSelectedText,
                                ]}
                                numberOfLines={1}
                              >
                                {ch.name}
                              </Text>
                              {isSessionJoined && (
                                <Text style={[styles.voiceActiveLabel, { color: colors.online }]}>
                                  Đã kết nối
                                </Text>
                              )}
                            </TouchableOpacity>

                            {/* Active Members Listing */}
                            {membersInRoom.length > 0 && (
                              <View style={[styles.voiceRoomMembersBox, { borderLeftColor: colors.border }]}>
                                {membersInRoom.map((memberId) => {
                                  const memberUser = users.find((u) => String(u._id) === String(memberId));
                                  const memberName =
                                    String(memberId) === String(useAuthStore.getState().authUser?._id)
                                      ? "Bạn"
                                      : memberUser?.fullName || "User";
                                  return (
                                    <View key={memberId} style={styles.voiceMemberRow}>
                                      <Avatar uri={memberUser?.profilePic} name={memberName} size={18} />
                                      <Text style={[styles.voiceMemberNameText, { color: colors.text }]} numberOfLines={1}>
                                        {memberName}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* ==================================================== */}
      {/* BOTTOM FLOATING ACTIVE VOICE STATUS BAR              */}
      {/* ==================================================== */}
      {!!voiceSession && (
        <View style={[styles.bottomVoiceBar, { backgroundColor: colors.online }]}>
          <View style={styles.voiceBarLeft}>
            <Ionicons name="volume-high" size={20} color="#FFFFFF" />
            <View style={styles.voiceBarTextCol}>
              <Text style={styles.voiceBarTitle} numberOfLines={1}>
                Voice Connected
              </Text>
              <Text style={styles.voiceBarSub} numberOfLines={1}>
                {activeVoiceChannelName}
              </Text>
            </View>
          </View>

          <View style={styles.voiceBarRight}>
            {/* Mic Toggle */}
            <TouchableOpacity style={styles.voiceBarBtn} onPress={toggleVoiceMic} activeOpacity={0.7}>
              <Ionicons
                name={voiceMicMuted ? "mic-off" : "mic"}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* Output Toggle */}
            <TouchableOpacity style={styles.voiceBarBtn} onPress={toggleVoiceOutput} activeOpacity={0.7}>
              <Ionicons
                name={voiceOutputMuted ? "volume-mute" : "volume-high"}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* Hangup / Disconnect */}
            <TouchableOpacity
              style={[styles.voiceBarBtn, styles.voiceBarHangupBtn, { backgroundColor: colors.danger }]}
              onPress={leaveVoiceChannel}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyCentered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: Spacing.xl,
    },
    mainLayout: {
      flex: 1,
      flexDirection: "row",
    },
    // ==========================================
    // SERVER SIDEBAR RAIL STYLES
    // ==========================================
    serverSidebar: {
      width: 72,
      alignItems: "center",
      paddingTop: Spacing.sm,
      borderRightWidth: 1,
      gap: Spacing.sm,
    },
    serverListContainer: {
      alignItems: "center",
      gap: Spacing.sm,
      paddingBottom: Spacing.sm,
    },
    serverIconBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
    },
    activeIndicator: {
      position: "absolute",
      left: 0,
      width: 4,
      height: 20,
      borderTopRightRadius: 4,
      borderBottomRightRadius: 4,
    },
    sidebarDivider: {
      width: 32,
      height: 2,
      borderRadius: 1,
    },
    serverInitialCircle: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    serverInitialText: {
      fontSize: FontSize.md,
      fontWeight: "800",
    },
    addServerBtn: {
      borderWidth: 1.5,
      borderStyle: "dashed",
      marginBottom: Spacing.lg,
    },
    // ==========================================
    // CONTENT AREA STYLES
    // ==========================================
    contentArea: {
      flex: 1,
    },
    searchContainer: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      height: 38,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      paddingHorizontal: Spacing.sm,
      gap: Spacing.xs,
    },
    searchInput: {
      flex: 1,
      fontSize: FontSize.sm,
      paddingVertical: 0,
    },
    // Friends Shortcut
    friendsShortcutRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md - 2,
      borderBottomWidth: 1,
    },
    friendsIconBg: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      marginRight: Spacing.md,
    },
    friendsShortcutText: {
      fontSize: FontSize.md,
      fontWeight: "700",
      flex: 1,
    },
    friendsRequestBadge: {
      borderRadius: BorderRadius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: Spacing.sm,
    },
    friendsRequestBadgeText: {
      color: "#FFFFFF",
      fontSize: FontSize.xs,
      fontWeight: "800",
    },
    friendsArrow: {
      opacity: 0.5,
    },
    // DM Chat list user rows
    userRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md - 2,
      gap: Spacing.md,
    },
    userInfo: {
      flex: 1,
      gap: 3,
    },
    userTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
    },
    userBottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
    },
    userName: {
      fontSize: FontSize.md,
      fontWeight: "700",
      flex: 1,
    },
    previewText: {
      fontSize: FontSize.sm,
      opacity: 0.8,
      flex: 1,
    },
    messageTime: {
      fontSize: FontSize.xs,
    },
    separator: {
      height: 1,
      marginLeft: Spacing.md + 46 + Spacing.md,
    },
    emptyText: {
      fontSize: FontSize.sm + 1,
      fontWeight: "500",
    },
    // ==========================================
    // SERVER CHANNELS VIEW STYLES
    // ==========================================
    serverChannelLayout: {
      flex: 1,
    },
    serverHeader: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      gap: 3,
    },
    serverTitleText: {
      fontSize: FontSize.lg,
      fontWeight: "800",
    },
    serverTopicText: {
      fontSize: FontSize.xs + 1,
      lineHeight: 16,
    },
    serverMemberCountText: {
      fontSize: FontSize.xs,
      fontWeight: "600",
    },
    channelsScroll: {
      flex: 1,
      paddingVertical: Spacing.sm,
    },
    categorySection: {
      marginBottom: Spacing.md,
    },
    categoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      gap: Spacing.xs,
    },
    categoryTitleText: {
      fontSize: FontSize.xs,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    channelRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.md + Spacing.sm,
      paddingVertical: Spacing.sm - 2,
      marginHorizontal: Spacing.sm,
      marginVertical: 1,
      borderRadius: BorderRadius.sm,
      gap: Spacing.sm,
    },
    channelNameText: {
      fontSize: FontSize.md - 1,
      fontWeight: "600",
      flex: 1,
    },
    channelSelectedText: {
      fontWeight: "700",
    },
    voiceActiveLabel: {
      fontSize: FontSize.xs,
      fontWeight: "700",
    },
    // Voice channel members tree
    voiceChannelGroup: {
      position: "relative",
    },
    voiceRoomMembersBox: {
      marginLeft: Spacing.md + Spacing.md + 4,
      paddingLeft: Spacing.sm,
      borderLeftWidth: 1.5,
      marginVertical: 2,
      gap: 6,
    },
    voiceMemberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs + 2,
      paddingVertical: 2,
    },
    voiceMemberNameText: {
      fontSize: FontSize.xs + 1,
      fontWeight: "600",
      flex: 1,
    },
    // ==========================================
    // BOTTOM ACTIVE VOICE CONNECTION BAR STYLES
    // ==========================================
    bottomVoiceBar: {
      height: 58,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.md,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 5,
    },
    voiceBarLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      flex: 1,
    },
    voiceBarTextCol: {
      flex: 1,
      gap: 1,
    },
    voiceBarTitle: {
      color: "#FFFFFF",
      fontSize: FontSize.sm,
      fontWeight: "800",
    },
    voiceBarSub: {
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: FontSize.xs,
      fontWeight: "600",
    },
    voiceBarRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    voiceBarBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    voiceBarHangupBtn: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
      elevation: 2,
    },
  });
