export function escapeEmailText(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
}

export function notificationWebUrl() {
  const raw = process.env.FRONTEND_URL?.trim() || process.env.WEB_URL?.trim();
  if (!raw) throw new Error('FRONTEND_URL is required for notification emails');
  // Match the existing authentication URL normalization, including legacy
  // host-only values and accidentally repeated HTTP prefixes.
  const normalized = raw.replace(/^https?:\/\/https?:\/\//i, 'https://');
  if (/^[a-z][a-z\d+.-]*:/i.test(normalized) && !/^https?:\/\//i.test(normalized)) {
    throw new Error('Invalid notification frontend URL');
  }
  const url = new URL(/^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`);
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error('Invalid notification frontend URL');
  }
  return url.origin;
}

export function renderActivityEmail(input: {
  name: string;
  title: string;
  body: string;
  link: string;
  baseUrl: string;
  showAction?: boolean;
}) {
  // Notification links must stay inside this environment's app.
  const base = new URL(input.baseUrl).origin;
  const destination = new URL(
    input.link.startsWith('/') && !input.link.startsWith('//')
      ? input.link
      : '/notifications',
    base,
  );
  if (destination.origin !== base) throw new Error('Invalid notification link');
  const settings = `${base}/privacy-security#email-notifications`;
  const e = escapeEmailText;
  const text = `Hi ${input.name},\n\n${input.title}\n${input.body}\n\n${input.showAction === false ? '' : `Open Fairwayd: ${destination.href}\n\n`}Manage email notifications: ${settings}`;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;background:#f5f3ee;color:#22332c;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:28px 12px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:auto;background:#fff;border:1px solid #e5e1d8;border-radius:18px">
  <tr><td style="padding:28px 28px 20px;border-bottom:1px solid #ede7db"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="padding-right:14px"><img src="${e(base)}/logo.png" width="48" height="48" alt="Fairwayd logo" style="display:block;border:0;border-radius:10px"></td><td style="font-size:29px;font-weight:bold;color:#214b38">Fairwayd</td></tr></table><div style="font-size:12px;letter-spacing:1px;color:#805c18;margin-top:6px">DISCOVER. PLAN. CONNECT.</div></td></tr>
  <tr><td style="padding:28px"><p style="margin:0 0 18px;font-size:15px">Hi ${e(input.name)},</p><h1 style="font-size:24px;line-height:1.3;margin:0 0 14px">${e(input.title)}</h1>
  <p style="font-size:16px;line-height:1.6;margin:0 0 26px;color:#53625b">${e(input.body)}</p>
  ${input.showAction === false ? '' : `  <a href="${e(destination.href)}" style="display:inline-block;background:#f5ecdc;border:1px solid #b69050;border-radius:24px;padding:13px 22px;color:#735018;text-decoration:none;font-size:15px;font-weight:bold">Open Fairwayd</a>
  <p style="font-size:12px;line-height:1.5;margin:24px 0 0;color:#64736d">If the button does not work:<br><a href="${e(destination.href)}" style="color:#735018;word-break:break-all">${e(destination.href)}</a></p>`}</td></tr>
  <tr><td style="padding:20px 28px;border-top:1px solid #ede7db;font-size:12px;line-height:1.6;color:#64736d">You received this activity notification because it is enabled in your Fairwayd account.<br><a href="${e(settings)}" style="color:#735018">Manage email notifications</a></td></tr>
  </table></td></tr></table></body></html>`;
  return { html, text };
}
