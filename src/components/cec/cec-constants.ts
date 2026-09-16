export function fmtDate(val: unknown): string {
  if (!val) return "---";
  const s = String(val).trim();
  if (!s) return "---";
  let d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slash) {
    d = new Date(Number(slash[3]), Number(slash[1]) - 1, Number(slash[2]));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
    d = new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
  }
  return s;
}

export const OPTS: Record<string, string[]> = {
  status: ["Active-Inflight", "Active-Paused", "Expired"],
  loyalty: ["Newcomer", "Returnee"],
  historyReviewed: ["Yes", "No"],
  briefing: ["YES", "NO"],
  callEstablished: ["Yes", "No"],
  followUp: ["Yes", "No", "TBD"],
  sentimentBefore: ["Critical", "Satisfied", "Advocate", "TBD"],
  sentimentAfter: ["Critical", "Satisfied", "Advocate", "TBD"],
  migration: ["TBD", "Critical to Satisfied", "TBD to Satisfied", "Satisfied to Advocate", "No movement"],
  survey: ["Yes-5mins", "Yes-late", "No"],
  referral: ["Yes", "No"],
  blockerFixed: ["Yes", "No", "N/A"],
  cvFidelity: ["H", "M", "L"],
  prefs: ["High", "Medium", "Low"],
  otp: ["No Issue", "Has Issue", "Pending Migration", "Campaign On Hold", "EXPIRED"],
  verification: ["Verified", "Not Verified", "Paused", "N/A"],
  cv: ["Uploaded", "Not yet uploaded"],
  forwarding: ["Completed", "No"],
  indeed: ["Completed", "No"],
  delegation: ["Not Required", "Required", "Completed"],
  resolution: ["Not Started", "In Progress", "Resolved"],
  cctStatus: ["Open", "In Progress", "Waiting on Client", "Resolved"],
  priority: ["High", "Medium", "Low"],
  channel: ["JustCall", "Slack", "WhatsApp", "Call", "Email"],
  category: ["Campaign / Applications", "Technical / Platform", "Retention / Engagement", "Subscription / Billing", "Interview / Placement", "Sales / Follow-up", "CV / Resume", "Verification / Account Setup", "Other"],
  owner: ["Product / PO", "Retention", "Sales", "Support", "Placement"],
  heritage: ["Nigerian", "Non-Nigerian"],
  outreach: ["Yes", "No"],
  persona: ["Guest", "Client", "Alumni"],
  state: ["Dormant", "Active", "Lapsed"],
  sentiment: ["Critical", "Satisfied", "Advocate"],
  // Ordered sourcing pipeline for prospective ambassadors (SPR-19-10-012).
  ambassadorPipeline: ["Prospect", "Contacted", "Shortlisted", "Nominated", "Signed"],
};
