
import { Request, Response } from "express";
import db from "@/database/postgres";

interface IAggregator {
  name: string;
  imageUrl: string;
  status: boolean;
}

const statusField: Record<string, string> = {
  jobbank: "jobbank_aggregator",
  seek: "seek_aggregator",
  adecco: "adecco_aggregator",
  indeed: "indeed_aggregator",
  linkedin: "linkedin_aggregator",
  adzuna: "adzuna_aggregator",
  escapecity: "escapecity_aggregator",
  reed: "reed_aggregator",
  careerone: "careerone_aggregator",
  jora: "jora_aggregator",
  randstad: "randstad_aggregator",
  michaelpage: "michael_page_aggregator",
};

/* ----------------------------- POST ----------------------------- */
export const countApplications = async (req: Request, res: Response) => {
  try {
    const { clientId, internalJobSites_, externalJobSites_ } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "clientId is required",
        data: null,
      });
    }

    /* credentials */
    const cred = await db.credentials.findUnique({
      where: { id: clientId },
    });

    if (!cred) {
      return res.status(404).json({
        success: false,
        message: "Credentials not found",
        data: null,
      });
    }

    /* user */
    const user = await db.user.findFirst({
      where: { unique_id: cred.customer_id },
      select: { profile_id: true },
    });

    if (!user?.profile_id) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
        data: null,
      });
    }

    /* aggregators (join) */
    const aggregators = await db.aggregator.findMany({
      where: {
        profile_aggregators: {
          some: {
            profile_id: user.profile_id,
          },
        },
      },
    });

    const matchAggregators = (jobSites: any[]): IAggregator[] =>
      jobSites
        ?.filter((s) => s?.value && s.value !== "all")
        .map((site) => {
          const key = statusField[site.value.toLowerCase()];
          const status = key ? cred[key] : false;

          const agg = aggregators.find(
            (a) => a.name.toLowerCase() === site.value.toLowerCase()
          );

          if (!agg) return null;

          return {
            name: agg.name,
            imageUrl: agg.image_url || "",
            status: status || false,
          };
        })
        .filter(Boolean) as IAggregator[];

    const internal = matchAggregators(internalJobSites_);
    const external = matchAggregators(externalJobSites_);

    return res.status(200).json({
      success: true,
      message:
        internal.length + external.length > 0
          ? "Aggregators retrieved successfully"
          : "No matching aggregators found",
      data: { internal, external },
    });
  } catch (error) {
    console.error("countApplications:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};

/* ----------------------------- PUT ----------------------------- */
export const toggleAggregatorStatus = async (req: Request, res: Response) => {
  try {
    const { clientId, jobSite } = req.body;

    if (!clientId || !jobSite) {
      return res.status(400).json({
        success: false,
        message: "clientId and jobSite are required",
        data: null,
      });
    }

    const statusKey = statusField[jobSite.toLowerCase()];
    if (!statusKey) {
      return res.status(400).json({
        success: false,
        message: "Invalid job site",
        data: null,
      });
    }

    const cred = await db.credentials.findUnique({
      where: { id: clientId },
    });

    if (!cred) {
      return res.status(404).json({
        success: false,
        message: "Credentials not found",
        data: null,
      });
    }

    const newStatus = !cred[statusKey];

    await db.credentials.update({
      where: { id: clientId },
      data: { [statusKey]: newStatus },
    });

    return res.status(200).json({
      success: true,
      message: `Status updated to ${newStatus}`,
      data: null,
    });
  } catch (error) {
    console.error("toggleAggregatorStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};
