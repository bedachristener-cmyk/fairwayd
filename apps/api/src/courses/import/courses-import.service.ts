import { Injectable, BadRequestException } from "@nestjs/common";
import * as XLSX from "xlsx";
import { PrismaService } from "../../prisma/prisma.service";

type Country = "CH" | "DE" | "AT";

function normalizeSheetToCountry(sheetName: string): Country | null {
  const s = (sheetName || "").trim().toUpperCase();
  if (s === "CH" || s.includes("SCHWEIZ")) return "CH";
  if (s === "DE" || s.includes("DEUTSCHLAND") || s.includes("GERMANY")) return "DE";
  if (s === "AT" || s.includes("AUSTRIA") || s.includes("OESTERREICH") || s.includes("ÖSTERREICH")) return "AT";
  return null;
}

function toNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toStringOrNull(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

@Injectable()
export class CoursesImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importXlsx(buffer: Buffer) {
    const wb = XLSX.read(buffer, { type: "buffer" });

    let total = 0;
    let created = 0;
    let skipped = 0;
    let updated = 0;
    const errors: Array<{ sheet: string; row: number; reason: string }> = [];

    let processedSheets = 0;

    for (const sheetName of wb.SheetNames) {
      const country = normalizeSheetToCountry(sheetName);
      if (!country) continue;

      processedSheets++;
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        total++;

        const name = toStringOrNull(r["Name"] ?? r["name"]);
        const city = toStringOrNull(r["Ort"] ?? r["City"] ?? r["city"]);
        const postalCode = toStringOrNull(r["PLZ"] ?? r["PostalCode"] ?? r["postalCode"]);
        const region = toStringOrNull(r["Kanton"] ?? r["Region"] ?? r["region"]);
        const lat = toNumber(r["Lat"] ?? r["lat"]);
        const lon = toNumber(r["Lon"] ?? r["lon"]);

        if (!name || lat === null || lon === null) {
          skipped++;
          errors.push({ sheet: sheetName, row: i + 2, reason: "Missing required fields (Name, Lat, Lon)" });
          continue;
        }


        try {
          // ✅ Kein findUnique mit composite key -> findFirst ist immer gültig
          const existing = await this.prisma.course.findFirst({
            where: { country, name, lat, lon },
            select: { id: true },
          });

          if (!existing) {
            await this.prisma.course.create({
              data: {
                country,
                name,
                city,
                region,
                lat,
                lon,

                // ✅ PLZ: passe NUR diese eine Zeile an (siehe unten)
                // z.B. wenn dein Feld "plz" heisst:
                // plz: postalCode,
              } as any,
            });
            created++;
          } else {
            await this.prisma.course.update({
              where: { id: existing.id },
              data: {
                city,
                region,

                // ✅ PLZ: passe NUR diese eine Zeile an (siehe unten)
                // plz: postalCode,
              } as any,
            });
            updated++;
          }
        } catch (e: any) {
          skipped++;
          errors.push({ sheet: sheetName, row: i + 2, reason: e?.message ?? "Unknown error" });
        }

      }
    }

    if (processedSheets === 0) {
      throw new BadRequestException('No importable sheets found. Expected sheets like "CH", "DE", "AT".');
    }

    return { total, created, updated, skipped, errors: errors.slice(0, 50) };
  }
}
