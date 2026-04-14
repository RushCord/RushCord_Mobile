export type UserStatus = "online" | "idle" | "dnd" | "offline";

export interface Activity {
  userId: string;
  status: UserStatus;
  lastSeen?: string;
}
