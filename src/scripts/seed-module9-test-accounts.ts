/**
 * Seed Script: Module 9 (Job Preferences) Test Accounts
 *
 * Creates test accounts for QA testing:
 * 1. Guest account - to test guard redirect
 * 2. Client (non-subscribed) - to test subscription check
 * 3. Client (Gold plan) - to test job preferences with Gold tier
 * 4. Client (Platinum plan) - to test job preferences with Platinum tier
 *
 * Each client account includes:
 * - A default resume/CV document (approved)
 * - A cover letter document (approved)
 * - CV data points for job matching
 *
 * Run: npx tsx src/scripts/seed-module9-test-accounts.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { getSequelize } from '../utils/sequelize';
import { User } from '../models/v1/user.model';
import { Feature, SubscriptionTier } from '../models/v1/feature.model';
import { Plan } from '../models/v1/plan.model';
import { Profile } from '../models/v1/profile.model';
import { Upload } from '../models/v1/upload.model';
import { UploadType, UploadStatus, UploadSource } from '../utils/enum';
import bcrypt from 'bcryptjs';

const TEST_PASSWORD = 'Test@123456';
const TEST_EMAIL_DOMAIN = 'yopmail.com';

interface TestAccount {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isUserSubscribed: boolean;
  planTier?: SubscriptionTier;
  description: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    email: `qa-guest-m9@${TEST_EMAIL_DOMAIN}`,
    firstName: 'QA',
    lastName: 'Guest',
    role: 'guest',
    isUserSubscribed: false,
    description: 'Guest account - should redirect to pricing page',
  },
  {
    email: `qa-client-free-m9@${TEST_EMAIL_DOMAIN}`,
    firstName: 'QA',
    lastName: 'FreeClient',
    role: 'client',
    isUserSubscribed: false,
    description: 'Client without subscription - should show subscription required',
  },
  {
    email: `qa-client-gold-m9@${TEST_EMAIL_DOMAIN}`,
    firstName: 'QA',
    lastName: 'GoldClient',
    role: 'client',
    isUserSubscribed: true,
    planTier: SubscriptionTier.GOLD,
    description: 'Client with Gold plan - full job preferences access',
  },
  {
    email: `qa-client-platinum-m9@${TEST_EMAIL_DOMAIN}`,
    firstName: 'QA',
    lastName: 'PlatinumClient',
    role: 'client',
    isUserSubscribed: true,
    planTier: SubscriptionTier.PLATINUM,
    description: 'Client with Platinum plan - full job preferences access',
  },
];

// Sample CV data points for realistic testing
const SAMPLE_CV_DATA_POINTS = {
  cvType: 'refined' as const,
  contactInformation: 'Sydney, NSW, Australia | +61 400 123 456',
  professionalSummary: 'Experienced professional with 5+ years in software development and project management. Skilled in agile methodologies, team leadership, and delivering high-quality solutions.',
  workExperience: [
    {
      company: 'Tech Solutions Pty Ltd',
      position: 'Senior Software Developer',
      duration: '2021 - Present',
      responsibilities: ['Led development of enterprise applications', 'Mentored junior developers', 'Implemented CI/CD pipelines'],
    },
    {
      company: 'Digital Innovations Inc',
      position: 'Software Developer',
      duration: '2018 - 2021',
      responsibilities: ['Developed web applications using React and Node.js', 'Collaborated with cross-functional teams', 'Participated in code reviews'],
    },
  ],
  education: [
    {
      institution: 'University of Sydney',
      degree: 'Bachelor of Computer Science',
      year: '2018',
    },
  ],
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 'Agile', 'Git'],
  achievements: ['Employee of the Year 2022', 'Led successful migration to cloud infrastructure'],
  certificationsLicenses: [
    { name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', year: '2022' },
  ],
  relevantProjects: ['Enterprise CRM System', 'E-commerce Platform Redesign'],
  languages: ['English (Native)', 'Spanish (Intermediate)'],
  professionalAssociationsVolunteerWork: [
    { name: 'Australian Computer Society', role: 'Member', duration: '2019 - Present' },
  ],
};

const SAMPLE_JOB_TITLES = ['Software Developer', 'Senior Developer', 'Full Stack Developer', 'Technical Lead'];
const SAMPLE_KEYWORDS = ['JavaScript', 'React', 'Node.js', 'TypeScript', 'AWS', 'Agile', 'Full Stack'];

async function createDocumentsForUser(userId: string, userEmail: string): Promise<void> {
  // Check if user already has documents
  const existingDocs = await Upload.findAll({ where: { userId, isDeleted: false } });

  if (existingDocs.length > 0) {
    console.log(`  Documents already exist for: ${userEmail} (${existingDocs.length} docs)`);
    return;
  }

  // Create Resume/CV
  await Upload.create({
    userId,
    type: UploadType.RESUME,
    status: UploadStatus.ACCEPTED,
    source: UploadSource.CLIENT,
    isDefault: true,
    isDeleted: false,
    document: {
      url: 'https://storage.googleapis.com/c2c-documents/sample-resume.pdf',
      publicId: `resume_${userId}`,
      name: 'QA_Test_Resume.pdf',
      size: 245000,
      mimeType: 'application/pdf',
    },
    cvDataPoints: SAMPLE_CV_DATA_POINTS,
    cvJobTitles: SAMPLE_JOB_TITLES,
    keywords: SAMPLE_KEYWORDS,
    approvedAt: new Date(),
    approvedBy: 'system-seed',
  } as any);
  console.log(`  Created resume for: ${userEmail}`);

  // Create Cover Letter
  await Upload.create({
    userId,
    type: UploadType.COVER_LETTER,
    status: UploadStatus.ACCEPTED,
    source: UploadSource.CLIENT,
    isDefault: false,
    isDeleted: false,
    document: {
      url: 'https://storage.googleapis.com/c2c-documents/sample-cover-letter.pdf',
      publicId: `coverletter_${userId}`,
      name: 'QA_Test_CoverLetter.pdf',
      size: 125000,
      mimeType: 'application/pdf',
    },
    approvedAt: new Date(),
    approvedBy: 'system-seed',
  } as any);
  console.log(`  Created cover letter for: ${userEmail}`);
  // Create Certificate
  await Upload.create({
    userId,
    type: UploadType.CERTIFICATE,
    status: UploadStatus.ACCEPTED,
    source: UploadSource.CLIENT,
    isDefault: false,
    isDeleted: false,
    document: {
      url: 'https://storage.googleapis.com/c2c-documents/sample-certificate.pdf',
      publicId: `cert_${userId}`,
      name: 'QA_Test_Certificate.pdf',
      size: 185000,
      mimeType: 'application/pdf',
    },
    approvedAt: new Date(),
    approvedBy: 'system-seed',
  } as any);
  console.log(`  Created certificate for: ${userEmail}`);

  // Create Other Document
  await Upload.create({
    userId,
    type: UploadType.OTHER_DOCS,
    status: UploadStatus.ACCEPTED,
    source: UploadSource.CLIENT,
    isDefault: false,
    isDeleted: false,
    document: {
      url: 'https://storage.googleapis.com/c2c-documents/sample-tax-form.pdf',
      publicId: `other_${userId}`,
      name: 'QA_Test_TaxForm.pdf',
      size: 320000,
      mimeType: 'application/pdf',
    },
    approvedAt: new Date(),
    approvedBy: 'system-seed',
  } as any);
  console.log(`  Created other docs for: ${userEmail}`);
}

async function createProfileForUser(userId: string, userEmail: string): Promise<void> {
  // Check if profile already exists
  const existingProfile = await Profile.findOne({ where: { userId, name: 'primary' } });

  if (existingProfile) {
    console.log(`  Profile already exists for: ${userEmail}`);
    return;
  }

  // Create primary profile (Job Preferences)
  await Profile.create({
    userId,
    name: 'primary',
    role: 'Computer Systems Engineering', // Course of study
    titles: ['Software Developer', 'System Architect', 'Full Stack Engineer'],
    keywords: ['React', 'Node.js', 'Typescript', 'AWS', 'PostgreSQL', 'Agile'],
    jobTypes: ['Full-time', 'Contract'],
    minSalary: 100000,
    maxSalary: 150000,
    country: 'Australia',
    municipals: ['NSW'], // State/Territory
    locations: ['Sydney'], // City/Location
    isResumeVariationDeveloped: true,
    isAiForCriteriaSelectionAllowed: true,
    isActive: true,
    isApproved: true,
    questions: [
      {
        question: 'What is your current notice period?',
        answer: 'Two weeks',
        private: false
      },
      {
        question: 'Are you willing to relocate?',
        answer: 'Yes, within Australia',
        private: false
      }
    ]
  } as any);
  console.log(`  Created Job Preferences (Profile) for: ${userEmail}`);
}

async function getOrCreateFeature(tier: SubscriptionTier): Promise<Feature> {
  let feature = await Feature.findOne({ where: { tier } });

  if (!feature) {
    const featureData: Record<SubscriptionTier, Partial<Feature>> = {
      [SubscriptionTier.FREE]: {
        title: 'Free Plan',
        tier: SubscriptionTier.FREE,
        price: 0,
        jobApplications: 0,
        cvResumeRequests: 0,
        validityPeriod: '30 days',
        subscriptionBreak: 'None',
        profileLimit: 1,
      },
      [SubscriptionTier.GOLD]: {
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
      },
      [SubscriptionTier.PLATINUM]: {
        title: 'Platinum Plan',
        tier: SubscriptionTier.PLATINUM,
        price: 1999,
        jobApplications: 100,
        cvResumeRequests: 5,
        screeningPrep: 5,
        interviewPrep: 3,
        resumeDevelopment: 2,
        validityPeriod: '12 months',
        pauseOptionMonths: 3,
        subscriptionBreak: '3 months pause available',
        profileLimit: 3,
      },
      [SubscriptionTier.EMERALD]: {
        title: 'Emerald Plan',
        tier: SubscriptionTier.EMERALD,
        price: 299,
        jobApplications: 10,
        cvResumeRequests: 1,
        validityPeriod: '3 months',
        subscriptionBreak: 'None',
        profileLimit: 1,
      },
      [SubscriptionTier.CORAL]: {
        title: 'Coral Plan',
        tier: SubscriptionTier.CORAL,
        price: 199,
        jobApplications: 5,
        cvResumeRequests: 1,
        validityPeriod: '1 month',
        subscriptionBreak: 'None',
        profileLimit: 1,
      },
      [SubscriptionTier.COPPER]: {
        title: 'Copper Plan',
        tier: SubscriptionTier.COPPER,
        price: 149,
        jobApplications: 3,
        cvResumeRequests: 0,
        validityPeriod: '1 month',
        subscriptionBreak: 'None',
        profileLimit: 1,
      },
      [SubscriptionTier.BRONZE]: {
        title: 'Bronze Plan',
        tier: SubscriptionTier.BRONZE,
        price: 399,
        jobApplications: 15,
        cvResumeRequests: 1,
        validityPeriod: '3 months',
        subscriptionBreak: 'None',
        profileLimit: 1,
      },
      [SubscriptionTier.SILVER]: {
        title: 'Silver Plan',
        tier: SubscriptionTier.SILVER,
        price: 699,
        jobApplications: 30,
        cvResumeRequests: 1,
        screeningPrep: 1,
        validityPeriod: '6 months',
        subscriptionBreak: 'None',
        profileLimit: 1,
      },
    };

    feature = await Feature.create(featureData[tier] as any);
    console.log(`  Created feature: ${tier}`);
  }

  return feature;
}

async function createTestAccount(account: TestAccount): Promise<void> {
  // Check if user already exists
  let user = await User.findOne({ where: { email: account.email } });

  if (user) {
    console.log(`  User already exists: ${account.email}`);
  } else {
    // Hash password
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);

    // Create user
    user = await User.create({
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
      password: hashedPassword,
      role: account.role,
      isUserSubscribed: account.isUserSubscribed,
      isEmailVerified: true,
      isActive: true,
      isDocumentUploaded: account.role === 'client',
      isDocumentApproved: account.role === 'client',
      country: 'Australia',
      currentCityOfResidence: 'Sydney',
      gender: 'Prefer Not to Say',
      phoneNumber: `+61400${Math.floor(Math.random() * 900000 + 100000)}`,
      progress: account.role === 'guest' ? 'Email Verified' : (account.isUserSubscribed ? 'Preferences Updated' : 'Documents Accepted'),
      paymentStatus: account.isUserSubscribed ? 'Paid' : 'Unpaid',
      plan: account.planTier || null,
      selectedPlan: account.planTier || null,
    } as any);

    console.log(`  Created user: ${account.email}`);
  }

  // Ensure flags are correct even for existing users
  if (account.role === 'client') {
    await user.update({
      isDocumentUploaded: true,
      isDocumentApproved: true,
      isUserSubscribed: account.isUserSubscribed,
      progress: account.isUserSubscribed ? 'Preferences Updated' : 'Documents Accepted',
      paymentStatus: account.isUserSubscribed ? 'Paid' : 'Unpaid',
      plan: account.planTier || null,
      selectedPlan: account.planTier || null,
    });
    console.log(`  Updated status flags for: ${account.email}`);
  }

  // Create plan if user has a subscription tier
  if (account.planTier && account.isUserSubscribed) {
    const existingPlan = await Plan.findOne({ where: { userId: user.id } });

    if (existingPlan) {
      console.log(`  Plan already exists for: ${account.email}`);
    } else {
      const feature = await getOrCreateFeature(account.planTier);

      await Plan.create({
        userId: user.id,
        title: feature.title,
        featureId: feature.id,
        profileIds: [],
        hasExpired: false,
        validityPeriod: feature.validityPeriod,
        paymentStatus: 'completed',
        paymentAmount: feature.price,
        paymentCurrency: 'AUD',
      } as any);

      console.log(`  Created ${account.planTier} plan for: ${account.email}`);
    }
  }

  // Create documents and profile for client users (not guests)
  if (account.role === 'client') {
    await createDocumentsForUser(user.id, account.email);
    await createProfileForUser(user.id, account.email);
  }
}

(async () => {
  const sequelize = getSequelize();

  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    console.log('='.repeat(60));
    console.log('MODULE 9 TEST ACCOUNTS SEEDER');
    console.log('='.repeat(60));
    console.log(`\nPassword for all accounts: ${TEST_PASSWORD}\n`);

    for (const account of TEST_ACCOUNTS) {
      console.log(`\n[${account.role.toUpperCase()}] ${account.description}`);
      await createTestAccount(account);
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST ACCOUNTS SUMMARY');
    console.log('='.repeat(60));
    console.log('\n| Email | Role | Subscribed | Plan |');
    console.log('|-------|------|------------|------|');
    for (const account of TEST_ACCOUNTS) {
      console.log(`| ${account.email} | ${account.role} | ${account.isUserSubscribed ? 'Yes' : 'No'} | ${account.planTier || 'None'} |`);
    }
    console.log(`\nPassword: ${TEST_PASSWORD}`);
    console.log('\n' + '='.repeat(60));

    await sequelize.close();
    console.log('\nSeed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\nSeeding failed:', error);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
})();
