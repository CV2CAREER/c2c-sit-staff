import type { EmailTemplateType } from "@/hooks/useCommunicationTemplates";

/**
 * Starter HTML for a brand-new template, swapped in only when creating a fresh
 * template (never overwrites real content). Both share the same polished card
 * scaffold as views/emails/client-support-documents-user.ejs — gray page
 * background, white rounded+shadowed card, colored header with a logo pill,
 * CTA button, inline styles throughout (survives email clients that strip
 * <style> blocks) — so a non-developer always starts from something on-brand.
 * They differ only in content: customer greets the client by name and closes
 * with the full social-links footer; admin addresses "Dear Team" with a
 * details-box callout (borrowed from client-support-documents-admin.ejs) and
 * a minimal copyright-only footer, since internal notifications don't need
 * social links or an unsubscribe.
 */
const LOGO_URL =
  "https://firebasestorage.googleapis.com/v0/b/cvtocareer-394713.appspot.com/o/laigusbucket%2FC2C.png?alt=media&token=2c05d23e-1974-4a83-8143-99c1b6b96801";

const CUSTOMER_BODY = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 40px; color: #333">
    <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08)">
      <!-- Header -->
      <div style="background-color: #008ed3; padding: 28px 32px; text-align: center">
        <div style="background-color: #ffffff; display: inline-block; padding: 8px 20px; border-radius: 8px; margin-bottom: 16px">
          <img src="${LOGO_URL}" alt="CVtoCAREER Logo" style="display: block; width: 149px; height: 32px" />
        </div>
        <h1 style="margin: 0; color: #fff; font-size: 22px">Your subject here</h1>
      </div>

      <!-- Body -->
      <div style="padding: 28px 32px">
        <p style="margin: 0 0 16px">Dear <strong><%= name %></strong>,</p>

        <p style="margin: 0 0 16px">
          Write your message here — click a variable chip above to insert client details like their
          name or a dashboard link.
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 28px 0 24px 0">
          <a
            href="<%= frontendUrl %>/dashboard"
            style="background-color: #008ed3; color: #fff; text-decoration: none; font-weight: bold; padding: 12px 32px; border-radius: 6px; display: inline-block; font-size: 15px"
            >Go to Dashboard →</a
          >
        </div>

        <p style="margin: 24px 0 0 0">
          Best regards,<br />
          <strong>The CVtoCAREER Team</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center">
        <div style="margin-bottom: 20px">
          <a href="https://facebook.com/cvtocareer" style="display: inline-block; margin: 0 6px; text-decoration: none">
            <img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/footer/c2c_footer_fb.png" alt="Facebook" style="width: 28px; height: 28px; display: inline-block" />
          </a>
          <a href="https://x.com/cvtocareer" style="display: inline-block; margin: 0 6px; text-decoration: none">
            <img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/footer/c2c_footer_x.png" alt="X" style="width: 28px; height: 28px; display: inline-block" />
          </a>
          <a href="https://youtube.com/cvtocareer" style="display: inline-block; margin: 0 6px; text-decoration: none">
            <img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/footer/c2c_footer_yt.png" alt="YouTube" style="width: 28px; height: 28px; display: inline-block" />
          </a>
          <a href="mailto:deliveryteam@cvtocareer.com" style="display: inline-block; margin: 0 6px; text-decoration: none">
            <img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/footer/c2c_footer_gmail.png" alt="Email" style="width: 28px; height: 28px; display: inline-block" />
          </a>
          <a href="https://instagram.com/cvtocareer" style="display: inline-block; margin: 0 6px; text-decoration: none">
            <img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/footer/c2c_footer_ig.png" alt="Instagram" style="width: 28px; height: 28px; display: inline-block" />
          </a>
          <a href="https://linkedin.com/company/cvtocareer" style="display: inline-block; margin: 0 6px; text-decoration: none">
            <img src="https://storage.googleapis.com/cvtocareer-394713.appspot.com/footer/c2c_footer_linkedin.png" alt="LinkedIn" style="width: 28px; height: 28px; display: inline-block" />
          </a>
        </div>

        <p style="margin: 0 0 12px; font-size: 12px; color: #9ca3af">© <%= currentYear %> CVtoCAREER. All rights reserved.</p>

        <div style="margin: 8px 0">
          <a href="<%= frontendUrl %>/dashboard/account?run=unsubscribe" style="color: #9ca3af; text-decoration: none; font-size: 11px; margin: 0 8px">Unsubscribe</a>
          <span style="color: #d1d5db">|</span>
          <a href="<%= frontendUrl %>/privacy-policy" style="color: #9ca3af; text-decoration: none; font-size: 11px; margin: 0 8px">Privacy Policy</a>
          <span style="color: #d1d5db">|</span>
          <a href="<%= frontendUrl %>" style="color: #9ca3af; text-decoration: none; font-size: 11px; margin: 0 8px">Website</a>
        </div>
      </div>
    </div>
  </body>
</html>`;

const ADMIN_BODY = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 40px; color: #333">
    <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08)">
      <!-- Header -->
      <div style="background-color: #004174; padding: 28px 32px; text-align: center">
        <div style="background-color: #ffffff; display: inline-block; padding: 8px 20px; border-radius: 8px; margin-bottom: 16px">
          <img src="${LOGO_URL}" alt="CVtoCAREER Logo" style="display: block; width: 149px; height: 32px" />
        </div>
        <h1 style="margin: 0; color: #fff; font-size: 22px">Team notification</h1>
      </div>

      <!-- Body -->
      <div style="padding: 28px 32px">
        <p style="margin: 0 0 16px"><strong>Dear Team,</strong></p>

        <p style="margin: 0 0 16px">
          Write your message here — click a variable chip above to insert details like the triggering
          user.
        </p>

        <!-- Details box -->
        <p style="margin: 24px 0 8px; font-size: 14px; font-weight: 600; color: #004174">📋 Details</p>
        <div style="background-color: #f0f7fc; border-left: 4px solid #004174; padding: 16px; border-radius: 4px; margin: 0 0 20px">
          <p style="margin: 0 0 8px; font-size: 14px"><strong>Field one:</strong> value</p>
          <p style="margin: 0; font-size: 14px"><strong>Field two:</strong> value</p>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 28px 0 24px 0">
          <a
            href="#"
            style="background-color: #004174; color: #fff; text-decoration: none; font-weight: bold; padding: 12px 32px; border-radius: 6px; display: inline-block; font-size: 15px"
            >View in Dashboard →</a
          >
        </div>

        <p style="margin: 24px 0 0 0">
          Best regards,<br />
          <strong>The CVtoCAREER System</strong>
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center">
        <p style="margin: 0; font-size: 12px; color: #9ca3af">© <%= currentYear %> CVtoCAREER. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`;

export const EMAIL_SKELETONS: Record<EmailTemplateType, { body: string; variables: string[] }> = {
  customer: {
    body: CUSTOMER_BODY,
    variables: ["name", "frontendUrl", "currentYear"],
  },
  admin: {
    body: ADMIN_BODY,
    variables: ["currentYear"],
  },
};
