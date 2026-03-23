import { IUser } from "./user.types";

export interface ISalesConsultant {
  id: string;

  userId: string;

  user?: IUser;

  referralCode: string;

  isAccredited: boolean;

  createdAt: Date;
  updatedAt: Date;
}
