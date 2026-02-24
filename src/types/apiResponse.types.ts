export type ApiSuccess<T = unknown> = {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
};

export type ApiError = {
  success: boolean;
  message: string;
  data: null;
  statusCode: number;
};
