import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  async sendMagicLink(email: string, link: string) {
    console.log(`[MagicLogin] ${email}: ${link}`);

    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM?.trim();

    if (!host || !from || !user || !pass) {
      console.warn('[MagicLogin] SMTP env missing, email not sent');
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Your Fairwayd login link',
      text: [
        'Sign in to Fairwayd with this link:',
        '',
        link,
        '',
        'This link expires in 15 minutes and can only be used once.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Sign in to Fairwayd</h2>
          <p>Use this secure link to sign in:</p>
          <p>
            <a href="${link}" style="font-weight: bold;">
              Sign in to Fairwayd
            </a>
          </p>
          <p>This link expires in 15 minutes and can only be used once.</p>
        </div>
      `,
    });
  }
}
