/**
 * FAQ Knowledge Base (Communication → FAQ). The single source of truth the
 * public FAQ page and the chatbot read from — replaces Train Chatbot.
 */

/** Only `published` articles are visible to clients or answerable by the bot. */
export type FaqArticleStatus = "draft" | "in_review" | "published";

/** What an author can save from the form; publishing happens in the Review Queue. */
export type FaqAuthorStatus = Exclude<FaqArticleStatus, "published">;

export interface FaqCategory {
  id: string;
  name: string;
  displayOrder: number;
  articleCount: number;
  publishedCount: number;
}

export interface FaqArticle {
  id: string;
  /** Short human reference, e.g. FAQ-001. */
  code: string;
  question: string;
  answer: string;
  categoryId: string;
  categoryName: string | null;
  status: FaqArticleStatus;
  /** `false` = public on the FAQ page, but the bot hands over to Human Support. */
  botAnswerable: boolean;
  displayOrder: number;
  /** Times clients opened this answer on the public /faq page. */
  viewCount: number;
  updatedBy: string;
  updatedAt: string;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface SaveFaqArticlePayload {
  question: string;
  answer: string;
  categoryId: string;
  status: FaqAuthorStatus;
  botAnswerable: boolean;
  displayOrder: number;
}
