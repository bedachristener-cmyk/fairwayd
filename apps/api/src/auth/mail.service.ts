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
      <meta name="color-scheme" content="dark light">
      <meta name="supported-color-schemes" content="dark light">

    <div style="background:#0f172a;padding:28px;">
    <div style="font-family: Arial, sans-serif; line-height:1.5; max-width:560px; margin:0 auto; padding:28px; background:#111827; color:#f9fafb; border-radius:18px; border:1px solid #1f2937;">

      <div style="padding-bottom:20px; border-bottom:1px solid #374151; margin-bottom:30px;">
  <div style="display:flex; align-items:flex-end;">
    
   <img 
  src="https://fairwayd-git-stage-bedachristener-cmyks-projects.vercel.app/logo.png" 
  alt="Fairwayd" 
  style="width:52px;height:52px;border-radius:13px;margin-right:18px;"
/>

    <div style="font-size:28px;font-weight:700;line-height:1;color:#f9fafb;letter-spacing:-0.4px;">
      Fairwayd
    </div>

  </div>
</div>

      <h2 style="font-size:22px;margin:0 0 12px 0;color:#f9fafb;">
        Login to Fairwayd
      </h2>

      <p style="font-size:15px;margin:0 0 22px 0;color:#d1d5db;">
        Click the button below to sign in. This login link is valid for 15 minutes.
      </p>

      <p style="margin:0 0 26px 0;">
        <a href="${link}" 
           style="display:inline-block;padding:12px 20px;border-radius:999px;background:#8bd450;color:#0f172a;text-decoration:none;font-weight:700;">
          Sign in to Fairwayd
        </a>
      </p>

      <p style="font-size:13px;color:#9ca3af;margin:0 0 8px 0;">
        If the button does not work, copy this link:
      </p>

      <p style="font-size:13px;word-break:break-all;margin:0;color:#d1d5db;">
        ${link}
      </p>

    </div>
  </div>
`,
    });

    return result;
  }
}
