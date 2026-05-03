import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendMagicLink(email: string, link: string) {
    const from =
      process.env.EMAIL_FROM?.trim() ||
      process.env.SMTP_FROM?.trim() ||
      'Fairwayd <noreply@fairwayd.ch>';

    const result = await this.resend.emails.send({
      from,
      to: email,
      subject: 'Your Fairwayd login link',
      html: `
  <div style="font-family: Arial, sans-serif; line-height: 1.5; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827;">
    
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 28px;">
      <img 
        src="https://fairwayd-git-stage-bedachristener-cmyks-projects.vercel.app/logo.png" 
        alt="Fairwayd" 
        style="width:42px;height:42px;border-radius:10px;"
      />
      <div style="font-size:22px;font-weight:700;">
        Fairwayd
      </div>
    </div>

    <h2 style="font-size:22px;margin:0 0 12px 0;">
      Login to Fairwayd
    </h2>

    <p style="font-size:15px;margin:0 0 20px 0;color:#374151;">
      Click the button below to sign in. This login link is valid for 15 minutes.
    </p>

    <p style="margin:0 0 24px 0;">
      <a href="${link}" 
         style="display:inline-block;padding:12px 18px;border-radius:999px;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;">
        Sign in to Fairwayd
      </a>
    </p>

    <p style="font-size:13px;color:#6b7280;margin:0 0 8px 0;">
      If the button does not work, copy this link:
    </p>

    <p style="font-size:13px;word-break:break-all;margin:0;color:#374151;">
      ${link}
    </p>

  </div>
`,
    });

    return result;
  }
}
