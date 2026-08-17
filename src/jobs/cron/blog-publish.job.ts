import cron from "node-cron";
import { Op } from "sequelize";
import { Blog } from "../../models/v1/blog.model";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("blog-publish-job");

export function createBlogPublishJob() {
  const job = cron.schedule("*/1 * * * *", async () => {
    try {
      const now = new Date();

      const [affected] = await Blog.update(
        { isPublished: true },
        {
          where: {
            isPublished: false,
            recycled: false,
            publishedAt: {
              [Op.not]: null,
              [Op.lte]: now,
            },
          },
        },
      );

      if (affected > 0) {
        logger.info(`Auto-published ${affected} scheduled blog post(s)`);
      }
    } catch (error: any) {
      logger.error(`Failed to auto-publish scheduled posts: ${error.message}`);
    }
  });

  return job;
}
