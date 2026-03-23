export interface AggregatorPicture {
  url?: string;
  key?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  [key: string]: any;
}

export interface AggregatorLink {
  aggregatorId: number; // Foreign key to aggregators table
  username?: string;
  password?: string;
  isVerified: boolean;
}
