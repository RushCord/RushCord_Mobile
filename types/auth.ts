export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  profilePic?: string;
  fullName?: string;
}
