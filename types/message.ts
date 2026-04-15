import type { UploadableAsset } from "@/services/upload";

export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  image?: string;
  images?: string[];
  file?: string;
  fileName?: string;
  contentType?: string;
  isRecalled?: boolean;
  isDeletedForMe?: boolean;
  isForwarded?: boolean;
  createdAt: string;
}

export interface SendMessagePayload {
  text?: string;
  file?: UploadableAsset | null;
  files?: UploadableAsset[] | null;
}
