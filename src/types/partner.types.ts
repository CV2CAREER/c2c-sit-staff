import { IUser } from "./user.types";

export interface IPartner {
  id: string;

  userId: string;

  user?: IUser;

  referralCode: string;

  maxAllowed: number;

  isAccredited: boolean;

  promotionalCount: number;

  numberOfFreePromoCount: number;

  numberOfReferralsBeforePromo: number;

  numberOfFreePromo: number;

  allowFreeBeforeReferal: boolean;

  createdAt: Date;
  updatedAt: Date;
}
