export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  image?: string;
  isRecalled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessagePayload {
  text?: string;
  image?: string;
}
