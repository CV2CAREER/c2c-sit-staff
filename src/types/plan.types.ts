import { IFeature } from "./feature.types";

export type PaymentStatus = "awaiting_payment" | "completed" | "failed" | "refunded";

export interface IPayPalCaptureData {
  id: string;
  status: string;
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
      }>;
    };
  }>;
}

export interface IPlan {
  id: string;
  userId: string;
  title: string;
  featureId: string;
  profileIds: string[];
  hasExpired: boolean;
  validityPeriod?: string;
  expiresAt?: Date;
  paypalOrderId?: string;
  paymentStatus: PaymentStatus;
  paymentAmount?: number;
  paymentCurrency?: string;
  paypalCaptureData?: IPayPalCaptureData;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  feature?: IFeature;
}
