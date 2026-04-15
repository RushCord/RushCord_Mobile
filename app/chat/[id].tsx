import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ResizeMode, Video } from "expo-av";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import type { Message } from "@/types/message";

function isImageLikeUrl(url?: string, contentType?: string) {
  if (!url) return false;
  if (typeof contentType === "string" && contentType.startsWith("image/")) {
    return true;
  }
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)(\?.*)?$/i.test(url);
}

function isVideoLikeUrl(url?: string, contentType?: string) {
  if (!url) return false;
  if (typeof contentType === "string" && contentType.startsWith("video/")) {
    return true;
  }
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}

function getDocumentKind(fileUrl?: string, fileName?: string, contentType?: string) {
  const ct = String(contentType || "").toLowerCase();
  const name = String(fileName || fileUrl || "").toLowerCase();

  if (ct === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (ct === "application/msword" || name.endsWith(".doc")) return "doc";
  if (
    ct === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "docx";
  }
  return null;
}

function buildDocumentPreviewUrl(fileUrl: string, kind: "pdf" | "doc" | "docx") {
  if (kind === "pdf") {
    return fileUrl;
  }
  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(fileUrl)}`;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bottom } = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const lastPreviewTapRef = useRef<{ messageId: string; ts: number } | null>(null);

  const {
    messages,
    isMessagesLoading,
    getMessages,
    sendMessage,
    recallMessage,
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
  }, [id, selectedUser, setSelectedUser, users]);

  useEffect(() => {
    if (id) {
      getMessages(id);
    }
  }, [getMessages, id]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      const nextHeight = Math.max(0, event.endCoordinates?.height ?? 0);
      setKeyboardHeight(nextHeight);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    await sendMessage({ text: trimmed });
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: false,
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      await sendMessage({ file: result.assets[0] });
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

  const handleFilePress = async (message: Message) => {
    if (!message.file) return;

    const kind = getDocumentKind(message.file, message.fileName, message.contentType);
    if (!kind) return;

    const now = Date.now();
    const lastTap = lastPreviewTapRef.current;
    if (
      !lastTap ||
      lastTap.messageId !== message._id ||
      now - lastTap.ts > 320
    ) {
      lastPreviewTapRef.current = { messageId: message._id, ts: now };
      return;
    }

    lastPreviewTapRef.current = null;

    const previewUrl = buildDocumentPreviewUrl(message.file, kind);

    try {
      await WebBrowser.openBrowserAsync(previewUrl);
    } catch {
      await WebBrowser.openBrowserAsync(message.file);
    }
  };

  const keyboardOffset =
    Platform.OS === "android"
      ? Math.max(0, keyboardHeight - bottom)
      : 0;

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
          ) : item.isDeletedForMe ? (
            <Text style={styles.recalledText}>Message removed for you</Text>
          ) : (
            <>
              {item.text && <Text style={styles.messageText}>{item.text}</Text>}
              {item.image && (
                <Image
                  source={{ uri: item.image }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              )}
              {Array.isArray(item.images) &&
                item.images.map((imageUrl) => (
                  <Image
                    key={imageUrl}
                    source={{ uri: imageUrl }}
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                ))}
              {item.file &&
                (isImageLikeUrl(item.file, item.contentType) ? (
                  <Image source={{ uri: item.file }} style={styles.messageImage} resizeMode="cover" />
                ) : isVideoLikeUrl(item.file, item.contentType) ? (
                  <Video
                    source={{ uri: item.file }}
                    style={styles.messageVideo}
                    useNativeControls
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isLooping={false}
                  />
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleFilePress(item)}
                    style={styles.fileCard}
                  >
                    <Ionicons name="document-outline" size={18} color={Colors.textHeader} />
                    <View style={styles.fileMeta}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {item.fileName || "Attachment"}
                      </Text>
                      {getDocumentKind(item.file, item.fileName, item.contentType) && (
                        <Text style={styles.fileHint}>Double tap to preview</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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

        <SafeAreaView
          edges={["bottom"]}
          style={[
            styles.inputSafeArea,
            Platform.OS === "android" ? { marginBottom: keyboardOffset } : null,
          ]}
        >
          <View style={styles.inputBar}>
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
        </SafeAreaView>
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
  messageVideo: {
    width: 240,
    height: 320,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
  },
  messageTime: {
    color: "rgba(255,255,255,0.55)",
    fontSize: FontSize.xs,
    alignSelf: "flex-end",
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  fileName: {
    color: Colors.textHeader,
    fontSize: FontSize.sm,
    flexShrink: 1,
  },
  fileMeta: {
    flex: 1,
    gap: 2,
  },
  fileHint: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  recalledText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontStyle: "italic",
  },
  inputSafeArea: {
    backgroundColor: Colors.backgroundSecondary,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.sm,
    paddingBottom: Spacing.sm,
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
