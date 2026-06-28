/**
 * ForgeQuest Automated Email Delivery Service
 * Sends blueprint download links and account credentials upon payment confirmation.
 * Uses nodemailer with configurable SMTP (dev mode: logs to console).
 */
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// In-memory fallback for demo/dev mode when SMTP isn't configured
let sentEmails = [];

/**
 * Create a nodemailer transporter.
 * Falls back to a mock transporter in dev/demo mode.
 */
function createTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  
  // If using the default demo Ethereal email, create a real test account
  if (smtpHost === 'smtp.ethereal.email') {
    // Ethereal is a fake SMTP service for development
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Production SMTP
  if (smtpHost && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Mock transporter for demo mode
  return {
    sendMail: async (mailOptions) => {
      const email = {
        ...mailOptions,
        sentAt: new Date().toISOString(),
        demo: true
      };
      sentEmails.push(email);
      console.log(`[EMAIL-MOCK] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
      return { messageId: `mock-${Date.now()}@forgequest.io`, accepted: [mailOptions.to] };
    }
  };
}

const transporter = createTransporter();

/**
 * Send a blueprint download link email.
 */
async function sendBlueprintDelivery(customerEmail, customerName, blueprintName, downloadUrl) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #ff6b35;">ForgeQuest</h1>
        <p style="color: #666;">Digital Factory — Blueprint Delivery</p>
      </div>
      <h2 style="color: #333;">Your Blueprint is Ready!</h2>
      <p>Hello ${customerName || 'Valued Customer'},</p>
      <p>Thank you for your purchase of <strong>${blueprintName}</strong>.</p>
      <p>Your blueprint is ready for download. Click the button below to access it:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${downloadUrl}" 
           style="background-color: #ff6b35; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
          Download Blueprint
        </a>
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        This link is uniquely generated for your purchase and will expire in 7 days.
        If you did not make this purchase, please contact us immediately.
      </p>
      <hr style="border: none; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px;">ForgeQuest Digital Factory | forgequest.io</p>
    </div>
  `;

  return transporter.sendMail({
    from: `"ForgeQuest" <${process.env.EMAIL_FROM || 'noreply@forgequest.io'}>`,
    to: customerEmail,
    subject: `📦 Your ${blueprintName} Blueprint is Ready!`,
    html
  });
}

/**
 * Send account credentials email.
 */
async function sendAccountDelivery(customerEmail, customerName, accountName, credentials, statsSummary) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #ff6b35;">ForgeQuest</h1>
        <p style="color: #666;">Digital Factory — Account Delivery</p>
      </div>
      <h2 style="color: #333;">Your Account Has Arrived!</h2>
      <p>Hello ${customerName || 'Valued Customer'},</p>
      <p>Your ordered account <strong>${accountName}</strong> is ready for access.</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">Account Credentials</h3>
        <pre style="background: #fff; padding: 12px; border-radius: 4px; border: 1px solid #ddd; white-space: pre-wrap; word-break: break-all;">${credentials}</pre>
      </div>
      ${statsSummary ? `
      <div style="background-color: #f0f8ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <h3 style="color: #333; margin-top: 0;">Stats Milestones</h3>
        <p>${statsSummary}</p>
      </div>
      ` : ''}
      <div style="background-color: #fff3cd; padding: 12px; border-radius: 6px; margin: 15px 0;">
        <p style="margin: 0; color: #856404;">
          <strong>⚠️ Important:</strong> Change the password immediately upon first login.
          Never share these credentials with anyone.
        </p>
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        If you did not make this purchase, please contact us immediately.
      </p>
      <hr style="border: none; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px;">ForgeQuest Digital Factory | forgequest.io</p>
    </div>
  `;

  return transporter.sendMail({
    from: `"ForgeQuest" <${process.env.EMAIL_FROM || 'noreply@forgequest.io'}>`,
    to: customerEmail,
    subject: `🔑 Your ${accountName} Account is Ready!`,
    html
  });
}

/**
 * Get sent emails (for mock/demo mode).
 */
function getSentEmails() {
  return sentEmails;
}

module.exports = {
  sendBlueprintDelivery,
  sendAccountDelivery,
  getSentEmails,
  transporter
};