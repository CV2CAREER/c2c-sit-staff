export interface UnsubscribedUser {
  id: string;
  userId: string;
  reason: string | null;
  date: string;
  time: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface UnsubscribedUsersResponse {
  success: boolean;
  message: string;
  data: UnsubscribedUser[];
  statusCode: number;
}
