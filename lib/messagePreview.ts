import type { Message } from "@/types/message";

export function getMessagePreview(message: Message | null | undefined) {
  if (!message) return "No messages yet";
  if (message.isRecalled) return "Message recalled";
  if (message.isDeletedForMe) return "Message removed for you";

  const text = String(message.text || "").trim();
  if (text) return text;
  if (Array.isArray(message.images) && message.images.length > 0) {
    return message.images.length > 1 ? "Sent images" : "Sent an image";
  }
  if (message.image) return "Sent an image";
  if (typeof message.contentType === "string" && message.contentType.startsWith("video/")) {
    return "Sent a video";
  }
  if (message.fileName) return `Sent ${message.fileName}`;
  if (message.file) return "Sent an attachment";
  return "Sent a new message";
}
