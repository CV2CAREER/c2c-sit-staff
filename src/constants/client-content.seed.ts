import type { ClientContentKey } from "@/models/v1/client-content.model";

export type ClientContentSeed = {
  key: ClientContentKey;
  name: string;
  description: string;
  placement: string;
  group: string;
  status: "published" | "draft";
  body: string;
};

/**
 * Written once when the table is first created, then owned by the business via
 * the admin Communication screen. Changing copy here has no effect on rows that
 * already exist.
 */
export const CLIENT_CONTENT_SEED: ClientContentSeed[] = [
  {
    key: "post_payment_terms",
    name: "Terms & Conditions",
    description:
      "The agreement a client accepts once their payment has been confirmed.",
    placement: "Shown to the client immediately after payment.",
    group: "Payments",
    status: "published",
    body: `<h2>Terms &amp; Conditions</h2>
<p>Thank you for your payment. By continuing you confirm that you have read and accepted the terms set out below.</p>
<h3>1. Your subscription</h3>
<p>Your plan begins on the date payment is confirmed and renews automatically at the end of each billing period unless cancelled beforehand from your account settings.</p>
<h3>2. Refunds</h3>
<p>You may request a full refund within 14 days of your first payment, provided no application has been submitted on your behalf. Refunds are processed to the original payment method within 5-10 business days.</p>
<h3>3. Our commitment</h3>
<ul>
<li>We will only apply to roles that match the preferences you have set.</li>
<li>We will never contact an employer using details you have marked as private.</li>
<li>You may pause or cancel your plan at any time.</li>
</ul>
<h3>4. Your responsibilities</h3>
<p>You agree that the information in your profile and CV is accurate, that you hold the right to work in the locations you have selected, and that you will respond to interview requests in good time.</p>
<p>Questions? Reach us at <a href="mailto:support@cvtocareer.com">support@cvtocareer.com</a>.</p>`,
  },
  {
    key: "onboarding_pack",
    name: "Onboarding Pack",
    description:
      "The branded PDF attached to the automated payment receipt email after a client's payment completes.",
    placement: "Attached to the payment receipt email sent after payment.",
    group: "Payments",
    status: "published",
    body: `<h2>Welcome to CVtoCAREER</h2>
<p>Thank you for your payment. Your plan is now active and your onboarding has started.</p>
<h3>What happens next</h3>
<ul>
  <li>Welcome &mdash; we confirm your details and prepare your account.</li>
  <li>Profile &amp; social verification &mdash; we verify your public profile links.</li>
  <li>Credentials &mdash; you receive your dashboard access details.</li>
  <li>Toolkit &mdash; your CV and application toolkit is switched on.</li>
  <li>Final checks &mdash; a quick review before your campaign goes live.</li>
</ul>
<h3>Your receipt</h3>
<p>Your payment receipt is attached to the email that came with this pack. Please keep it for your records.</p>
<h3>Need help?</h3>
<p>Contact us at support@cvtocareer.com or through the contact page on our website.</p>`,
  },
  {
    key: "cv_upload_terms",
    name: "CV Upload Terms & Conditions",
    description:
      "Consent copy a client must accept before their CV is stored and used for applications.",
    placement: "Shown on the CV upload screen, above the upload control.",
    group: "CV Upload",
    status: "published",
    body: `<h2>Before you upload your CV</h2>
<p>By uploading your CV you confirm the following:</p>
<ol>
<li>The CV is your own work and the information in it is true and current.</li>
<li>You permit us to store your CV securely and to share it with employers when we apply to a role on your behalf.</li>
<li>You permit us to reformat or rewrite the CV so that it presents well for each application. The underlying facts will not be changed.</li>
</ol>
<h3>How we handle your file</h3>
<p>Your CV is encrypted at rest and is never sold or shared with third parties for marketing. You can delete it at any time from your profile, and we will remove it from our systems within 30 days.</p>
<p>Accepted formats: PDF, DOC and DOCX, up to 5MB.</p>`,
  },
  {
    key: "private_data_copy",
    name: "Private Data Copy",
    description:
      "Explains what happens to data the client marks as private when updating preferences.",
    placement:
      "Shown beside the 'Private' option on the client preference update screen.",
    group: "Client Preferences",
    status: "published",
    body: `<h2>Keeping this private</h2>
<p>Anything you mark as private stays between you and your placement team. It is used to match you to the right roles, but it is never included in an application or shown to an employer.</p>
<p>This typically covers your current salary, your reason for leaving a role, and any employers you have asked us to avoid.</p>
<p>You can change this at any time, and the change applies to every future application.</p>`,
  },
  {
    key: "public_data_copy",
    name: "Public Data Copy",
    description:
      "Explains what happens to data the client marks as public when updating preferences.",
    placement:
      "Shown beside the 'Public' option on the client preference update screen.",
    group: "Client Preferences",
    status: "published",
    body: `<h2>Sharing this publicly</h2>
<p>Anything you mark as public may be included in the applications we submit for you and can be seen by the employers we apply to.</p>
<p>This typically covers your work history, your qualifications, the locations you are open to, and your notice period.</p>
<p>Making more of your profile public usually leads to stronger matches, and you can withdraw it again whenever you like.</p>`,
  },
  {
    key: "features_content",
    name: "Features Content",
    description:
      "The feature list clients see when comparing what is included in their plan.",
    placement: "Shown on the client Features page and in the plan comparison.",
    group: "Features",
    status: "draft",
    body: `<h2>What you get</h2>
<h3>Applications handled for you</h3>
<p>Your placement team applies to matched roles on your behalf, so you spend your time preparing rather than searching.</p>
<h3>A CV that fits the role</h3>
<p>We tailor your CV for each application, keeping every fact intact while leading with what that employer cares about.</p>
<h3>Interview coaching</h3>
<p>Book a session with a coach ahead of any interview and walk in knowing what to expect.</p>
<h3>One place to track everything</h3>
<p>Every application, response and interview lives on your dashboard, updated as it happens.</p>`,
  },
];

/** Display order of the groups on the admin screen. */
export const CLIENT_CONTENT_GROUP_ORDER = [
  "Payments",
  "CV Upload",
  "Client Preferences",
  "Features",
];
