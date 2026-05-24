import type { Message } from "@/types/message";
import type { User } from "@/types/user";

export interface RecentConversation {
  conversationId: string;
  user: User;
  lastMessage: Message | null;
  lastMessageAt: string;
  type?: "DM" | "GROUP";
  title?: string;
  avatar?: string;
  cover?: string;
  topic?: string;
  description?: string;
  memberCount?: number;
}

