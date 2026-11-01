import nodemailer from 'nodemailer';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

function missingSmtpSettings() {
  return ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((name) => !process.env[name]);
}

export async function sendSignupOtpEmail({ email, username, code }) {
  const transporter = createTransporter();
  if (!transporter) {
    const missing = missingSmtpSettings().join(', ');
    return { success: false, error: `Email delivery is not configured. Missing ${missing} in server/.env.` };
  }
  const safeName = escapeHtml(username || 'Coder');
  const safeCode = escapeHtml(code);
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"CodeClash" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify your CodeClash email address',
      text: `Hi ${username || 'Coder'}, your CodeClash verification code is ${code}. It expires in 10 minutes.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;background:#161b22;color:#fff;border-radius:16px"><h1 style="color:#f59e0b">Verify your email</h1><p>Hi ${safeName},</p><p>Use this code to finish creating your CodeClash account:</p><p style="font-size:32px;letter-spacing:8px;font-weight:800;color:#f59e0b">${safeCode}</p><p style="color:#9ca3af">This code expires in 10 minutes. Do not share it with anyone.</p></div>`
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Email Service] Failed to send signup OTP:', err.message);
    return { success: false, error: 'Unable to send the verification email. Please try again later.' };
  }
}

export async function sendInterviewInvitationEmail({
  candidateEmail,
  candidateName,
  interviewerName,
  scheduledTime,
  roomId,
  problemTitle,
  notes
}) {
  const appUrl = (process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const joinUrl = `${appUrl}/?interview=${encodeURIComponent(roomId)}&role=candidate`;
  const formattedDate = new Date(scheduledTime).toLocaleString([], {
    dateStyle: 'full',
    timeStyle: 'short'
  });
  const subject = `Technical Interview Invitation: CodeClash with ${interviewerName}`;
  const safeCandidateName = escapeHtml(candidateName || 'Candidate');
  const safeInterviewerName = escapeHtml(interviewerName);
  const safeProblemTitle = escapeHtml(problemTitle || 'Algorithmic Problem Solving');
  const safeRoomId = escapeHtml(roomId);
  const safeNotes = escapeHtml(notes);
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; border: 1px solid #30363d; border-radius: 16px; overflow: hidden; padding: 28px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #f59e0b; font-size: 24px; margin: 0; font-weight: 800;">CodeClash Technical Interview</h1>
        <p style="color: #8b949e; font-size: 13px; margin-top: 6px;">Live Coding, System Architecture & Technical Evaluation</p>
      </div>
      <div style="background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; font-size: 15px; color: #ffffff;">Hello <strong>${safeCandidateName}</strong>,</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #8b949e; line-height: 1.5;"><strong>${safeInterviewerName}</strong> has scheduled a live technical interview session with you on CodeClash.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #c9d1d9;">
          <tr><td style="padding: 8px 0; color: #8b949e; width: 130px;">Scheduled Date:</td><td style="padding: 8px 0; font-weight: bold; color: #38bdf8;">${formattedDate}</td></tr>
          <tr><td style="padding: 8px 0; color: #8b949e;">Initial Topic:</td><td style="padding: 8px 0; font-weight: bold; color: #f59e0b;">${safeProblemTitle}</td></tr>
          <tr><td style="padding: 8px 0; color: #8b949e;">Room ID:</td><td style="padding: 8px 0; font-family: monospace; font-size: 14px; color: #10b981;">${safeRoomId}</td></tr>
          ${notes ? `<tr><td style="padding: 8px 0; color: #8b949e;">Notes:</td><td style="padding: 8px 0;">${safeNotes}</td></tr>` : ''}
        </table>
      </div>
      <div style="text-align: center; margin: 32px 0 24px;"><a href="${joinUrl}" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; padding: 14px 28px; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 12px; display: inline-block;">Join Interview Room</a></div>
      <div style="background: #161b22; border-left: 3px solid #38bdf8; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #8b949e; line-height: 1.5;"><strong>Preparation:</strong> Please use a modern browser, grant camera and microphone permission, and join from a secure HTTPS connection.</div>
    </div>
  `;

  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return {
        success: false,
        error: 'Email delivery is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in server/.env.'
      };
    }
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"CodeClash Interviews" <${process.env.SMTP_USER}>`,
      to: candidateEmail,
      subject,
      html,
      text: `Hello ${candidateName || 'Candidate'},\n\n${interviewerName} has scheduled a CodeClash technical interview.\n\nScheduled: ${formattedDate}\nTopic: ${problemTitle || 'Algorithmic Problem Solving'}\nRoom ID: ${roomId}\nJoin: ${joinUrl}${notes ? `\nNotes: ${notes}` : ''}`
    });
    console.log(`[Email Service] Sent interview email to ${candidateEmail}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Email Service] Failed to send email:', err.message);
    return { success: false, error: err.message };
  }
}
