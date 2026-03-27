import { IUser } from "./user.types";

export type IUserRegistration = {
  name: string;
  email: string;
  password: string;
};

export type ILoginRequest = {
  email: string;
  password: string;
  exitViewAsUser?: string;
};

export type ILoginResponse = {
  user: IUser;
  accessToken: string;
  /** Returned when user is not yet verified */
  verificationToken?: string;
};

export type ILogoutResponse = null;

