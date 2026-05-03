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
  <div style="font-family: Arial, sans-serif; line-height: 1.5; text-align:center;">
    
    <img 
      src="https://fairwayd-git-stage-bedachristener-cmyks-projects.vercel.app/logo.png" 
      alt="Fairwayd" 
      style="width:80px;height:auto;margin-bottom:20px;"
    />

    <h2>Login to Fairwayd</h2>

    <p>Click the button below to sign in:</p>

    <p>
      <a href="${link}" 
         style="display:inline-block;padding:12px 18px;border-radius:8px;background:#111827;color:#ffffff;text-decoration:none;">
        Sign in to Fairwayd
      </a>
    </p>

    <p>If the button does not work, copy this link:</p>
    <p style="word-break:break-all;">${link}</p>

  </div>
`,
    });

    return result;
  }
}
