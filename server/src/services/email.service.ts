import nodemailer, { Transporter } from 'nodemailer';

/**
 * ============================================================================
 * Email Service (Nodemailer Implementation)
 * ============================================================================
 * Handles transactional email delivery for email verification and auth workflows.
 */

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | false;
  error?: string;
}

let transporterInstance: Transporter | null = null;

/**
 * Creates or retrieves the cached Nodemailer transporter instance.
 * Gracefully falls back to a JSON / Test transporter in dev/test when SMTP is unconfigured.
 */
export function getEmailTransporter(): Transporter {
  if (transporterInstance) {
    return transporterInstance;
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });
  } else {
    // Development & Test fallback: JSON/Stream transport captures messages reliably without external network
    transporterInstance = nodemailer.createTransport({
      jsonTransport: true
    });
  }

  return transporterInstance;
}

/**
 * Allows overriding or resetting the transporter (useful for unit tests and mocks).
 */
export function setEmailTransporter(transporter: Transporter | null): void {
  transporterInstance = transporter;
}

/**
 * Sends a one-time 4-digit verification code email using Nodemailer.
 */
export async function sendVerificationEmail(
  toEmail: string,
  verificationCode: string
): Promise<SendEmailResult> {
  try {
    const transporter = getEmailTransporter();
    const fromAddress = process.env.SMTP_FROM || '"Rota Workforce" <no-reply@rota.app>';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Rota Verification Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0e12; color: #f1f3f5; margin: 0; padding: 24px; }
    .container { max-width: 480px; margin: 0 auto; background-color: #161a22; border-radius: 12px; border: 1px solid #232833; padding: 32px; }
    .header { text-align: center; margin-bottom: 24px; }
    .brand { font-size: 24px; font-weight: 700; color: #4361ee; letter-spacing: -0.5px; }
    .title { font-size: 18px; font-weight: 600; margin-top: 8px; color: #ffffff; }
    .text { font-size: 14px; line-height: 1.6; color: #9aa0a6; margin: 16px 0; }
    .code-box { text-align: center; margin: 28px 0; background: #1c212c; border: 2px dashed #4361ee; border-radius: 8px; padding: 20px; }
    .code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4cc9f0; font-family: 'Courier New', Courier, monospace; }
    .footer { font-size: 12px; color: #606770; text-align: center; margin-top: 32px; border-top: 1px solid #232833; padding-top: 16px; }
    .badge { display: inline-block; background-color: #1e293b; color: #94a3b8; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 4px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">ROTA</div>
      <div class="title">Verify Your Email Address</div>
    </div>
    <p class="text">
      Please enter the following four-digit verification code in the Rota app to verify your email address:
    </p>
    <div class="code-box">
      <div class="code">${verificationCode}</div>
      <div class="badge">SINGLE-USE CODE • EXPIRES IN 10 MINUTES</div>
    </div>
    <p class="text">
      This code is for one-time verification. For your security, never share this code with anyone.
    </p>
    <div class="footer">
      If you did not request this email, you can safely ignore it. Your account security remains intact.<br>
      &copy; ${new Date().getFullYear()} Rota Workforce Coordination. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
ROTA EMAIL VERIFICATION

Your one-time four-digit verification code is: ${verificationCode}

This code is valid for 10 minutes and can only be used once.
If you did not request this verification, please disregard this email.
    `.trim();

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `Your Rota Verification Code: ${verificationCode}`,
      text: textContent,
      html: htmlContent
    });

    const preview = nodemailer.getTestMessageUrl(info);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: preview
    };
  } catch (error) {
    const err = error as Error;
    console.error('[EmailService] Failed to send verification email:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

// In-memory set tracking sent welcome emails to prevent duplicates
const welcomeEmailsSent = new Set<string>();

/**
 * Checks whether a welcome email has already been sent to an email address.
 */
export function isWelcomeEmailSent(email: string): boolean {
  return welcomeEmailsSent.has(email.toLowerCase().trim());
}

/**
 * Sends a rich, branded welcome email to a user once their account has been created
 * and verified on the server.
 *
 * @param toEmail The destination email address
 * @param fullName The user's full or first name
 * @param role Optional role (OWNER, MANAGER, STAFF)
 * @param teamName Optional team or workspace name
 * @param force If true, sends even if previously marked as sent
 */
export async function sendWelcomeEmail(
  toEmail: string,
  fullName: string,
  role?: string,
  teamName?: string,
  force: boolean = false
): Promise<SendEmailResult> {
  const normalizedEmail = toEmail.toLowerCase().trim();

  if (!force && welcomeEmailsSent.has(normalizedEmail)) {
    return {
      success: true,
      messageId: 'already-sent-cached'
    };
  }

  try {
    const transporter = getEmailTransporter();
    const fromAddress = process.env.SMTP_FROM || '"Rota Workforce" <no-reply@rota.app>';
    const words = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = words[0] || fullName.trim() || 'there';
    const roleTitle = role
      ? role.toUpperCase() === 'OWNER'
        ? 'Workspace Owner'
        : role.toUpperCase() === 'MANAGER'
        ? 'Manager'
        : 'Team Member'
      : 'Team Member';
    const workspaceName = teamName || 'Rota Workspace';

    const subject = `Welcome to Rota, ${firstName}! Your scheduling workspace is ready 🚀`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Rota</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0e12; color: #f1f3f5; margin: 0; padding: 24px; }
    .container { max-width: 540px; margin: 0 auto; background-color: #161a22; border-radius: 16px; border: 1px solid #232833; padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { text-align: center; margin-bottom: 28px; }
    .brand-badge { display: inline-block; background: linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%); color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 2px; padding: 10px 24px; border-radius: 10px; margin-bottom: 16px; }
    .title { font-size: 24px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0; letter-spacing: -0.5px; }
    .subtitle { font-size: 14px; color: #94a3b8; margin: 0; }
    .status-pill { display: inline-block; background-color: #064e3b; color: #34d399; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 20px; border: 1px solid #059669; margin: 18px 0 24px 0; }
    .hero-text { font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
    .card { background-color: #1c212c; border: 1px solid #2a3140; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .card-title { font-size: 13px; font-weight: 700; color: #4cc9f0; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
    .feature-item { display: flex; align-items: flex-start; margin-bottom: 14px; }
    .feature-item:last-child { margin-bottom: 0; }
    .feature-icon { font-size: 18px; margin-right: 12px; line-height: 1.4; }
    .feature-text { font-size: 13.5px; line-height: 1.5; color: #94a3b8; }
    .feature-text strong { color: #f1f5f9; }
    .cta-container { text-align: center; margin: 32px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #4361ee 0%, #3b82f6 100%); color: #ffffff !important; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(67, 97, 238, 0.4); }
    .tip-box { background-color: #1e1b4b; border-left: 4px solid #6366f1; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px; }
    .tip-text { font-size: 13px; color: #c7d2fe; line-height: 1.5; margin: 0; }
    .footer { font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #232833; padding-top: 24px; line-height: 1.6; }
    .footer a { color: #4361ee; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-badge">ROTA</div>
      <h1 class="title">Welcome to Rota, ${firstName}!</h1>
      <p class="subtitle">Mobile-First Shift Scheduling & Workforce Coordination</p>
      <div>
        <span class="status-pill">&#10003; ACCOUNT CREATED &amp; VERIFIED</span>
      </div>
    </div>

    <p class="hero-text">
      We are thrilled to have you on board! Your account (<strong>${toEmail}</strong>) has been successfully created and verified on our server as a <strong>${roleTitle}</strong> in <strong>${workspaceName}</strong>. You're ready to experience fast, frictionless workforce scheduling.
    </p>

    <div class="card">
      <div class="card-title">What You Can Do with Rota</div>
      <div class="feature-item">
        <span class="feature-icon">&#128197;</span>
        <div class="feature-text">
          <strong>Conflict-Free Rostering:</strong> View and manage shifts with automatic overlap detection and instant roster updates.
        </div>
      </div>
      <div class="feature-item">
        <span class="feature-icon">&#128257;</span>
        <div class="feature-text">
          <strong>Atomic Shift Swaps:</strong> Trade shifts or claim open hours with peer consent and manager approval workflows.
        </div>
      </div>
      <div class="feature-item">
        <span class="feature-icon">&#128277;</span>
        <div class="feature-text">
          <strong>Smart Quiet Hours:</strong> Suppress non-urgent notifications during your sleep hours and receive a clean morning digest at 07:00 AM.
        </div>
      </div>
      <div class="feature-item">
        <span class="feature-icon">&#128241;</span>
        <div class="feature-text">
          <strong>Mobile &amp; Offline Resilience:</strong> Check your schedule anytime, anywhere&mdash;even without an active internet connection.
        </div>
      </div>
    </div>

    <div class="tip-box">
      <p class="tip-text">
        <strong>Getting Started Tip:</strong> Open the Rota mobile app, head over to the <em>Calendar</em> tab to review your upcoming schedule, and configure your notification <em>Quiet Hours</em> in your profile settings.
      </p>
    </div>

    <div class="cta-container">
      <a href="https://rota.app" class="cta-button" target="_blank">Launch Rota App</a>
    </div>

    <div class="footer">
      If you have any questions, reply directly to this email or reach us at <a href="mailto:support@rota.app">support@rota.app</a>.<br>
      If you did not create this account, please notify our security team immediately.<br><br>
      &copy; ${new Date().getFullYear()} Rota Workforce Coordination Platform. All rights reserved.
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
WELCOME TO ROTA
Mobile-First Shift Scheduling & Workforce Coordination
-------------------------------------------------------

Hi ${firstName},

Welcome to Rota! Your account (${toEmail}) has been successfully created and verified on our servers as a ${roleTitle} in ${workspaceName}.

HERE IS WHAT YOU CAN DO WITH ROTA:
- Conflict-Free Rostering: View and manage weekly shifts with automatic overlap detection.
- Atomic Shift Swaps: Trade shifts or claim open hours with built-in peer and manager approvals.
- Smart Quiet Hours: Suppress alerts during your rest hours and receive consolidated morning digests.
- Mobile & Offline Resilience: Access your schedule anywhere, even without cellular connection.

GETTING STARTED:
Open your Rota app, review your upcoming schedule in the Calendar tab, and configure your notification Quiet Hours in Settings.

Need help? Contact our support team anytime at support@rota.app.
If you did not create this account, please disregard or report to support@rota.app.

© ${new Date().getFullYear()} Rota Workforce Coordination. All rights reserved.
    `.trim();

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent
    });

    const preview = nodemailer.getTestMessageUrl(info);
    welcomeEmailsSent.add(normalizedEmail);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: preview
    };
  } catch (error) {
    const err = error as Error;
    console.error('[EmailService] Failed to send welcome email:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Helper to reset welcome email tracking state in test suites.
 */
export function _clearWelcomeEmailsForTesting(): void {
  welcomeEmailsSent.clear();
}

