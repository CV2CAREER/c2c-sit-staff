/**
 * The FAQs that were hardcoded on the public /faq page (c2c-customer-rft
 * faqsData.ts). Migrated once as Published — they were already live — so the
 * page reads them from the database from now on and admins edit them in
 * Communication → FAQ. Answers are plain text; the page turns URLs and
 * www. addresses into links.
 */
export const FAQ_ARTICLE_SEED: {
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
}[] = [
  {
    question: "What Services does CVtoCAREER offer?",
    category: "Getting Started",
    displayOrder: 1,
    answer: [
      "We offer a range of career services aimed at helping you achieve your career goals:",
      "",
      "• CV Uplift: Our team of professionals work with clients to enhance their CVs by introducing keywords consistent with industry standards they wish to be in or are currently in. We also upgrade the look, feel and formatting of the CV to make it more visually engaging to potential employers; this is to increase your chance to stand out!",
      "• Application Automation: We have developed software that automates the job application process for our clients. By using our software, job seekers can apply for multiple jobs at once through our integration with job aggregator platforms. This increases visibility and a client's chance of getting hired.",
      "• Interview Preparation: We provide online Screening Calls Preparatory Sessions and Panel Interview Preparatory Sessions to help job seekers prepare for interviews. Our team will provide tips and advice on how to answer common interview questions and also how to present yourself in the best possible light.",
    ].join("\n"),
  },
  {
    question: "How long does the CV development process take?",
    category: "Your CV & Documents",
    displayOrder: 2,
    answer:
      "The CV development process typically takes 5-10 working days, though this may vary depending on the existing workload at the time. We work closely with our clients to ensure their CVs highlight their strengths, experience and accomplishments in a way that resonates with potential employers.",
  },
  {
    question: "How long does CVtoCAREER estimate for their clients to land a job?",
    category: "How We Find & Apply for Jobs",
    displayOrder: 3,
    answer:
      "Our analysis suggests that there is a possibility of receiving job offers within a month of initiating the application process with us. Nevertheless, it's crucial to acknowledge that outcomes may differ based on the unique circumstances of each individual, and we cannot guarantee interviews or job placement.",
  },
  {
    question: "What industries does CVtoCAREER specialize in?",
    category: "Getting Started",
    displayOrder: 4,
    answer:
      "We offer services across all industries, from Healthcare, finance, engineering, information technology and much more!",
  },
  {
    question: "How do I engage CVtoCAREER career services?",
    category: "Getting Started",
    displayOrder: 5,
    answer:
      "You can do so by signing up on www.cvtocareer.com, choose a plan from our offered services, upload your required documents as prompted on your dashboard and leave the rest to CVtoCAREER! A support personnel will contact you and follow up with the rest of the process as soon as possible!",
  },
];

/**
 * Starting FAQ taxonomy (INN-20 FAQ Knowledge Base). Written once when the
 * category table is empty; after that the business owns the list from
 * Communication → FAQ → Categories.
 */
export const FAQ_CATEGORY_SEED: { name: string; displayOrder: number }[] = [
  { name: "Getting Started", displayOrder: 1 },
  { name: "Plans, Billing & Cancellation", displayOrder: 2 },
  { name: "Your CV & Documents", displayOrder: 3 },
  { name: "How We Find & Apply for Jobs", displayOrder: 4 },
  { name: "Jobsite Accounts & Credentials", displayOrder: 5 },
  { name: "Support & Escalation", displayOrder: 6 },
];
