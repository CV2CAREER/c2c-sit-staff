/**
 * Client-facing content blocks that the business (admin) maintains from the
 * Communication section. Each block is rendered verbatim to clients at a fixed
 * touchpoint in the client app, so `key` is a stable contract with the client
 * app and must never be renamed once a block has shipped.
 */
export type ClientContentKey =
  | "post_payment_terms"
  | "cv_upload_terms"
  | "private_data_copy"
  | "public_data_copy"
  | "features_content";

export type ClientContentStatus = "published" | "draft";

export type ClientContentGroup =
  | "Payments"
  | "CV Upload"
  | "Client Preferences"
  | "Features";

export interface ClientContentSection {
  id: string;
  key: ClientContentKey;
  /** Human readable name of the section content, e.g. "Terms & Conditions". */
  name: string;
  /** What the block is for, shown under the name in the list. */
  description: string;
  /** Where in the client app this block surfaces. */
  placement: string;
  /** One of `ClientContentGroup` today; widened so a new backend group renders. */
  group: string;
  /** Rich text (HTML) authored in the editor. */
  body: string;
  status: ClientContentStatus;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

export interface UpdateClientContentPayload {
  id: string;
  body: string;
  status: ClientContentStatus;
}
