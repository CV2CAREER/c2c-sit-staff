export interface JwtPayload {
  data: string;
  iat?: number;
  exp?: number;
}
