import { IUser } from "./user.types";

export interface ICustomerService {
  id: string;

  userId: string;

  user?: IUser;

  isAccredited: boolean;

  createdAt: Date;
  updatedAt: Date;
}
