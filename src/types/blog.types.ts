export type BlogStatus = "Draft" | "Published" | "Scheduled";

export interface IBlogPost {
  _id: string;
  title: string;
  body: string;
  category: string;
  location?: string;
  option: string;
  description: string;
  image?: string;
  status: BlogStatus;
  recycled: boolean;
  scheduledDate?: string;
  author: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IBlogStats {
  followers: {
    value: number;
    trend: number;
  };
  posts: {
    value: number;
    trend: number;
  };
  comments: {
    value: number;
    trend: number;
  };
}

export interface IBlogChartData {
  month: string;
  posts: number;
  followers: number;
}
