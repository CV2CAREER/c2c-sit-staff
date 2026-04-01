export interface IPromotions {
  name: string;
  country: string;
  expiryDate: string;
  _id: string;
  countryCode: string;
  type: string;
  promotionCode: string;
}

export interface IPromotionLength {
  _id: string;
  numberOfReferralsBeforePromo: number;
  numberOfFreePromo: number;
}
