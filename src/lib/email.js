import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const commonStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;600;700&display=swap');
  body { font-family: 'Google Sans Flex', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 0; }
  .wrapper { width: 100%; table-layout: fixed; background: #000000; background: radial-gradient(circle at center, #1a1a1a 0%, #000000 100%); padding-bottom: 40px; }
  .content { max-width: 600px; margin: 0 auto; background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; overflow: hidden; backdrop-filter: blur(10px); }
  .header { padding: 40px 30px 20px; text-align: center; }
  .header h1 { margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
  .body { padding: 20px 40px 40px; text-align: center; }
  .text { font-size: 16px; line-height: 1.6; color: #cccccc; margin-bottom: 30px; font-weight: 400; }
  .button { display: inline-block; background-color: #ffffff; color: #000000 !important; padding: 16px 40px; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 16px; transition: all 0.2s; margin: 10px 0; letter-spacing: 0.5px; }
  .button:hover { background-color: #e0e0e0; transform: translateY(-1px); }
  .otp-box { background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 24px; margin: 30px 0; display: inline-block; min-width: 200px; }
  .otp-code { font-family: 'Google Sans Mono', monospace; font-size: 42px; font-weight: 700; color: #ffffff; letter-spacing: 12px; line-height: 1; }
  .footer { padding: 30px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid rgba(255, 255, 255, 0.05); }
  .highlight { color: #ffffff; font-weight: 600; text-decoration: underline; text-decoration-color: rgba(255, 255, 255, 0.3); }
  .logo-text { font-weight: 800; letter-spacing: 2px; font-size: 14px; color: #666; margin-bottom: 20px; text-transform: uppercase; }
`;

export async function sendOTPEmail(email, otp, type, magicLink) {
  const subject =
    type === "signup"
      ? "Verify your email for Autumn Spires"
      : "Login to Autumn Spires";

  const title = type === "signup" ? "Verify Your Email" : "Welcome Back";
  const message =
    type === "signup"
      ? "Thanks for joining Autumn Spires. Please verify your email to continue."
      : "Click the button below to sign in to your account.";
  const buttonText = type === "signup" ? "Verify Email" : "Sign In";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="wrapper">
        <br><br>
        <div class="content">
          <div class="header">
            <div class="logo-text">Autumn Spires</div>
            <h1>${title}</h1>
          </div>
          <div class="body">
            <p class="text">${message}</p>
            
            <a href="${magicLink}" class="button">${buttonText}</a>
            
            <div style="margin: 40px 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);"></div>
            
            <p class="text" style="font-size: 14px; margin-bottom: 15px; color: #888;">Or use this code:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p style="font-size: 12px; color: #555; margin-top: 20px;">Expires in 10 minutes</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Autumn Spires</p>
          </div>
        </div>
        <br><br>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    html,
  });
}

export async function sendInviteEmail(
  inviteeEmail,
  inviterUsername,
  signupLink
) {
  const subject = `${inviterUsername} invited you to Autumn Spires`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="wrapper">
        <br><br>
        <div class="content">
          <div class="header">
            <div class="logo-text">Autumn Spires</div>
            <h1>You're Invited</h1>
          </div>
          <div class="body">
            <p class="text">
              <span class="highlight">${inviterUsername}</span> has invited you to join.
            </p>
            <p class="text">
              Connect, share, and build communities with us.
            </p>
            
            <a href="${signupLink}" class="button">Accept Invitation</a>
            
            <p style="font-size: 13px; color: #666; margin-top: 40px;">
              You'll be automatically connected with ${inviterUsername}.
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Autumn Spires</p>
          </div>
        </div>
        <br><br>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: inviteeEmail,
    subject,
    html,
  });
}
