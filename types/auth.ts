export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  displayName: string;
  email: string;
  password: string;
}

export interface ConfirmSignupPayload {
  email: string;
  otpCode: string;
}

export interface UpdateProfilePayload {
  profilePic?: string;
}
