import React, { useEffect, useMemo, useRef, useState } from "react";
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
  useWindowDimensions,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Audio, ResizeMode, Video } from "expo-av";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import EmojiPicker, { type EmojiType } from "rn-emoji-keyboard";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/store/themeStore";
import { getSocket } from "@/services/socket";
import { Avatar } from "@/components/ui/Avatar";
import { Spacing, FontSize, BorderRadius } from "@/constants/theme";
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

function isAudioLikeUrl(url?: string, contentType?: string) {
  if (!url) return false;
  if (typeof contentType === "string" && contentType.startsWith("audio/")) {
    return true;
  }
  return /\.(m4a|mp3|wav|aac|ogg)(\?.*)?$/i.test(url);
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

function getFileNameFallback(fileUrl?: string) {
  if (!fileUrl) return "Attachment";
  try {
    const withoutQuery = fileUrl.split("?")[0] ?? fileUrl;
    const last = withoutQuery.split("/").pop() ?? "";
    const decoded = decodeURIComponent(last);
    return decoded || "Attachment";
  } catch {
    const withoutQuery = fileUrl.split("?")[0] ?? fileUrl;
    const last = withoutQuery.split("/").pop() ?? "";
    return last || "Attachment";
  }
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [text, setText] = useState("");
  const [reactingTo, setReactingTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [historyMsg, setHistoryMsg] = useState<Message | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [forwardQuery, setForwardQuery] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordStartedAtRef = useRef<number>(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isSoundBusy, setIsSoundBusy] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const lastPreviewTapRef = useRef<{ messageId: string; ts: number } | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);
  const lastTypingSentAtRef = useRef(0);

  const {
    messages,
    isMessagesLoading,
    getMessages,
    getUsers,
    sendMessage,
    recallMessage,
    recallMessageMe,
    reactToMessage,
    editMessageText,
    forwardMessage,
    isTyping,
    typingUserName,
    selectedUser,
    users,
    setSelectedUser,
    selectedConversation,
    setSelectedConversation,
    selectedChannel,
    recentConversations,
  } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();

  // Restore selectedUser if navigated directly
  useEffect(() => {
    if (!selectedUser && id && !id.startsWith("GROUP#")) {
      const user = users.find((u) => u._id === id);
      if (user) setSelectedUser(user);
    }
  }, [id, selectedUser, setSelectedUser, users]);

  // Restore selectedConversation if navigated directly
  useEffect(() => {
    if (id && id.startsWith("GROUP#")) {
      const group = recentConversations.find((c) => c.conversationId === id);
      if (group && (!selectedConversation || selectedConversation.conversationId !== id)) {
        setSelectedConversation(group);
      }
    }
  }, [id, recentConversations, selectedConversation, setSelectedConversation]);

  useEffect(() => {
    if (id) {
      if (id.startsWith("GROUP#")) {
        if (selectedConversation && selectedConversation.conversationId === id) {
          getMessages(id);
        }
      } else {
        if (selectedUser && selectedUser._id === id) {
          getMessages(id);
        }
      }
    }
  }, [getMessages, id, selectedConversation?.conversationId, selectedUser?._id, selectedChannel?.channelId]);

  const emitTyping = (nextIsTyping: boolean) => {
    const to = selectedUser?._id;
    const socket = getSocket();
    if (!socket || !to) return;
    if (nextIsTyping) socket.emit("typing", { to });
    else socket.emit("stopTyping", { to });
  };

  const mediaLayout = useMemo(() => {
    const bubbleMaxWidth = Math.min(screenWidth * 0.72, 320);
    const mediaWidth = Math.min(bubbleMaxWidth, 280);
    return {
      bubbleMaxWidth,
      mediaWidth,
      imageHeight: mediaWidth,
      videoHeight: Math.min(mediaWidth * (16 / 9), 360),
    };
  }, [screenWidth]);

  const forwardCandidates = useMemo(() => {
    const q = forwardQuery.trim().toLowerCase();
    const seen = new Set<string>();
    const out = [];
    for (const u of users || []) {
      const id = u?._id ? String(u._id) : "";
      if (!id) continue;
      if (id === String(authUser?._id || "")) continue;
      if (seen.has(id)) continue;
      if (q) {
        const name = String(u.fullName || "").toLowerCase();
        if (!name.includes(q)) continue;
      }
      seen.add(id);
      out.push(u);
      if (out.length >= 50) break;
    }
    return out;
  }, [authUser?._id, forwardQuery, users]);

  useEffect(() => {
    // reset typing state when switching conversations
    typingActiveRef.current = false;
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
  }, [selectedUser?._id]);

  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      if (typingActiveRef.current) emitTyping(false);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
        setPlayingId(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    if (typingActiveRef.current) {
      emitTyping(false);
      typingActiveRef.current = false;
    }
    await sendMessage({ text: trimmed });
  };

  const onPickEmoji = (e: EmojiType) => {
    setText((prev) => `${prev}${e.emoji}`);
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

  const startRecording = async () => {
    if (isRecording) return;
    try {
      setIsSoundBusy(true);
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
        setPlayingId(null);
      }

      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Quyền truy cập", "Bạn cần cấp quyền micro để ghi âm.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const recording = new Audio.Recording();
      recordingRef.current = recording;
      recordStartedAtRef.current = Date.now();
      setIsRecording(true);

      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
    } catch (e: any) {
      console.error("startRecording error:", e?.message || e);
      setIsRecording(false);
      recordingRef.current = null;
      Alert.alert("Ghi âm", "Không thể bắt đầu ghi âm.");
    } finally {
      setIsSoundBusy(false);
    }
  };

  const stopRecordingAndSend = async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;
    setIsRecording(false);

    try {
      setIsSoundBusy(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const durationMs = Date.now() - (recordStartedAtRef.current || Date.now());

      if (!uri) return;
      if (durationMs < 600) {
        return;
      }

      const fileName = `voice-${Date.now()}.m4a`;
      await sendMessage({
        file: {
          uri,
          fileName,
          mimeType: "audio/mp4",
          fileSize: undefined,
        },
      });
    } catch (e: any) {
      console.error("stopRecording error:", e?.message || e);
      Alert.alert("Gửi voice", "Không thể gửi ghi âm.");
    } finally {
      setIsSoundBusy(false);
    }
  };

  const togglePlayAudio = async (messageId: string, uri: string) => {
    if (isSoundBusy) return;
    try {
      setIsSoundBusy(true);
      if (playingId === messageId && soundRef.current) {
        await soundRef.current.pauseAsync();
        setPlayingId(null);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      setPlayingId(messageId);

      sound.setOnPlaybackStatusUpdate((st) => {
        if (!st.isLoaded) return;
        if (st.didJustFinish) {
          setPlayingId(null);
        }
      });
    } catch (e: any) {
      console.error("togglePlayAudio error:", e?.message || e);
      setPlayingId(null);
      Alert.alert("Voice", "Không thể phát ghi âm.");
    } finally {
      setIsSoundBusy(false);
    }
  };

  const handleLongPress = (message: Message) => {
    if (message.isRecalled || message.isDeletedForMe) return;
    setReactingTo(message);
  };

  const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

  const submitReaction = async (emoji: string) => {
    const msg = reactingTo;
    if (!msg) return;
    setReactingTo(null);
    await reactToMessage(msg._id, emoji);
  };

  const openEdit = (message: Message) => {
    setEditingMsg(message);
    setEditDraft(String(message.text || ""));
  };

  const submitEdit = async () => {
    const msg = editingMsg;
    if (!msg) return;
    const next = editDraft.trim();
    setEditingMsg(null);
    if (!next || next === String(msg.text || "").trim()) return;
    await editMessageText(msg._id, next);
  };

  const openRecallConfirm = (message: Message) => {
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
      { cancelable: true },
    );
  };

  const openRecallMeConfirm = (message: Message) => {
    Alert.alert(
      "Ẩn tin nhắn",
      "Ẩn tin nhắn này chỉ ở phía bạn?",
      [
        { text: "Không", style: "cancel" },
        {
          text: "Ẩn",
          style: "destructive",
          onPress: () => recallMessageMe(message._id),
        },
      ],
      { cancelable: true },
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

  const openForwardPicker = async (message: Message) => {
    setForwardQuery("");
    setForwardingMsg(message);
    if (!users || users.length === 0) {
      await getUsers();
    }
  };

  const submitForward = async (receiverId: string) => {
    const msg = forwardingMsg;
    if (!msg) return;
    setForwardingMsg(null);
    try {
      await forwardMessage(msg._id, receiverId);
      Alert.alert("Đã chuyển tiếp", "Tin nhắn đã được chuyển tiếp.");
    } catch {
      // store already logs
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === authUser?._id;
    const reactions = item.reactionCounts || {};
    const reactionEntries = Object.entries(reactions).filter(([, c]) => Number(c) > 0);

    const sender = users.find((u) => u._id === item.senderId);
    const senderName = sender?.fullName || "User";
    const senderPic = sender?.profilePic || "";

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
        activeOpacity={0.85}
        style={[styles.messageRow, isMine && styles.messageRowMine]}
      >
        {!isMine && (
          <Avatar uri={selectedConversation?.type === "GROUP" ? senderPic : selectedUser?.profilePic} name={selectedConversation?.type === "GROUP" ? senderName : selectedUser?.fullName} size={32} />
        )}
        <View style={[styles.messageContent, isMine ? styles.messageContentMine : styles.messageContentOther]}>
          {!isMine && selectedConversation?.type === "GROUP" && (
            <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2, marginLeft: 4, fontWeight: "600" }}>
              {senderName}
            </Text>
          )}
          <View
            style={[
              styles.bubble,
              { maxWidth: mediaLayout.bubbleMaxWidth },
              isMine ? styles.bubbleMine : styles.bubbleOther,
            ]}
          >
            {item.isRecalled ? (
              <Text style={styles.recalledText}>Tin nhắn đã bị thu hồi</Text>
            ) : item.isDeletedForMe ? (
              <Text style={styles.recalledText}>Tin nhắn đã bị ẩn ở phía bạn</Text>
            ) : (
              <>
                {item.text && <Text style={styles.messageText}>{item.text}</Text>}
                {item.image && (
                  <Image
                    source={{ uri: item.image }}
                    style={[
                      styles.messageImage,
                      { width: mediaLayout.mediaWidth, height: mediaLayout.imageHeight },
                    ]}
                    resizeMode="cover"
                  />
                )}
                {Array.isArray(item.images) &&
                  item.images.map((imageUrl) => (
                    <Image
                      key={imageUrl}
                      source={{ uri: imageUrl }}
                      style={[
                        styles.messageImage,
                        { width: mediaLayout.mediaWidth, height: mediaLayout.imageHeight },
                      ]}
                      resizeMode="cover"
                    />
                  ))}
                {item.file &&
                  (isImageLikeUrl(item.file, item.contentType) ? (
                    <Image
                      source={{ uri: item.file }}
                      style={[
                        styles.messageImage,
                        { width: mediaLayout.mediaWidth, height: mediaLayout.imageHeight },
                      ]}
                      resizeMode="cover"
                    />
                  ) : isVideoLikeUrl(item.file, item.contentType) ? (
                    <Video
                      source={{ uri: item.file }}
                      style={[
                        styles.messageVideo,
                        { width: mediaLayout.mediaWidth, height: mediaLayout.videoHeight },
                      ]}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay={false}
                      isLooping={false}
                    />
                  ) : isAudioLikeUrl(item.file, item.contentType) ? (
                    <Pressable
                      onPress={() => togglePlayAudio(item._id, item.file!)}
                      style={[styles.voiceCard, { width: mediaLayout.mediaWidth }]}
                    >
                      <View style={styles.voiceIcon}>
                        <Ionicons
                           name={playingId === item._id ? "pause" : "play"}
                           size={20}
                           color={colors.textHeader}
                        />
                      </View>
                      <View style={styles.voiceMeta}>
                        <Text style={styles.voiceTitle} numberOfLines={1}>
                          Tin nhắn thoại
                        </Text>
                        <Text style={styles.voiceHint}>
                          {playingId === item._id ? "Đang phát..." : "Nhấn để phát"}
                        </Text>
                      </View>
                      <Ionicons name="mic-outline" size={18} color={colors.textMuted} />
                    </Pressable>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleFilePress(item)}
                      style={[styles.fileCard, { width: mediaLayout.mediaWidth }]}
                    >
                      <Ionicons name="document-outline" size={22} color={colors.textHeader} />
                      <View style={styles.fileMeta}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {item.fileName || getFileNameFallback(item.file)}
                        </Text>
                        {getDocumentKind(item.file, item.fileName, item.contentType) && (
                          <Text style={styles.fileHint}>Nhấn đúp để xem trước</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
              </>
            )}
            <View style={styles.metaRow}>
              {item.isEdited ? (
                <Pressable
                  onPress={() => setHistoryMsg(item)}
                  hitSlop={8}
                  style={styles.editedBadge}
                >
                  <Text style={styles.editedText}>đã sửa</Text>
                </Pressable>
              ) : null}
              <Text style={styles.messageTime}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>

          {reactionEntries.length > 0 ? (
            <View style={[styles.reactionRow, { maxWidth: mediaLayout.bubbleMaxWidth }]}>
              {reactionEntries
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .slice(0, 6)
                .map(([emoji, count]) => (
                  <View key={emoji} style={styles.reactionPill}>
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    <Text style={styles.reactionCount}>{count}</Text>
                  </View>
                ))}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: selectedConversation?.type === "GROUP"
            ? `# ${selectedChannel?.name || "chat"}`
            : (selectedUser?.fullName ?? "Chat"),
          headerStyle: { backgroundColor: colors.backgroundSecondary },
          headerTintColor: colors.textHeader,
          headerRight: () => selectedConversation?.type === "GROUP" ? null : (
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => {
                  if (!id) return;
                  router.push(`/call?to=${encodeURIComponent(String(id))}`);
                }}
                hitSlop={10}
                style={styles.headerIconBtn}
              >
                <Ionicons name="videocam" size={20} color={colors.textHeader} />
              </Pressable>
              <View
                style={[
                  styles.headerDot,
                  { backgroundColor: isOnline ? colors.online : colors.offline },
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
        <EmojiPicker
          open={emojiOpen}
          onClose={() => setEmojiOpen(false)}
          onEmojiSelected={(e) => {
            onPickEmoji(e);
            setEmojiOpen(false);
          }}
        />
        
        {/* Reaction Modal */}
        <Modal
          visible={!!reactingTo}
          transparent
          animationType="fade"
          onRequestClose={() => setReactingTo(null)}
        >
          <Pressable style={styles.reactionBackdrop} onPress={() => setReactingTo(null)}>
            <Pressable style={styles.reactionSheet} onPress={() => {}}>
              <Text style={styles.reactionTitle}>Bày tỏ cảm xúc</Text>
              <View style={styles.reactionQuickRow}>
                {QUICK_REACTIONS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => submitReaction(emoji)}
                    style={styles.reactionBtn}
                  >
                    <Text style={styles.reactionBtnText}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>

              {reactingTo?.senderId === authUser?._id &&
              !!reactingTo?.text &&
              !reactingTo?.isRecalled &&
              !reactingTo?.isDeletedForMe ? (
                <Pressable
                  onPress={() => {
                    const msg = reactingTo;
                    setReactingTo(null);
                    if (msg) openEdit(msg);
                  }}
                  style={styles.reactionActionBtn}
                >
                  <Ionicons name="create-outline" size={18} color={colors.textHeader} />
                  <Text style={styles.reactionActionText}>Sửa tin nhắn</Text>
                </Pressable>
              ) : null}

              {reactingTo?.isEdited && Array.isArray(reactingTo?.editHistory) && reactingTo.editHistory.length > 0 ? (
                <Pressable
                  onPress={() => {
                    const msg = reactingTo;
                    setReactingTo(null);
                    if (msg) setHistoryMsg(msg);
                  }}
                  style={styles.reactionActionBtn}
                >
                  <Ionicons name="time-outline" size={18} color={colors.textHeader} />
                  <Text style={styles.reactionActionText}>Lịch sử sửa</Text>
                </Pressable>
              ) : null}

              {reactingTo?.senderId === authUser?._id ? (
                <Pressable
                  onPress={() => {
                    const msg = reactingTo;
                    setReactingTo(null);
                    if (msg) openRecallConfirm(msg);
                  }}
                  style={styles.reactionDangerBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textHeader} />
                  <Text style={styles.reactionDangerText}>Thu hồi cho mọi người</Text>
                </Pressable>
              ) : null}

              {!reactingTo?.isRecalled && !reactingTo?.isDeletedForMe ? (
                <Pressable
                  onPress={() => {
                    const msg = reactingTo;
                    setReactingTo(null);
                    if (msg) openRecallMeConfirm(msg);
                  }}
                  style={styles.reactionDangerBtn}
                >
                  <Ionicons name="eye-off-outline" size={18} color={colors.textHeader} />
                  <Text style={styles.reactionDangerText}>Ẩn phía tôi</Text>
                </Pressable>
              ) : null}

              {!reactingTo?.isRecalled && !reactingTo?.isDeletedForMe ? (
                <Pressable
                  onPress={() => {
                    const msg = reactingTo;
                    setReactingTo(null);
                    if (msg) void openForwardPicker(msg);
                  }}
                  style={styles.reactionActionBtn}
                >
                  <Ionicons name="arrow-redo-outline" size={18} color={colors.textHeader} />
                  <Text style={styles.reactionActionText}>Chuyển tiếp</Text>
                </Pressable>
              ) : null}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reactionMoreRow}>
                {["😀","😁","😂","🤣","😊","😍","😘","😎","🥳","🤔","😴","😭","😤","😱","🙏","🔥","💯","🎉","👏","🤝","✅","❌"].map((e) => (
                  <Pressable key={e} onPress={() => submitReaction(e)} style={styles.reactionMoreBtn}>
                    <Text style={styles.reactionMoreText}>{e}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Forward Picker Modal */}
        <Modal
          visible={!!forwardingMsg}
          transparent
          animationType="fade"
          onRequestClose={() => setForwardingMsg(null)}
        >
          <Pressable style={styles.reactionBackdrop} onPress={() => setForwardingMsg(null)}>
            <Pressable style={styles.forwardSheet} onPress={() => {}}>
              <View style={styles.historyHeader}>
                <Text style={styles.reactionTitle}>Chuyển tiếp đến</Text>
                <Pressable onPress={() => setForwardingMsg(null)} hitSlop={10}>
                  <Ionicons name="close" size={20} color={colors.textHeader} />
                </Pressable>
              </View>

              <TextInput
                value={forwardQuery}
                onChangeText={setForwardQuery}
                placeholder="Tìm người nhận..."
                placeholderTextColor={colors.textMuted}
                style={styles.forwardSearch}
              />

              <ScrollView style={styles.forwardList}>
                {forwardCandidates.map((u) => (
                  <Pressable
                    key={u._id}
                    onPress={() => submitForward(u._id)}
                    style={styles.forwardUserRow}
                  >
                    <Avatar uri={u.profilePic} name={u.fullName} size={36} />
                    <View style={styles.forwardUserMeta}>
                      <Text style={styles.forwardUserName} numberOfLines={1}>
                        {u.fullName || "User"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Edit Message Modal */}
        <Modal
          visible={!!editingMsg}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingMsg(null)}
        >
          <Pressable style={styles.reactionBackdrop} onPress={() => setEditingMsg(null)}>
            <Pressable style={styles.editSheet} onPress={() => {}}>
              <Text style={styles.reactionTitle}>Sửa tin nhắn</Text>
              <TextInput
                value={editDraft}
                onChangeText={setEditDraft}
                placeholder="Nhập nội dung..."
                placeholderTextColor={colors.textMuted}
                style={styles.editInput}
                multiline
                maxLength={2000}
                autoFocus
              />
              <View style={styles.editActions}>
                <Pressable onPress={() => setEditingMsg(null)} style={styles.editCancelBtn}>
                  <Text style={styles.editCancelText}>Hủy</Text>
                </Pressable>
                <Pressable onPress={submitEdit} style={styles.editSaveBtn}>
                  <Text style={styles.editSaveText}>Lưu</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* History Modal */}
        <Modal
          visible={!!historyMsg}
          transparent
          animationType="fade"
          onRequestClose={() => setHistoryMsg(null)}
        >
          <Pressable style={styles.reactionBackdrop} onPress={() => setHistoryMsg(null)}>
            <Pressable style={styles.historySheet} onPress={() => {}}>
              <View style={styles.historyHeader}>
                <Text style={styles.reactionTitle}>Lịch sử sửa tin nhắn</Text>
                <Pressable onPress={() => setHistoryMsg(null)} hitSlop={10}>
                  <Ionicons name="close" size={20} color={colors.textHeader} />
                </Pressable>
              </View>
              <ScrollView style={styles.historyList}>
                {(historyMsg?.editHistory || []).slice().reverse().map((h, idx) => (
                  <View key={`${h.editedAt}-${idx}`} style={styles.historyItem}>
                    <Text style={styles.historyTime}>
                      {new Date(h.editedAt).toLocaleString()}
                    </Text>
                    <Text style={styles.historyLabel}>Trước:</Text>
                    <Text style={styles.historyText}>{h.prevText}</Text>
                    <Text style={styles.historyLabel}>Sau:</Text>
                    <Text style={styles.historyText}>{h.nextText}</Text>
                  </View>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {isMessagesLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
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
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        )}

        <SafeAreaView
          edges={["bottom"]}
          style={[styles.inputSafeArea]}
        >
          {isTyping ? (
            <View style={styles.typingBar}>
              <Text style={styles.typingText}>
                {(typingUserName || selectedUser?.fullName || "Ai đó") + " đang nhập..."}
              </Text>
            </View>
          ) : null}
          <View style={styles.inputBar}>
            <TouchableOpacity onPress={handlePickImage} style={styles.iconBtn}>
              <Ionicons name="image-outline" size={24} color={colors.textMuted} />
            </TouchableOpacity>

            <Pressable
              onPress={() => setEmojiOpen(true)}
              disabled={isSoundBusy}
              style={styles.iconBtn}
            >
              <Ionicons name="happy-outline" size={24} color={colors.textMuted} />
            </Pressable>

            <Pressable
              onPressIn={startRecording}
              onPressOut={stopRecordingAndSend}
              disabled={isSoundBusy}
              style={[styles.iconBtn, isRecording ? styles.micBtnRecording : null]}
            >
              <Ionicons
                name={isRecording ? "mic" : "mic-outline"}
                size={24}
                color={isRecording ? "#FFFFFF" : colors.textMuted}
              />
            </Pressable>

            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={(next) => {
                setText(next);

                const trimmed = next.trim();
                const hasText = trimmed.length > 0;

                if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);

                if (!hasText) {
                  if (typingActiveRef.current) {
                    emitTyping(false);
                    typingActiveRef.current = false;
                  }
                  return;
                }

                typingDebounceRef.current = setTimeout(() => {
                  const now = Date.now();
                  if (now - lastTypingSentAtRef.current < 450) return;
                  lastTypingSentAtRef.current = now;
                  emitTyping(true);
                  typingActiveRef.current = true;
                }, 250);
              }}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              returnKeyType="default"
            />

            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
              disabled={!text.trim()}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm + 2,
    gap: 4,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: BorderRadius.sm,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  messageText: {
    color: colors.textHeader,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  messageImage: {
    borderRadius: BorderRadius.md,
    backgroundColor: colors.backgroundTertiary,
  },
  messageVideo: {
    borderRadius: BorderRadius.md,
    backgroundColor: colors.backgroundTertiary,
  },
  messageTime: {
    color: "rgba(255,255,255,0.55)",
    fontSize: FontSize.xs,
    alignSelf: "flex-end",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 2,
  },
  editedBadge: {
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  editedText: {
    color: colors.textHeader,
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  reactionRow: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 6,
    overflow: "hidden",
  },
  messageContent: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  messageContentMine: {
    alignItems: "flex-end",
  },
  messageContentOther: {
    alignItems: "flex-start",
  },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    color: colors.textHeader,
    fontSize: 12,
    fontWeight: "600",
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 56,
    maxWidth: "100%",
  },
  fileName: {
    color: colors.textHeader,
    fontSize: FontSize.md,
    fontWeight: "600",
    flexShrink: 1,
  },
  fileMeta: {
    flex: 1,
    gap: 2,
  },
  fileHint: {
    color: colors.textMuted,
    fontSize: FontSize.sm,
  },
  voiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  voiceIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceMeta: {
    flex: 1,
    gap: 2,
  },
  voiceTitle: {
    color: colors.textHeader,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  voiceHint: {
    color: colors.textMuted,
    fontSize: FontSize.sm,
  },
  recalledText: {
    color: colors.textMuted,
    fontSize: FontSize.sm,
    fontStyle: "italic",
  },
  inputSafeArea: {
    backgroundColor: colors.backgroundSecondary,
  },
  typingBar: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    backgroundColor: colors.backgroundSecondary,
  },
  typingText: {
    color: colors.textMuted,
    fontSize: FontSize.sm,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.sm,
    paddingBottom: Spacing.sm + 4,
    backgroundColor: colors.backgroundSecondary,
    gap: Spacing.sm,
  },
  iconBtn: {
    padding: Spacing.xs,
    marginBottom: 6,
  },
  micBtnRecording: {
    backgroundColor: colors.danger,
    borderRadius: 999,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: colors.text,
    fontSize: FontSize.md,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: Spacing.sm,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    marginRight: 6,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerStatus: {
    color: colors.textMuted,
    fontSize: FontSize.sm,
  },

  reactionBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    padding: Spacing.md,
  },
  reactionSheet: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionTitle: {
    color: colors.textHeader,
    fontSize: FontSize.md,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  reactionQuickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  reactionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionBtnText: {
    fontSize: 22,
  },
  reactionDangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(242, 63, 67, 0.1)",
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
  },
  reactionDangerText: {
    color: colors.danger,
    fontSize: FontSize.md,
    fontWeight: "700",
  },
  reactionActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionActionText: {
    color: colors.textHeader,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  reactionMoreRow: {
    paddingTop: 4,
  },
  reactionMoreBtn: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionMoreText: {
    fontSize: 20,
  },

  editSheet: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editInput: {
    minHeight: 96,
    maxHeight: 180,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: colors.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
  },
  editCancelBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  editCancelText: {
    color: colors.textHeader,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  editSaveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  editSaveText: {
    color: "#FFFFFF",
    fontSize: FontSize.md,
    fontWeight: "700",
  },

  historySheet: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  historyList: {
    marginTop: 4,
  },
  historyItem: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyTime: {
    color: colors.textMuted,
    fontSize: FontSize.sm - 1,
  },
  historyLabel: {
    color: colors.textMuted,
    fontSize: FontSize.sm - 1,
    fontWeight: "600",
  },
  historyText: {
    color: colors.textHeader,
    fontSize: FontSize.md,
    lineHeight: 20,
  },

  forwardSheet: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  forwardSearch: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  forwardList: {
    marginTop: 4,
  },
  forwardUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  forwardUserMeta: {
    flex: 1,
  },
  forwardUserName: {
    color: colors.textHeader,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
});
