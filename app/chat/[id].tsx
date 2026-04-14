import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import type { Message } from "@/types/message";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bottom } = useSafeAreaInsets();
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const {
    messages,
    isMessagesLoading,
    getMessages,
    sendMessage,
    recallMessage,
    subscribeToMessages,
    unsubscribeFromMessages,
    selectedUser,
    users,
    setSelectedUser,
  } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();

  // Restore selectedUser if navigated directly
  useEffect(() => {
    if (!selectedUser && id) {
      const user = users.find((u) => u._id === id);
      if (user) setSelectedUser(user);
    }
  }, [id, users]);

  useEffect(() => {
    if (id) {
      getMessages(id);
      subscribeToMessages();
    }
    return () => unsubscribeFromMessages();
  }, [id]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    await sendMessage({ text: trimmed });
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await sendMessage({ image: base64Image });
    }
  };

  const handleLongPress = (message: Message) => {
    if (message.senderId !== authUser?._id || message.isRecalled) return;
    Alert.alert(
      "Thu hồi tin nhắn",
      "Bạn có muốn xóa tin nhắn này không?",
      [
        { text: "Không", style: "cancel" },
        {
          text: "Có",
          style: "destructive",
          onPress: () => recallMessage(message._id),
        },
      ],
      { cancelable: true }
    );
  };

  const isOnline = selectedUser ? onlineUsers.includes(selectedUser._id) : false;

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === authUser?._id;
    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
        activeOpacity={0.85}
        style={[styles.messageRow, isMine && styles.messageRowMine]}
      >
        {!isMine && (
          <Avatar uri={selectedUser?.profilePic} name={selectedUser?.fullName} size={32} />
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          {item.isRecalled ? (
            <Text style={styles.recalledText}>Message recalled</Text>
          ) : (
            <>
              {item.text && <Text style={styles.messageText}>{item.text}</Text>}
              {item.image && (
                <Image source={{ uri: item.image }} style={styles.messageImage} resizeMode="cover" />
              )}
            </>
          )}
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: selectedUser?.fullName ?? "Chat",
          headerRight: () => (
            <View style={styles.headerRight}>
              <View
                style={[
                  styles.headerDot,
                  { backgroundColor: isOnline ? Colors.online : Colors.offline },
                ]}
              />
              <Text style={styles.headerStatus}>{isOnline ? "Online" : "Offline"}</Text>
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {isMessagesLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(bottom, Spacing.sm) }]}>
          <TouchableOpacity onPress={handlePickImage} style={styles.iconBtn}>
            <Ionicons name="image-outline" size={24} color={Colors.textMuted} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />

          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={20} color={Colors.textHeader} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
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
  },
  messageList: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  messageRowMine: {
    flexDirection: "row-reverse",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm + 2,
    gap: 4,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: BorderRadius.sm,
  },
  bubbleOther: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  messageText: {
    color: Colors.textHeader,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.md,
  },
  messageTime: {
    color: "rgba(255,255,255,0.55)",
    fontSize: FontSize.xs,
    alignSelf: "flex-end",
  },
  recalledText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontStyle: "italic",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    gap: Spacing.sm,
  },
  iconBtn: {
    padding: Spacing.xs,
    marginBottom: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: FontSize.md,
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surface,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: Spacing.sm,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerStatus: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
});
