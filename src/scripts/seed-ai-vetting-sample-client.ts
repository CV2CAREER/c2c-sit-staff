/**
 * Seed Script: AI Vetting Sample Client (Software Developer — Argentina)
 *
 * Creates a fully-fleshed client account for testing the AI Vetting Agent:
 * - User (role: client, active, subscribed)
 * - Primary Profile (active + approved) with software-dev criteria the AI reads
 * - Credentials row (so the client appears in Campaign Management / Manual Discovery)
 * - Approved resume Upload with realistic CV data points
 * - Gold Plan + Feature
 *
 * Run: npx tsx src/scripts/seed-ai-vetting-sample-client.ts
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

const CLIENT_EMAIL = 'ai-vetting-sd@yopmail.com';
const CLIENT_PASSWORD = 'Test@123456';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

const SAMPLE_CV_DATA_POINTS = {
  cvType: 'refined' as const,
  contactInformation: 'Buenos Aires, Argentina | +54 9 11 5555 1234',
  professionalSummary:
    'Software developer with 6+ years of experience building full-stack web applications using React, Node.js and Python. Skilled in cloud deployment with AWS, API design and agile delivery.',
  workExperience: [
    {
      company: 'Mercado Tech SRL',
      position: 'Senior Full Stack Developer',
      duration: '2021 - Present',
      responsibilities: [
        'Built and scaled React + Node.js applications serving 2M+ users',
        'Designed REST APIs with PostgreSQL and Redis',
        'Led migration of monolith to AWS microservices',
      ],
    },
    {
      company: 'Globant Argentina',
      position: 'Software Developer',
      duration: '2018 - 2021',
      responsibilities: [
        'Developed web features with React, TypeScript and Django',
        'Collaborated with product and design on new initiatives',
        'Maintained CI/CD pipelines and automated testing',
      ],
    },
  ],
  education: [
    {
      institution: 'Universidad de Buenos Aires',
      degree: 'Bachelor of Computer Science',
      year: '2018',
    },
  ],
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'PostgreSQL', 'AWS', 'Docker', 'Git', 'Agile'],
  achievements: ['Led successful migration to cloud infrastructure', 'Mentored 4 junior developers'],
  certificationsLicenses: [
    { name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', year: '2022' },
  ],
  relevantProjects: ['Enterprise CRM System', 'E-commerce Platform Redesign'],
  languages: ['Spanish (Native)', 'English (Fluent)'],
  professionalAssociationsVolunteerWork: [
    { name: 'Open Source Contributor', role: 'Maintainer', duration: '2020 - Present' },
  ],
};

const SAMPLE_JOB_TITLES = ['Software Developer', 'Senior Software Developer', 'Full Stack Developer', 'Full Stack Engineer', 'Backend Engineer'];
const SAMPLE_KEYWORDS = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'PostgreSQL', 'AWS', 'Docker', 'Git'];

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
        'AI-VET-TEST'
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
        firstName: 'Alex',
        lastName: 'Developer',
        password: hashedPassword,
        role: 'client',
        gender: 'Prefer Not to Say',
        country: 'Argentina',
        currentCityOfResidence: 'Buenos Aires',
        phoneNumber: '+5491155551234',
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
        minSalary: 100,
        maxSalary: 150,
      } as any);
      console.log(`  Updated minSalary/maxSalary for: ${CLIENT_EMAIL}`);
    } else {
      profile = await Profile.create({
        userId: user.id,
        name: 'primary',
        role: 'Software Engineering',
        titles: ['Software Developer', 'Senior Software Developer', 'Full Stack Developer', 'Full Stack Engineer', 'Backend Engineer'],
        titlesExcluded: ['Senior Management', 'Team Lead (People Manager)'],
        keywords: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'PostgreSQL', 'AWS', 'Docker', 'Git'],
        keywordsExcluded: ['WordPress', 'PHP'],
        jobTypes: ['Full-time', 'Contract'],
        minSalary: 100,
        maxSalary: 150,
        country: 'Argentina',
        state: ['Buenos Aires'],
        city: ['Buenos Aires'],
        locations: ['Buenos Aires'],
        industriesInclude: ['Information Technology', 'Software Development'],
        industriesExclude: ['Retail'],
        isResumeVariationDeveloped: true,
        isAiForCriteriaSelectionAllowed: true,
        isActive: true,
        isApproved: true,
        questions: [
          {
            question: 'What is your current notice period?',
            answer: 'Two weeks',
            private: false,
          },
          {
            question: 'Are you willing to relocate?',
            answer: 'Yes, within Argentina or remote',
            private: false,
          },
        ],
      } as any);
      console.log(`  Created Profile for: ${CLIENT_EMAIL}`);
    }

    // ── Credentials (appears in Campaign Management) ──────────────────────
    let credentials = await Credentials.findOne({ where: { clientId: user.id, isDeleted: false } });    if (credentials) {
      console.log(`  Credentials already exist for: ${CLIENT_EMAIL} (id: ${credentials.id})`);
    } else {
      const campaignEnd = new Date();
      campaignEnd.setDate(campaignEnd.getDate() + 90);
      credentials = await Credentials.create({
        seekEmail: CLIENT_EMAIL,
        seekPassword: '',
        currentCity: 'Argentina',
        seekExternalCredentials: {
          First_Name: 'Alex',
          Middle_Name: '',
          Last_Name: 'Developer',
          Full_Name: 'Alex Developer',
          Batch: 'AI-VET-TEST',
          Craft: 'Software Development',
          CustomerId: 'CUST-AIVET-001',
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
          url: 'https://storage.googleapis.com/c2c-documents/sample-software-dev-resume.pdf',
          publicId: `resume_${user.id}`,
          name: 'Alex_Developer_Resume.pdf',
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
        paymentCurrency: 'ARS',
      } as any);
      console.log(`  Created Gold plan for: ${CLIENT_EMAIL}`);
    }

    console.log('\n✅ AI Vetting sample client seeded successfully.');
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
