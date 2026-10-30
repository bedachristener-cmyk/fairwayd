import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const fields = { countryCode: true, checkedOn: true, published: true, entries: true, version: true } as const;
const languages = ['en', 'de', 'fr', 'it'];
export function validateGuide(body: any) {
  if (!body || typeof body.published !== 'boolean' || !Number.isInteger(body.version) || body.version < 0 || body.version > 1000000000) throw new BadRequestException('Invalid guide version or publication status');
  if (typeof body.checkedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.checkedOn) || !Number.isFinite(Date.parse(body.checkedOn)) || new Date(body.checkedOn).toISOString().slice(0, 10) !== body.checkedOn || body.checkedOn > new Date().toISOString().slice(0, 10)) throw new BadRequestException('Use a valid verification date, not in the future');
  if (!Array.isArray(body.entries) || body.entries.length < 1 || body.entries.length > 8) throw new BadRequestException('Use between one and eight entries');
  const text = (value: any, max: number) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Translations are required');
    const result: Record<string, string> = {};
    for (const language of languages) {
      const item = value[language] ?? '';
      if (typeof item !== 'string' || item.length > max) throw new BadRequestException('Text is too long or invalid');
      result[language] = item.trim();
    }
    if (!result.en) throw new BadRequestException('English text is required; other languages are optional');
    return result;
  };
  const url = (value: any) => {
    if (typeof value !== 'string' || value.length > 1500) throw new BadRequestException('Use a valid official HTTPS link');
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname.includes('.') || parsed.hostname === 'localhost') throw new Error();
      return parsed.href;
    } catch { throw new BadRequestException('Use a valid official HTTPS link'); }
  };
  return { published: body.published, checkedOn: body.checkedOn, entries: body.entries.map((entry: any) => ({ title: text(entry?.title, 120), text: text(entry?.text, 2500), url: url(entry?.url), sourceUrl: url(entry?.sourceUrl) })) };
}

@Injectable()
export class EntryGuidesService {
  constructor(private readonly prisma: PrismaService) {}
  async list() {
    const countries = await this.prisma.destination.findMany({ where: { isActive: true }, select: { code: true } });
    return this.prisma.countryEntryGuide.findMany({ where: { published: true, countryCode: { in: countries.map(c => c.code) } }, select: fields, orderBy: { countryCode: 'asc' } });
  }
  adminGet(countryCode: string) { return this.prisma.countryEntryGuide.findUnique({ where: { countryCode: this.code(countryCode) }, select: fields }); }
  private code(value: string) {
    const code = value.toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) throw new BadRequestException('Invalid country');
    return code;
  }
  async save(country: string, body: unknown, userId: string) {
    const countryCode = this.code(country);
    const data = validateGuide(body);
    if (!await this.prisma.destination.findFirst({ where: { code: countryCode, isActive: true }, select: { code: true } })) throw new BadRequestException('Add this country to Explore first');
    const version = (body as any).version as number;
    try {
      if (!version) return await this.prisma.countryEntryGuide.create({ data: { countryCode, ...data, updatedById: userId }, select: fields });
      const changed = await this.prisma.countryEntryGuide.updateMany({ where: { countryCode, version }, data: { ...data, updatedById: userId, version: { increment: 1 } } });
      if (!changed.count) throw new ConflictException('This guide changed. Reload it before saving.');
      return this.adminGet(countryCode);
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('This guide already exists. Reload it before saving.');
      throw error;
    }
  }
}
