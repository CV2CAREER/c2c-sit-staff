import { CredentialsComment } from "../../models/v1/credentials-comment.model";

export interface CommentRow {
  id: string;
  authorName: string;
  comment: string;
  createdAt: string;
}

class PlacementCommentsService {
  async list(credId: string): Promise<CommentRow[]> {
    const rows = await CredentialsComment.findAll({
      where: { credentialsId: credId },
      order: [["createdAt", "DESC"]],
    });

    return rows.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async add(credId: string, authorId: string, authorName: string, comment: string): Promise<CommentRow> {
    const trimmed = (comment || "").trim();
    if (!trimmed) {
      throw new Error("Comment text is required");
    }

    const row = await CredentialsComment.create({
      credentialsId: credId,
      authorId,
      authorName,
      comment: trimmed,
    } as any);

    return {
      id: row.id,
      authorName: row.authorName,
      comment: row.comment,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

export const placementCommentsService = new PlacementCommentsService();
