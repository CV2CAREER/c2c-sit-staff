/**
 * Seed Script: AI Vetting Sample Client #2 (Software Engineer — Nigeria)
 *
 * Creates a fully-fleshed client account for testing the AI Vetting Agent:
 * - User (role: client, active, subscribed)
 * - Primary Profile (active + approved) with software-engineering criteria
 * - Credentials row (so the client appears in Campaign Management / Manual Discovery)
 * - Approved resume Upload with realistic CV data points
 * - Gold Plan + Feature
 *
 * Run: npx tsx src/scripts/seed-ai-vetting-sample-client-ng.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { Sequelize } from 'sequelize';
import { getSequelize } from '../utils/sequelize';
import { User } from '../models/v1/user.model';
import { Profile } from '../models/v1/profile.model';
import { Credentials } from '../models/v1/credentials.model';
import { Upload } from '../models/v1/upload.model';
import { Plan } from '../models/v1/plan.model';
import { Feature, SubscriptionTier } from '../models/v1/feature.model';
import { UploadType, UploadStatus, UploadSource } from '../utils/enum';

const CLIENT_EMAIL = 'ai-vetting-ng@yopmail.com';
const CLIENT_PASSWORD = 'Test@123456';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

const SAMPLE_CV_DATA_POINTS = {
  cvType: 'refined' as const,
  contactInformation: 'Lagos, Nigeria | +234 803 555 1234',
  professionalSummary:
    'Software engineer with 5+ years of experience across backend, frontend and mobile development. Proficient in Node.js, React, TypeScript and PostgreSQL, with a strong focus on clean APIs and cloud deployment.',
  workExperience: [
    {
      company: 'Technaija Solutions Ltd',
      position: 'Full Stack Software Engineer',
      duration: '2021 - Present',
      responsibilities: [
        'Built REST and GraphQL APIs with Node.js and PostgreSQL',
        'Developed responsive frontends in React and TypeScript',
        'Shipped mobile features using React Native for 100k+ users',
      ],
    },
    {
      company: 'PayStream Africa',
      position: 'Backend Engineer',
      duration: '2019 - 2021',
      responsibilities: [
        'Implemented payment integrations and webhooks',
        'Designed database schemas and optimised slow queries',
        'Automated deployments with Docker and AWS',
      ],
    },
  ],
  education: [
    {
      institution: 'University of Lagos',
      degree: 'Bachelor of Computer Science',
      year: '2019',
    },
  ],
  skills: ['JavaScript', 'TypeScript', 'React', 'React Native', 'Node.js', 'Express', 'Python', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Git'],
  achievements: ['Scaled backend to handle 1M+ requests daily', 'Built internal CI/CD pipeline from scratch'],
  certificationsLicenses: [
    { name: 'AWS Certified Developer', issuer: 'Amazon Web Services', year: '2023' },
  ],
  relevantProjects: ['Fintech Payment Gateway', 'Logistics Tracking App'],
  languages: ['English (Fluent)', 'Yoruba (Native)'],
  professionalAssociationsVolunteerWork: [
    { name: 'ForLoop Africa', role: 'Mentor', duration: '2022 - Present' },
  ],
};

const SAMPLE_JOB_TITLES = ['Software Engineer', 'Backend Engineer', 'Frontend Engineer', 'Full Stack Engineer', 'Mobile Developer', 'Software Developer'];
const SAMPLE_KEYWORDS = ['JavaScript', 'TypeScript', 'React', 'React Native', 'Node.js', 'Express', 'Python', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Git'];

async function getOrCreateGoldFeature(): Promise<Feature> {
  let feature = await Feature.findOne({ where: { tier: SubscriptionTier.GOLD } });
  if (!feature) {
    feature = await Feature.create({
      title: 'Gold Plan',
      tier: SubscriptionTier.GOLD,
      price: 999,
      jobApplications: 50,
      cvResumeRequests: 2,
      screeningPrep: 2,
      interviewPrep: 1,
      validityPeriod: '6 months',
      pauseOptionMonths: 1,
      subscriptionBreak: '1 month pause available',
      profileLimit: 2,
    } as any);
    console.log('  Created Gold Feature');
  }
  return feature;
}

(async () => {
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    // ── User ──────────────────────────────────────────────────────────────
    // NOTE: emails in `users` AND `credentials.seekEmail` are encrypted at
    // rest, so we dedupe via the plain-text JSONB Batch marker instead.
    const existingCredential = await Credentials.findOne({
      where: Sequelize.where(
        Sequelize.literal(`"seekExternalCredentials"->>'Batch'`),
        'AI-VET-TEST-NG'
      ),
    });
    const existingUserId = existingCredential?.clientId ?? null;

    let user: User | null = null;
    if (existingUserId) {
      user = await User.findOne({ where: { id: existingUserId } });
    }
    if (user) {
      console.log(`User already exists: ${CLIENT_EMAIL} (id: ${user.id})`);
    } else {
      const hashedPassword = await bcrypt.hash(CLIENT_PASSWORD, BCRYPT_ROUNDS);
      user = await User.create({
        email: CLIENT_EMAIL,
        firstName: 'Chinedu',
        lastName: 'Okoro',
        password: hashedPassword,
        role: 'client',
        gender: 'Prefer Not to Say',
        country: 'Nigeria',
        currentCityOfResidence: 'Lagos',
        phoneNumber: '+2348035551234',
        isActive: true,
        isEmailVerified: true,
        isUserSubscribed: true,
        isDocumentUploaded: true,
        isDocumentApproved: true,
        progress: 'Preferences Updated',
        paymentStatus: 'Paid',
        plan: 'Gold',
        selectedPlan: 'Gold',
        agreeToTerms: true,
        updatedBy: 'seed-ai-vetting',
      } as any);
      console.log(`  Created user: ${CLIENT_EMAIL} (id: ${user.id})`);
    }

    // ── Profile (primary, active) ─────────────────────────────────────────
    let profile = await Profile.findOne({ where: { userId: user.id, name: 'primary' } });
    if (profile) {
      console.log(`  Profile already exists for: ${CLIENT_EMAIL}`);
      await profile.update({
        minSalary: 10000,
        maxSalary: 20000,
      } as any);
      console.log(`  Updated minSalary/maxSalary for: ${CLIENT_EMAIL}`);
    } else {
      profile = await Profile.create({
        userId: user.id,
        name: 'primary',
        role: 'Software Engineering',
        titles: ['Software Engineer', 'Software Developer', 'Backend Engineer', 'Frontend Engineer', 'Full Stack Engineer', 'Full Stack Developer', 'Mobile Developer', 'Mobile App Developer'],
        titlesExcluded: ['Senior Management', 'Scrum Master', 'IT Support', 'Network Engineer'],
        keywords: ['JavaScript', 'TypeScript', 'React', 'React Native', 'Node.js', 'Express', 'Python', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Git', 'REST API', 'GraphQL'],
        keywordsExcluded: ['WordPress', 'PHP', 'Flutter', 'Excel'],
        jobTypes: ['Full-time', 'Contract', 'Remote'],
        minSalary: 10000,
        maxSalary: 20000,
        country: 'Nigeria',
        state: ['Lagos'],
        city: ['Lagos', 'Remote'],
        locations: ['Lagos', 'Remote'],
        industriesInclude: ['Information Technology', 'Software Development', 'Financial Technology', 'Telecommunications'],
        industriesExclude: ['Retail', 'Hospitality'],
        isResumeVariationDeveloped: true,
        isAiForCriteriaSelectionAllowed: true,
        isActive: true,
        isApproved: true,
        questions: [
          {
            question: 'What is your current notice period?',
            answer: 'One month',
            private: false,
          },
          {
            question: 'Are you willing to relocate?',
            answer: 'Yes, internationally for the right role',
            private: false,
          },
        ],
      } as any);
      console.log(`  Created Profile for: ${CLIENT_EMAIL}`);
    }

    // ── Credentials (appears in Campaign Management) ──────────────────────
    let credentials = await Credentials.findOne({ where: { clientId: user.id, isDeleted: false } });
    if (credentials) {
      console.log(`  Credentials already exist for: ${CLIENT_EMAIL} (id: ${credentials.id})`);
    } else {
      const campaignEnd = new Date();
      campaignEnd.setDate(campaignEnd.getDate() + 90);
      credentials = await Credentials.create({
        seekEmail: CLIENT_EMAIL,
        seekPassword: '',
        currentCity: 'Nigeria',
        seekExternalCredentials: {
          First_Name: 'Chinedu',
          Middle_Name: '',
          Last_Name: 'Okoro',
          Full_Name: 'Chinedu Okoro',
          Batch: 'AI-VET-TEST-NG',
          Craft: 'Software Engineering',
          CustomerId: 'CUST-AIVET-002',
          Plan: 'Gold',
          CampaignEnd: campaignEnd.toISOString().split('T')[0],
          SeekSubDurDays: 90,
          Alias_Email: '',
          Active: true,
        },
        clientId: user.id,
        Active: true,
        capitalized: 'INFLIGHT',
        SeekAnswerPriority: true,
        SeekAggregator: true,
        SeekSubStartDate: new Date().toISOString().split('T')[0],
      } as any);
      console.log(`  Created Credentials for: ${CLIENT_EMAIL} (id: ${credentials.id})`);
    }

    // ── Resume Upload ─────────────────────────────────────────────────────
    const existingUpload = await Upload.findOne({ where: { userId: user.id, type: UploadType.RESUME, isDeleted: false } });
    if (existingUpload) {
      console.log(`  Resume already exists for: ${CLIENT_EMAIL}`);
    } else {
      await Upload.create({
        userId: user.id,
        type: UploadType.RESUME,
        status: UploadStatus.ACCEPTED,
        source: UploadSource.CLIENT,
        isDefault: true,
        isActive: true,
        isDeleted: false,
        document: {
          url: 'https://storage.googleapis.com/c2c-documents/sample-software-engineer-ng-resume.pdf',
          publicId: `resume_${user.id}`,
          name: 'Chinedu_Okoro_Resume.pdf',
          size: 245000,
          mimeType: 'application/pdf',
        },
        cvDataPoints: SAMPLE_CV_DATA_POINTS,
        cvJobTitles: SAMPLE_JOB_TITLES,
        keywords: SAMPLE_KEYWORDS,
        approvedAt: new Date(),
        approvedBy: 'system-seed',
      } as any);
      console.log(`  Created resume for: ${CLIENT_EMAIL}`);
    }

    // ── Plan (Gold) ───────────────────────────────────────────────────────
    const existingPlan = await Plan.findOne({ where: { userId: user.id } });
    if (existingPlan) {
      console.log(`  Plan already exists for: ${CLIENT_EMAIL}`);
    } else {
      const feature = await getOrCreateGoldFeature();
      await Plan.create({
        userId: user.id,
        title: feature.title,
        featureId: feature.id,
        profileIds: [profile.id],
        hasExpired: false,
        validityPeriod: feature.validityPeriod,
        paymentStatus: 'completed',
        paymentAmount: feature.price,
        paymentCurrency: 'NGN',
      } as any);
      console.log(`  Created Gold plan for: ${CLIENT_EMAIL}`);
    }

    console.log('\n✅ AI Vetting sample client (NG) seeded successfully.');
    console.log(`  User        : ${user.id} (${CLIENT_EMAIL})`);
    console.log(`  Profile     : ${profile.id}`);
    console.log(`  Credentials : ${credentials.id}`);
    console.log(`  Password    : ${CLIENT_PASSWORD}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    try {
      await sequelize.close();
    } catch {}
    process.exit(1);
  }
})();
