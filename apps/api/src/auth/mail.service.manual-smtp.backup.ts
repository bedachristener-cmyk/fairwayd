import { Injectable } from '@nestjs/common';
import { Socket } from 'node:net';
import { TLSSocket, connect as tlsConnect } from 'node:tls';

@Injectable()
export class MailService {
  async sendMagicLink(email: string, link: string) {
    console.log(`[MagicLogin] ${email}: ${link}`);

    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const from = process.env.SMTP_FROM?.trim();

    if (!host || !from) {
      return;
    }

    await this.sendSmtp({
      host,
      port,
      user: process.env.SMTP_USER?.trim() || '',
      pass: process.env.SMTP_PASS || '',
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
    });
  }

  private async sendSmtp(message: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    to: string;
    subject: string;
    text: string;
  }) {
    let socket: Socket | TLSSocket =
      message.port === 465
        ? tlsConnect({ host: message.host, port: message.port })
        : new Socket().connect(message.port, message.host);

    const read = this.createReader(socket);
    await read();

    await this.write(socket, `EHLO fairwayd.local\r\n`);
    await read();

    if (message.port !== 465) {
      await this.write(socket, `STARTTLS\r\n`);
      await read();
      socket = tlsConnect({ socket, servername: message.host });
      await this.write(socket, `EHLO fairwayd.local\r\n`);
      await read();
    }

    if (message.user && message.pass) {
      await this.write(socket, `AUTH LOGIN\r\n`);
      await read();
      await this.write(
        socket,
        `${Buffer.from(message.user).toString('base64')}\r\n`,
      );
      await read();
      await this.write(
        socket,
        `${Buffer.from(message.pass).toString('base64')}\r\n`,
      );
      await read();
    }

    await this.write(socket, `MAIL FROM:<${message.from}>\r\n`);
    await read();
    await this.write(socket, `RCPT TO:<${message.to}>\r\n`);
    await read();
    await this.write(socket, `DATA\r\n`);
    await read();

    const body = [
      `From: ${message.from}`,
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      message.text,
      '.',
      '',
    ].join('\r\n');

    await this.write(socket, body);
    await read();
    await this.write(socket, `QUIT\r\n`);
    socket.end();
  }

  private createReader(socket: Socket | TLSSocket) {
    return () =>
      new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error('SMTP read timeout'));
        }, 10000);

        const cleanup = () => {
          clearTimeout(timer);
          socket.off('data', onData);
          socket.off('error', onError);
        };

        const onData = (data: Buffer) => {
          const text = data.toString('utf8');
          if (/^\d{3}[ -]/m.test(text)) {
            cleanup();
            resolve(text);
          }
        };

        const onError = (err: Error) => {
          cleanup();
          reject(err);
        };

        socket.on('data', onData);
        socket.on('error', onError);
      });
  }

  private write(socket: Socket | TLSSocket, data: string) {
    return new Promise<void>((resolve, reject) => {
      socket.write(data, (err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
