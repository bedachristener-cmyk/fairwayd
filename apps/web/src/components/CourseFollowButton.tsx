



Du:
Fairwayd Day 26 - wir machen weiter mit:
Backend

NestJS + Prisma 7.4.0

Railway:

fairwayd-production → Neon fairwayd_prod

fairwayd-stage → Neon fairwayd_stage

main.ts nutzt process.env.PORT

CORS erlaubt .vercel.app

Seed funktioniert (Courses sichtbar auf Map)

🔵 Frontend

Vercel:

main → Production

stage → Preview

VITE_API_BASE_URL korrekt gesetzt

Google Login funktioniert (origin_mismatch gelöst)

/courses liefert Daten

Map zeigt Marker

🗂 Aktuelle Branches
main
stage

🎯 Ziel für morgen

(z.B. eines auswählen oder neu definieren)

Map Popup UX verbessern

Feed mit Course-Kontext stabilisieren

Follow-System UI

Dev/Stage/Prod Workflow finalisieren

Auth Cleanup

Performance

Design/Branding

📎 Zusätzlich hilfreich (wenn relevant)

Nur falls wir Debugging machen:

aktueller git branch -a

aktueller git log --oneline -3

was genau du als nächstes bauen willst

🔥 Wichtig

Ab morgen geht es wieder:

Feature Development

nicht Infrastruktur-Feuer löschen 😄

Du hast das heute sauber strukturiert bekommen.
Darauf kann man jetzt aufbauen.

ChatGPT:
Perfekt, Beda — das Setup ist jetzt “stabil genug”, dass wir wirklich Features bauen koennen, ohne jedes Mal Infra zu zerlegen. Ich schlage fuer Day 26 diesen Plan vor (mit klarer Reihenfolge, damit wir nicht wieder in Firefighting rutschen).

Day 26 Fokus (mein Vorschlag)
1) Dev/Stage/Prod Workflow finalisieren (kurz, aber wichtig)
Ziel: Du hast ein 100% klares Deployment-Verhalten:

main → Production (Vercel Prod + Railway fairwayd-production + Neon fairwayd_prod)

stage → Preview (Vercel Preview + Railway fairwayd-stage + Neon fairwayd_stage)

Checkliste (sollte danach “einfach laufen”):

Railway

fairwayd-production: DATABASE_URL → prod, JWT_SECRET prod, CORS_ORIGINS inkl. vercel prod + *.vercel.app

fairwayd-stage: DATABASE_URL → stage, JWT_SECRET stage, CORS_ORIGINS inkl. *.vercel.app

Start command: prisma migrate deploy && node dist/src/main.js

process.env.PORT in main.ts ist already ok ✅

Vercel

Project Settings → Environment Variables sauber getrennt:

Production: VITE_API_BASE_URL = <prod-api-url>

Preview: VITE_API_BASE_URL = <stage-api-url>

Optional aber hilfreich: VITE_ENV_NAME=production|preview

Prisma

migrate deploy laeuft in stage und prod ohne Drift

Seeds: nur wenn du bewusst seedest (nicht automatisch bei jedem Deploy)

Wenn das steht, sind 80% Stress weg.

2) Follow-System UI (Feature-Value hoch, wenig Risiko)
Du hast Backend-seitig schon viel (Follow Requests etc.). Jetzt machen wir die UX “Facebook-like”:

Minimal-Version (MVP)

Course Page / Course Header:

Button: Follow / Following / Requested

Private Course: Follow → erzeugt Request → Status “Requested”

Screen: Follow Requests

Liste + Buttons: Approve / Reject

Feed:

optional: Filter “Following only” (spaeter)

Konkrete UI-Bausteine (Frontend)

CourseHeader.tsx (oder dort wo Course-Details sind)

FollowButton Komponente mit Zustandsautomat:

not_following

requested

following

FollowRequestsPage.tsx (hast du schon)

“Approve” / “Reject” Aktionen + optimistic UI (oder simple reload)

API Calls (Frontend)

du hast schon apps/web/src/api/followRequests.ts

wir ergaenzen konsequent:

GET /courses/:id/follow-status (oder aus /me ableiten)

POST /courses/:id/follow

POST /follow-requests/:id/approve

POST /follow-requests/:id/reject

Wenn einige Endpoints anders heissen: kein Problem — wir passen nur die Frontend-Calls an.

3) Map Popup UX verbessern (nice, aber danach)
Wenn Follow UI steht, macht Map-Popup-Tuning mehr Sinn, weil wir dort direkt “Follow” integrieren koennen.

Quick Wins

Popup nicht zu gross, aber “sauber”:

Course Name (1 Zeile)

Ort/Region

Buttons: “Open” + “Follow”

“Sticky” Popup Verhalten optional: beim Click auf Marker bleibt Selection state im App-State (nicht nur Leaflet-Popup)

Day 26 Ablauf (damit du nicht verzettelst)
Workflow finalisieren (max 30–60 Min)

Follow Button + Status (2–3h)

Follow Requests Page UX (1–2h)

Optional: Map Popup verfeinern

Praktische Git-Regeln (damit es ruhig bleibt)
Feature immer auf stage bauen

git checkout stage

git pull

git checkout -b feat/follow-ui

Merge nach stage, testen auf Preview

Erst wenn Preview stabil → Merge stage → main

So bleibt Production wirklich “heilig”.

Was du mir im naechsten Schritt schicken sollst (ohne 20 Rueckfragen)
Damit ich direkt den Follow UI-Teil mit dir umsetzen kann, reicht eins von beiden:

Option A (am schnellsten):

die relevanten Backend Routes (kurz):

Welche Endpoints existieren genau fuer follow / request / approve / reject?

(copy/paste Controller Snippets reicht)

Option B (wenn du nicht suchen willst):

apps/api/src/follows/* (oder wie der Ordner heisst) als Codeblock hier rein

plus: die Course Detail Page Komponente im Web, wo der Follow Button hin soll

Dann baue ich dir die Frontend-Komponenten passend zu deinen echten Endpoints (ohne Rate-Guessing).

Wenn du willst, starten wir morgen direkt mit Follow-System UI (MVP) und lassen Workflow nur noch als kurze “final check” Runde laufen.


Du:
was passiert wenn ich git checkout stage vergesse?
A) Wo finde ich diese Infos
B) apps/api/src/follows habe ich bereits mit den 3 modulen controller, module, service

ChatGPT:
Wenn du git checkout stage vergisst, passiert (je nach Situation) leider genau das, was man spaeter als “warum ist prod kaputt?” erlebt 😄

Was passiert konkret, wenn du auf dem falschen Branch arbeitest?
Fall 1: Du bist noch auf main und machst dort Commits
Dein Feature landet direkt auf Production-Pfad (weil main → Vercel Production / Railway production).

Sobald du pushst, kann das Prod deployen, auch wenn es halb fertig ist.

Spaeter wird es muehsam, das sauber nach stage rueber zu bringen (Cherry-pick / revert / merge chaos).

Fall 2: Du bist auf stage, aber willst eigentlich in einem Feature-Branch arbeiten
Du vermischst Feature-Work mit stage.

Preview kann instabil werden, weil mehrere Sachen zusammen drin sind.

Ist weniger schlimm als main, aber unclean.

Fall 3: Du bist in einem alten Feature-Branch
Du baust auf altem Stand weiter.

Nach dem Merge fehlen dir Dinge oder du bekommst Merge-Konflikte.

Typischer “warum fehlt das in preview?” Moment.

Merke: Der groesste Schaden entsteht nur, wenn du auf main arbeitest und pushst.

Mini-Sicherheitsnetz (wirklich empfehlenswert)
Mach dir das zum Standard vor jeder Session:

git status
git branch --show-current
git pull
Und wenn du starten willst:

git checkout stage
git pull
git checkout -b feat/follow-ui
Dann bist du safe.

A) Wo findest du “diese Infos” (Endpoints / API-Infos)?
Wenn du sagst “apps/api/src/follows hat controller/module/service”, dann ist es super einfach:

1) Controller = Wahrheit
In apps/api/src/follows/follows.controller.ts (oder aehnlich) siehst du:

@Controller('...') → Basis-Pfad

@Get() / @Post() / @Delete() → Endpoints

Parameter wie @Param('courseId') oder @Body()

Das ist genau die Info, die wir brauchen.

2) Swagger (falls aktiv)
Wenn Swagger in main.ts aktiviert ist, findest du es unter:

<API_BASE_URL>/api oder /docs (je nachdem wie ihr es gesetzt habt)

Da siehst du alle Endpoints sauber.

3) “ripgrep” lokal (super schnell)
Falls du etwas nicht findest:

rg "@Controller|@Get|@Post|follow" apps/api/src -n
B) Perfekt — dann paste bitte genau diese 3 Files
Du musst nichts weiteres zusammensuchen. Paste einfach (als Codeblocks):

apps/api/src/follows/follows.controller.ts

apps/api/src/follows/follows.service.ts

apps/api/src/follows/follows.module.ts

Wenn es noch DTOs / types gibt (z.B. dto/ oder types.ts) dann auch gleich mit — aber wenn nicht, passt.

Und dazu noch 1 Frontend-Datei:
Die Seite/Komponente, wo der Follow-Button hin soll. Meist sowas wie:

apps/web/src/pages/CoursePage.tsx

oder CourseHeader.tsx

oder der Map Popup component, falls du dort starten willst

Wenn du magst, gebe ich dir danach direkt:

FollowButton.tsx als saubere Komponente (3 States: Follow / Requested / Following)

passende API-Wrapper Funktionen in apps/web/src/api/…

und die minimale UI in Course Page + optional Map Popup.


Du:
Also rg gibt es bei mir nicht, habe nur powershell, oder wo würde rg gehen?
Dann die files:
main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import type { Request, Response } from 'express';
import { join } from 'path';

type CorsCallback = (err: Error | null, allow?: boolean) => void;

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '');
}

async function bootstrap() {
  const raw = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '';
  try {
    const u = new URL(raw);
    console.log('[DB]', { host: u.host, db: u.pathname.replace('/', '') });
  } catch {
    console.log('[DB] URL missing or invalid');
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const frontendUrl = process.env.FRONTEND_URL
    ? normalizeOrigin(process.env.FRONTEND_URL)
    : undefined;

  const allowVercelPreviews =
    (process.env.ALLOW_VERCEL_PREVIEWS ?? 'true').toLowerCase() === 'true';

  app.enableCors({
    origin: (origin: string | undefined, cb) => {
      // Allow non-browser tools (Postman, curl)
      if (!origin) return cb(null, true);

      try {
        const host = new URL(origin).hostname;

        // 1️⃣ Allow main production frontend
        if (host === 'fairwayd.vercel.app') {
          return cb(null, true);
        }

        // 2️⃣ Allow ALL Vercel deployments (preview + prod)
        if (host.endsWith('.vercel.app')) {
          return cb(null, true);
        }

        return cb(new Error('Not allowed by CORS'), false);
      } catch {
        return cb(new Error('Invalid origin'), false);
      }
    },

    credentials: true,

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    allowedHeaders: ['Content-Type', 'Authorization'],

    exposedHeaders: ['Authorization'],
  });

  console.log(OAUTH_DEBUG=${process.env.OAUTH_DEBUG});
  console.log(
    GOOGLE_CLIENT_ID_PREFIX=${(process.env.GOOGLE_CLIENT_ID ?? '').trim().slice(0, 18)}...,
  );

  // ✅ Ensure preflight OPTIONS requests never 404 (e.g. /auth/oauth)
  // IMPORTANT: Nest app itself has no app.options() type; use the underlying Express instance.
  // CORS headers are applied by enableCors above.
  const server = app.getHttpAdapter().getInstance();
  server.options(/.*/, (req: Request, res: Response) => {
    res.sendStatus(204);
  });

  const config = new DocumentBuilder()
    .setTitle('Fairwayd API')
    .setDescription('Fairwayd Backend API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'jwt',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(Invalid PORT value: ${process.env.PORT});
  }

  await app.listen(port, '0.0.0.0');

  console.log(Listening on ${port});
  console.log(Fairwayd API listening on http://0.0.0.0:${port});
  if (frontendUrl) console.log(CORS primary frontend: ${frontendUrl});
  console.log(ALLOW_VERCEL_PREVIEWS=${String(allowVercelPreviews)});
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});

follows.controller.ts
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FollowsService } from './follows.service';

@ApiTags('follows')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('follows')
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Get('requests/count')
  async requestsCount(@Req() req: any) {
    const userId = req.user.userId;
    const count = await this.follows.countPendingRequests(userId);
    return { count };
  }

  @Get('requests')
  async listRequests(@Req() req: any) {
    const userId = req.user.userId;
    return this.follows.listPendingRequests(userId);
  }

  // Send a follow request to target userId
  @Post(':userId')
  async requestFollow(@Req() req: any, @Param('userId') userId: string) {
    const me = req.user.userId;
    return this.follows.requestFollow(me, userId);
  }

  @Post('requests/:id/accept')
  async accept(@Req() req: any, @Param('id') id: string) {
    const me = req.user.userId;
    return this.follows.acceptRequest(me, id);
  }

  @Delete('requests/:id')
  async decline(@Req() req: any, @Param('id') id: string) {
    const me = req.user.userId;
    return this.follows.declineRequest(me, id);
  }
}
follows.module.ts
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FollowsService } from './follows.service';

@ApiTags('follows')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('follows')
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Get('requests/count')
  async requestsCount(@Req() req: any) {
    const userId = req.user.userId;
    const count = await this.follows.countPendingRequests(userId);
    return { count };
  }

  @Get('requests')
  async listRequests(@Req() req: any) {
    const userId = req.user.userId;
    return this.follows.listPendingRequests(userId);
  }

  // Send a follow request to target userId
  @Post(':userId')
  async requestFollow(@Req() req: any, @Param('userId') userId: string) {
    const me = req.user.userId;
    return this.follows.requestFollow(me, userId);
  }

  @Post('requests/:id/accept')
  async accept(@Req() req: any, @Param('id') id: string) {
    const me = req.user.userId;
    return this.follows.acceptRequest(me, id);
  }

  @Delete('requests/:id')
  async decline(@Req() req: any, @Param('id') id: string) {
    const me = req.user.userId;
    return this.follows.declineRequest(me, id);
  }
}

follows.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FollowStatus } from '@prisma/client';

@Injectable()
export class FollowsService {
  constructor(private readonly prisma: PrismaService) {}

  async countPendingRequests(userId: string) {
    return this.prisma.follow.count({
      where: { followingId: userId, status: FollowStatus.PENDING },
    });
  }

  async listPendingRequests(userId: string) {
    return this.prisma.follow.findMany({
      where: { followingId: userId, status: FollowStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        follower: {
          select: { id: true, handle: true, name: true, avatarUrl: true },
        },
      },
    });
  }

  async requestFollow(followerId: string, followingId: string) {
    if (!followerId || !followingId) {
      throw new BadRequestException('Missing user ids');
    }
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // create if missing, otherwise return existing (unique constraint)
    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { id: true, status: true },
    });

    if (existing) return existing;

    return this.prisma.follow.create({
      data: {
        followerId,
        followingId,
        status: FollowStatus.PENDING,
      },
      select: { id: true, status: true },
    });
  }

  async acceptRequest(myUserId: string, followId: string) {
    const row = await this.prisma.follow.findUnique({
      where: { id: followId },
      select: { id: true, followingId: true, status: true },
    });

    if (!row) throw new NotFoundException('Request not found');
    if (row.followingId !== myUserId)
      throw new ForbiddenException('Not allowed');
    if (row.status !== FollowStatus.PENDING) return row;

    return this.prisma.follow.update({
      where: { id: followId },
      data: { status: FollowStatus.ACCEPTED, decidedAt: new Date() },
      select: { id: true, status: true },
    });
  }

  async declineRequest(myUserId: string, followId: string) {
    const row = await this.prisma.follow.findUnique({
      where: { id: followId },
      select: { id: true, followingId: true },
    });

    if (!row) throw new NotFoundException('Request not found');
    if (row.followingId !== myUserId)
      throw new ForbiddenException('Not allowed');

    await this.prisma.follow.delete({ where: { id: followId } });
    return { ok: true };
  }
}
ich habe ein oauth.dto.ts
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum OAuthProvider {
  GOOGLE = 'GOOGLE',
}

export class OAuthDto {
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @IsString()
  @IsNotEmpty()
  idToken: string;
}


coursepage.tsx gibt es bei mir nicht, glaub das ist mapview.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import { useSelectedCourse } from "../state/SelectedCourseContext";
import { useNavigate } from "react-router-dom";
import L from "leaflet";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const courseIcon = L.divIcon({
  className: "",
  html: 
    <div style="
      width:44px;
      height:44px;
      border-radius:999px;
      background:magenta;
      border:4px solid yellow;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:22px;
      font-weight:900;
    ">TEST</div>
  ,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const meIcon = L.divIcon({
  className: "",
  html: 
    <div style="
      width:14px;
      height:14px;
      border-radius:999px;
      background:rgba(80,160,255,.95);
      border:2px solid rgba(0,0,0,.65);
      box-shadow:0 6px 18px rgba(80,160,255,.35);
    "></div>
  ,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

type CourseLite = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country?: string;
  region?: string | null;
};

async function apiGetFollowing(courseId: string, token: string) {
  const res = await fetch(${API_BASE}/courses/${courseId}/following, {
    headers: { Authorization: Bearer ${token} },
  });
  if (!res.ok) throw new Error(GET following failed ${res.status});
  return (await res.json()) as { following: boolean };
}

async function apiFollow(courseId: string, token: string) {
  const res = await fetch(${API_BASE}/courses/${courseId}/follow, {
    method: "POST",
    headers: { Authorization: Bearer ${token} },
  });
  if (!res.ok) throw new Error(POST follow failed ${res.status});
  return (await res.json()) as { ok: boolean };
}

async function apiUnfollow(courseId: string, token: string) {
  const res = await fetch(${API_BASE}/courses/${courseId}/follow, {
    method: "DELETE",
    headers: { Authorization: Bearer ${token} },
  });
  if (!res.ok) throw new Error(DELETE follow failed ${res.status});
  return (await res.json()) as { ok: boolean };
}

function CoursesByBoundsLoader({
  onStatus,
  onItems,
}: {
  onStatus: (s: string) => void;
  onItems: (items: CourseLite[]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const b = map.getBounds();
        const sw = b.getSouthWest();
        const ne = b.getNorthEast();

        const qs = new URLSearchParams({
          minLat: String(sw.lat),
          maxLat: String(ne.lat),
          minLon: String(sw.lng),
          maxLon: String(ne.lng),
          take: "1500",
        });

        onStatus("Loading courses...");
        const res = await fetch(
          ${API_BASE}/courses/in-bounds?${qs.toString()},
        );
        const data = await res.json();

        const items: CourseLite[] = Array.isArray(data?.items)
          ? data.items
          : [];
        if (!alive) return;

        onItems(items);
        onStatus(${items.length} courses in view);
      } catch {
        if (!alive) return;
        onStatus("Failed to load courses");
      }
    };

    load();
    map.on("moveend", load);
    map.on("zoomend", load);

    return () => {
      alive = false;
      map.off("moveend", load);
      map.off("zoomend", load);
    };
  }, [map, onItems, onStatus]);

  return null;
}

export default function MapView() {
  const { setSelectedCourse } = useSelectedCourse();
  const nav = useNavigate();

  const [center, setCenter] = useState<[number, number]>([47.5596, 7.5886]);
  const [radiusM] = useState(50000);
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [loadStatus, setLoadStatus] = useState("Loading courses...");

  // Follow UI state
  const token = localStorage.getItem("fairwayd_token") || "";
  const [followingByCourseId, setFollowingByCourseId] = useState<
    Record<string, boolean>
  >({});
  const [busyByCourseId, setBusyByCourseId] = useState<Record<string, boolean>>(
    {},
  );
  const [loadingFollowByCourseId, setLoadingFollowByCourseId] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {},
    );
  }, []);

  const status = useMemo(() => loadStatus, [loadStatus]);

  const onSelectCourse = useCallback(
    (c: CourseLite) => {
      setSelectedCourse({
        id: c.id,
        name: c.name,
        lat: c.lat,
        lon: c.lon,
      });

      setTimeout(() => nav("/feed"), 50);
    },
    [setSelectedCourse, nav],
  );

  const ensureFollowingLoaded = useCallback(
    async (courseId: string) => {
      if (!token) return;

      if (followingByCourseId[courseId] !== undefined) return;
      if (loadingFollowByCourseId[courseId]) return;

      setLoadingFollowByCourseId((m) => ({ ...m, [courseId]: true }));

      try {
        const data = await apiGetFollowing(courseId, token);
        setFollowingByCourseId((m) => ({ ...m, [courseId]: data.following }));
      } catch {
        // wenn Request fehlschlägt, setze bewusst false (nicht undefined)
        setFollowingByCourseId((m) => ({ ...m, [courseId]: false }));
      } finally {
        setLoadingFollowByCourseId((m) => ({ ...m, [courseId]: false }));
      }
    },
    [token, followingByCourseId, loadingFollowByCourseId],
  );

  const toggleFollow = useCallback(
    async (courseId: string) => {
      if (!token) return;

      const current = !!followingByCourseId[courseId];
      setBusyByCourseId((m) => ({ ...m, [courseId]: true }));

      // optimistic
      setFollowingByCourseId((m) => ({ ...m, [courseId]: !current }));

      try {
        if (current) {
          await apiUnfollow(courseId, token);
        } else {
          await apiFollow(courseId, token);
        }
      } catch {
        // revert on error
        setFollowingByCourseId((m) => ({ ...m, [courseId]: current }));
      } finally {
        setBusyByCourseId((m) => ({ ...m, [courseId]: false }));
      }
    },
    [token, followingByCourseId],
  );

  return (
    <div style={{ height: "100vh" }}>
      <div style={{ padding: 8, color: "var(--text)" }}>{status}</div>

      <MapContainer center={center} zoom={11} style={{ height: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Circle center={center} radius={radiusM} />

        <Marker position={center} icon={meIcon}>
          <Popup>You are here</Popup>
        </Marker>

        <CoursesByBoundsLoader onStatus={setLoadStatus} onItems={setCourses} />

        {courses.map((c) => {
          const following = followingByCourseId[c.id];
          const busy = !!busyByCourseId[c.id];
          const loading = !!loadingFollowByCourseId[c.id];

          return (
            <Marker
              key={c.id}
              position={[c.lat, c.lon]}
              icon={courseIcon}
              eventHandlers={{
                click: () => ensureFollowingLoaded(c.id),
              }}
            >
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                    onClick={() => onSelectCourse(c)}
                    title="Open feed for this course"
                  >
                    {c.name}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button
                      disabled={!token || busy || loading}
                      onClick={() => toggleFollow(c.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid #ddd",
                        background: following ? "black" : "white",
                        color: following ? "white" : "black",
                        cursor: !token ? "not-allowed" : "pointer",
                        fontWeight: 700,
                        opacity: loading ? 0.7 : 1,
                      }}
                    >
                      {loading
                        ? "Loading..."
                        : following
                          ? "Following"
                          : "+ Follow"}
                    </button>

                    {!token ? (
                      <span
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                          alignSelf: "center",
                        }}
                      >
                        Login nötig
                      </span>
                    ) : null}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

ChatGPT:
Alles klar – und super, dass du die Files gepostet hast. Da sind zwei wichtige Punkte drin:

rg (ripgrep) hast du nicht → in PowerShell geht das easy mit Bordmitteln.

Dein Follow-System ist aktuell zweigeteilt:

Backend follows/* ist User → User (Follow Requests etc.)

Frontend MapView macht Course → Follow via /courses/:id/follow und /courses/:id/following
Das sind zwei verschiedene Features (beides ok!), aber wir duerfen sie nicht verwechseln.

1) “rg” Alternative in PowerShell (ohne Install)
Schnellsuche in TS/JS Files
Get-ChildItem -Path .\apps\api\src -Recurse -Include *.ts,*.tsx |
  Select-String -Pattern "@Controller\(|@Get\(|@Post\(|/follow|follows" |
  Select-Object Path, LineNumber, Line
Nur im einen Ordner (z.B. follows)
Get-ChildItem .\apps\api\src\follows -Recurse -Include *.ts |
  Select-String -Pattern "@Get|@Post|@Delete|Controller" |
  Select-Object Path, LineNumber, Line
Noch simpler (ein File)
Select-String -Path .\apps\api\src\follows\follows.controller.ts -Pattern "@Get|@Post|@Delete|Controller"
Optional: ripgrep installieren (wenn du willst)
Wenn du winget hast:

winget install BurntSushi.ripgrep.MSVC
Danach geht rg auch in PowerShell.

2) Wichtiger Fund: follows.module.ts ist falsch
Du hast in follows.module.ts nochmals den ganzen Controller-Code drin (kopiert).
Das wird frueher oder spaeter knallen (oder ist schon “zufaellig” nicht geladen).

So sollte apps/api/src/follows/follows.module.ts aussehen:

import { Module } from '@nestjs/common';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
Und dann in deinem AppModule sicherstellen, dass FollowsModule importiert ist.

3) Dein MapView “Follow” ist Course-Follow, nicht User-Follow
Dein MapView.tsx nutzt:

GET /courses/:courseId/following → { following: boolean }

POST /courses/:courseId/follow → { ok: boolean }

DELETE /courses/:courseId/follow → { ok: boolean }

Das ist super fuer “Course Follow” (Feed-Kontext etc.).

Dein FollowsController dagegen macht:

POST /follows/:userId (User follow request)

GET /follows/requests

POST /follows/requests/:id/accept

DELETE /follows/requests/:id

Das ist “Social Graph” (User folgt User).

✅ Heisst: Map Follow UX verbessern betrifft sehr wahrscheinlich Course-Follow Endpoints, nicht follows/*.

4) Naechster sinnvoller Schritt (ohne Infra-Feuer)
Damit wir morgen “Feature Development” machen, wuerde ich genau so vorgehen:

A) Quick Fix: follows.module.ts korrigieren (oben)
Das ist 2 Minuten und removes future pain.

B) Map Popup UX verbessern (Course Follow)
Dein Popup ist schon functional, aber ich wuerde als naechstes:

CourseIcon nicht inline-styled “TEST/magenta”, sondern mit deiner Theme-Farbe (spaeter)

Popup Button-States sauberer:

“Follow” / “Following” / “Loading…”

bei Fehler: kleine Meldung statt “silent revert”

Follow status laden nicht nur bei click, sondern beim Popup open (ist fast gleich, aber UX cleaner)

C) Wenn wir User-Follow UI bauen wollen
Dann brauchen wir im Frontend eine Page/Component, die:

GET /follows/requests listet

POST /follows/requests/:id/accept und DELETE /follows/requests/:id

(da hast du vermutlich schon FollowRequestsPage.tsx aus den letzten Tagen)

5) Mini-Frage beantwortet ohne Rueckfrage
Du sagst “CoursePage gibt es nicht, vermutlich MapView” → passt.
Dann ist Day 26: Map Popup UX ein guter Einstieg.

Wenn du willst, schicke mir als naechstes nur:

den Controller/Service wo /courses/:id/follow und /courses/:id/following drin ist (Dateiname egal)

Dann kann ich dir den passenden “FollowButton” als wiederverwendbare Komponente bauen (statt MapView-mit-API-calls), und wir koennen denselben Button spaeter auch im Feed/Header nutzen.


Du:
Path                                                                     LineNumber Line
----                                                                     ---------- ----
C:\dev\fairwayd\apps\api\src\auth\auth.controller.ts                             15 @Controller('auth')
C:\dev\fairwayd\apps\api\src\auth\auth.controller.ts                             23   @Get('me')
C:\dev\fairwayd\apps\api\src\auth\auth.controller.ts                             34   @Post('oauth')
C:\dev\fairwayd\apps\api\src\auth\auth.controller.ts                             63   @Post('google')
C:\dev\fairwayd\apps\api\src\auth\auth.controller.ts                             80   @Post('dev')
C:\dev\fairwayd\apps\api\src\courses\import\courses-import.controller.ts          7 @Controller("courses")
C:\dev\fairwayd\apps\api\src\courses\import\courses-import.controller.ts         11   @Post("import")
C:\dev\fairwayd\apps\api\src\courses\courses.controller.ts                       17 @Controller('courses')
C:\dev\fairwayd\apps\api\src\courses\courses.controller.ts                       21   @Get()
C:\dev\fairwayd\apps\api\src\courses\courses.controller.ts                       26   @Get('search')
C:\dev\fairwayd\apps\api\src\courses\courses.controller.ts                       41   @Get('in-bounds')
C:\dev\fairwayd\apps\api\src\courses\courses.controller.ts                       62   @Get('nearby')
C:\dev\fairwayd\apps\api\src\courses\courses.controller.ts                       81   // IMPORTANT: must be BEFORE @...
C:\dev\fairwayd\apps\api\src\courses\courses.controller.ts                       85   @Get('me/following')
C:\dev\fairwayd\apps\api\src\courses\courses.controller.ts                       86   @ApiOperation({ summary: 'List...
C:\dev\fairwayd\apps\api\src\courses\courses.controller.ts                       95   @Get(':id')
C:\dev\fairwayd\apps\api\src\courses\courses.controller.ts                      106   @Get(':id/following')
C:\dev\fairwayd\apps\api\src\courses\courses.controller.ts                      123   @Post(':id/follow')
C:\dev\fairwayd\apps\api\src\courses\courses.controller.ts                      137   @Delete(':id/follow')
C:\dev\fairwayd\apps\api\src\feed\feed.controller.ts                              5 @Controller('feed')
C:\dev\fairwayd\apps\api\src\feed\feed.controller.ts                             10   @Get()
C:\dev\fairwayd\apps\api\src\feed\feed.service.ts                                 3 import { FollowStatus, Visibilit...
C:\dev\fairwayd\apps\api\src\feed\feed.service.ts                                12       where: { followerId: userI...
C:\dev\fairwayd\apps\api\src\feed\feed.service.ts                                20     // - following posts: only P...
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       12 import { FollowsService } from '...
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       14 @ApiTags('follows')
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       17 @Controller('follows')
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       18 export class FollowsController {
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       19   constructor(private readonly f...
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       21   @Get('requests/count')
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       24     const count = await this.fol...
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       28   @Get('requests')
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       31     return this.follows.listPend...
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       35   @Post(':userId')
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       38     return this.follows.requestF...
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       41   @Post('requests/:id/accept')
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       44     return this.follows.acceptRe...
C:\dev\fairwayd\apps\api\src\follows\follows.controller.ts                       50     return this.follows.declineR...
C:\dev\fairwayd\apps\api\src\follows\follows.module.ts                            3 import { FollowsController } fro...
C:\dev\fairwayd\apps\api\src\follows\follows.module.ts                            4 import { FollowsService } from '...
C:\dev\fairwayd\apps\api\src\follows\follows.module.ts                            8   controllers: [FollowsController],
C:\dev\fairwayd\apps\api\src\follows\follows.module.ts                            9   providers: [FollowsService],
C:\dev\fairwayd\apps\api\src\follows\follows.module.ts                           10   exports: [FollowsService],
C:\dev\fairwayd\apps\api\src\follows\follows.module.ts                           12 export class FollowsModule {}
C:\dev\fairwayd\apps\api\src\follows\follows.service.ts                           8 import { FollowStatus } from '@p...
C:\dev\fairwayd\apps\api\src\follows\follows.service.ts                          11 export class FollowsService {
C:\dev\fairwayd\apps\api\src\follows\follows.service.ts                          16       where: { followingId: user...
C:\dev\fairwayd\apps\api\src\follows\follows.service.ts                          22       where: { followingId: user...
C:\dev\fairwayd\apps\api\src\follows\follows.service.ts                          54         status: FollowStatus.PEN...
C:\dev\fairwayd\apps\api\src\follows\follows.service.ts                          69     if (row.status !== FollowSta...
C:\dev\fairwayd\apps\api\src\follows\follows.service.ts                          73       data: { status: FollowStat...
C:\dev\fairwayd\apps\api\src\posts\posts.controller.ts                           32 @Controller('posts')
C:\dev\fairwayd\apps\api\src\posts\posts.controller.ts                           37   @Get('feed')
C:\dev\fairwayd\apps\api\src\posts\posts.controller.ts                           47   @Get('course/:courseId')
C:\dev\fairwayd\apps\api\src\posts\posts.controller.ts                           59   @Get('me')
C:\dev\fairwayd\apps\api\src\posts\posts.controller.ts                           68   @Post()
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                           32 @Controller('users')
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                           40   @Get('me')
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                           50   @Post('me/accept-terms')
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                           62   @Post('me/profile')
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                           82   @Post('me/avatar')
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                          123   @Post('id/:id/follow')
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                          139   @Delete('id/:id/follow')
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                          154   @Get('id/:id/following-status')
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                          162     const status = await this.us...
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                          171   @Get('me/follow-requests')
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                          182   @Post('me/follow-requests/:fol...
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                          195   @Post('me/follow-requests/:fol...
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                          215   @Get(':handle/posts')
C:\dev\fairwayd\apps\api\src\users\users.controller.ts                          222   @Get(':handle')
C:\dev\fairwayd\apps\api\src\users\users.service.ts                               8 import { AccountPrivacy, FollowS...
C:\dev\fairwayd\apps\api\src\users\users.service.ts                             223         ? FollowStatus.ACCEPTED
C:\dev\fairwayd\apps\api\src\users\users.service.ts                             224         : FollowStatus.PENDING;
C:\dev\fairwayd\apps\api\src\users\users.service.ts                             234         decidedAt: desiredStatus...
C:\dev\fairwayd\apps\api\src\users\users.service.ts                             240         decidedAt: desiredStatus...
C:\dev\fairwayd\apps\api\src\users\users.service.ts                             260   async getFollowStatus(meId: st...
C:\dev\fairwayd\apps\api\src\users\users.service.ts                             269     if (row.status === FollowSta...
C:\dev\fairwayd\apps\api\src\users\users.service.ts                             270     if (row.status === FollowSta...
C:\dev\fairwayd\apps\api\src\users\users.service.ts                             280       where: { followingId: meId...
C:\dev\fairwayd\apps\api\src\users\users.service.ts                             308         status: FollowStatus.PEN...
C:\dev\fairwayd\apps\api\src\users\users.service.ts                             311         status: FollowStatus.ACC...
C:\dev\fairwayd\apps\api\src\users\users.service.ts                             324         status: FollowStatus.PEN...
C:\dev\fairwayd\apps\api\src\app.controller.ts                                    4 @Controller()
C:\dev\fairwayd\apps\api\src\app.controller.ts                                    8   @Get()
C:\dev\fairwayd\apps\api\src\app.module.ts                                       11 import { FollowsModule } from '....
C:\dev\fairwayd\apps\api\src\app.module.ts                                       25     FollowsModule,

ChatGPT:
Top – dein PowerShell-Search ist perfekt, und er zeigt uns jetzt ganz klar, wo was liegt. 👍

1) rg brauchst du nicht
Du hast es schon richtig gemacht: Select-String ist dein “rg” in PowerShell.

Bonus-Trick: direkt zur Stelle springen (falls du VS Code nutzt):

code -g .\apps\api\src\courses\courses.controller.ts:106
code -g .\apps\api\src\courses\courses.controller.ts:123
code -g .\apps\api\src\courses\courses.controller.ts:137
Oder mehr Kontext anzeigen:

Select-String -Path .\apps\api\src\courses\courses.controller.ts -Pattern "@Get\(':id/following'\)|@Post\(':id/follow'\)|@Delete\(':id/follow'\)" -Context 2,6
2) Wichtigstes Ergebnis aus deiner Liste
✅ Course-Follow (das was MapView nutzt)
Ist in:

apps/api/src/courses/courses.controller.ts

@Get(':id/following') (Line ~106)

@Post(':id/follow') (Line ~123)

@Delete(':id/follow') (Line ~137)

plus: @Get('me/following') (Line ~85) → sehr spannend fuers Feed!

➡️ Das ist genau dein Map Popup Follow Feature.

✅ User-Follow (Social Graph)
Du hast sogar zwei Stellen:

apps/api/src/follows/* (requests/accept/decline)

apps/api/src/users/users.controller.ts

POST users/id/:id/follow

DELETE users/id/:id/follow

GET users/id/:id/following-status

und follow-requests unter users/me/follow-requests...

➡️ Das ist ein kleines Red-Flag: User-Follow ist doppelt implementiert (einmal unter /follows, einmal unter /users/...). Das muessen wir nicht heute fixen, aber wir sollten spaeter einen Weg standardisieren, sonst wird’s unnoetig verwirrend.

3) Zu follows.module.ts
Deine Search-Ausgabe zeigt jetzt:

apps/api/src/follows/follows.module.ts importiert Controller/Service und exportiert FollowsModule.

✅ Das sieht so aus, als ob du es bereits korrigiert hast (oder dein vorhin gepastetes File war ein Copy/Paste-Unfall).
Wenn du sicher sein willst:

Get-Content .\apps\api\src\follows\follows.module.ts
Wenn da noch Controller-Code drin ist, sag kurz – dann ersetzen wir’s.

4) Day 26: Wir bleiben bei “Feature Development”
Da dein MapView bereits Course-Follow nutzt, ist der naechste saubere Schritt:

Schritt A: Follow-API in ein eigenes Frontend-Modul auslagern
Damit du es spaeter im Feed/Header wiederverwenden kannst und MapView nicht alles “inline” hat.

Ziel:

apps/web/src/api/courseFollow.ts

getCourseFollowing(courseId)

followCourse(courseId)

unfollowCourse(courseId)

Schritt B: Reusable UI Komponente
apps/web/src/components/CourseFollowButton.tsx

States: loading / following / not following

Optional: kleine Fehlermeldung “Fehlgeschlagen – bitte erneut”

Schritt C: Map Popup UX
Popup Layout kompakter

Button sauberer

optional: GET /courses/me/following fuer “Batch Prefetch” (damit nicht jeder Marker einzeln laden muss)

5) Was ich als naechstes von dir brauche (nur 1 File)
Damit ich dir sauber den CourseFollowButton + API Wrapper passend zu deinem Backend baue:

👉 Bitte paste:
apps/api/src/courses/courses.controller.ts (oder mindestens den Teil um Lines 85–150)

Dann mache ich dir direkt den Frontend-Refactor (copy/paste ready) fuer:

api/courseFollow.ts

CourseFollowButton.tsx

MapView minimal angepasst (nur noch Button verwenden)

Und wir bleiben komplett im Feature-Modus, ohne Infra-Gedoehns.


Du:
Get-Content .\apps\api\src\follows\follows.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';

@Module({
  imports: [PrismaModule],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}

ChatGPT:
Perfekt 👍

Das ist korrekt – dein FollowsModule ist sauber aufgebaut:

@Module({
  imports: [PrismaModule],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
✅ PrismaModule importiert
✅ Controller registriert
✅ Service registriert
✅ Service exportiert
✅ Kein doppelt kopierter Controller mehr

Das ist production-ready.

Jetzt wichtig: Architektur-Check (Day 26 sauber starten)
Du hast aktuell zwei verschiedene Follow-Systeme:

1️⃣ Course Follow
In courses.controller.ts

GET    /courses/:id/following
POST   /courses/:id/follow
DELETE /courses/:id/follow
GET    /courses/me/following
→ Wird von deiner MapView benutzt
→ Relevanz: Feed, Course-Kontext

2️⃣ User Follow (Social Graph)
Zwei Varianten:

A) /follows/...
GET    /follows/requests
POST   /follows/:userId
POST   /follows/requests/:id/accept
DELETE /follows/requests/:id
B) /users/id/:id/follow
POST   users/id/:id/follow
DELETE users/id/:id/follow
GET    users/id/:id/following-status
⚠️ Das ist redundant.
Nicht falsch — aber langfristig sollten wir einen Weg wählen.

Für Day 26 ignorieren wir das.
Wir bleiben bei Course Follow, weil das direkt UI-Wert bringt.

Empfehlung für Day 26 (konkret, kein Chaos)
Wir machen:

🔥 Schritt 1 – Follow Button aus MapView herausziehen
Momentan ist dein Follow-Logic komplett in MapView.tsx.

Das ist schlecht wiederverwendbar.

Wir bauen:

apps/web/src/api/courseFollow.ts
apps/web/src/components/CourseFollowButton.tsx
Danach kann derselbe Button auch im:

Feed

Course Header

später Course Detail Page

etc.

verwendet werden.

🔥 Schritt 2 – Map Popup UX verbessern
Der Marker ist aktuell:

magenta
yellow border
TEST
😄 Dev-Style.

Wir machen:

grüner Marker (Fairwayd Branding)

Follow Button styled

Course Name klarer

evtl. Region anzeigen

kein Inline-Styling mehr

🔥 Schritt 3 – Performance Upgrade (optional aber nice)
Du hast:

ensureFollowingLoaded(courseId)
Das lädt pro Marker einzeln.

Besser:

GET /courses/me/following
und einmalig alle IDs cachen.

Dann:

followingByCourseId[id] = true
Das ist deutlich effizienter bei 1000 Markern.

👉 Nächster Schritt
Damit ich dir den Frontend-Refactor 1:1 passend zu deinem Backend baue:

Bitte paste jetzt:

apps/api/src/courses/courses.controller.ts
(der komplette File oder mindestens ab @Get('me/following') bis @Delete(':id/follow'))

Dann bekommst du:

courseFollow.ts

CourseFollowButton.tsx

minimal angepasste MapView

Copy-Paste-ready.

Und wir sind offiziell im Feature Development Modus 🚀


Du:
Also lass und beginnen

ChatGPT:
Yes — dann starten wir direkt. 🚀
Wir machen als ersten Schritt den Frontend-Refactor: Follow-API + FollowButton-Komponente, und danach bauen wir das in MapView ein.

Step 1: Neues API-Modul anlegen
Erstelle Datei:

apps/web/src/api/courseFollow.ts

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function requireToken(token: string | null | undefined): string {
  const t = (token ?? "").trim();
  if (!t) throw new Error("Missing auth token. Please login again.");
  return t;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function readError(res: Response) {
  const text = await res.text().catch(() => "");
  return text?.trim() ? text.trim() : `${res.status} ${res.statusText}`;
}

export async function getCourseFollowing(courseId: string, token?: string) {
  const t = requireToken(token ?? localStorage.getItem("fairwayd_token"));
  const res = await fetch(`${API_BASE}/courses/${courseId}/following`, {
    headers: authHeaders(t),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { following: boolean };
}

export async function followCourse(courseId: string, token?: string) {
  const t = requireToken(token ?? localStorage.getItem("fairwayd_token"));
  const res = await fetch(`${API_BASE}/courses/${courseId}/follow`, {
    method: "POST",
    headers: authHeaders(t),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { ok: boolean };
}

export async function unfollowCourse(courseId: string, token?: string) {
  const t = requireToken(token ?? localStorage.getItem("fairwayd_token"));
  const res = await fetch(`${API_BASE}/courses/${courseId}/follow`, {
    method: "DELETE",
    headers: authHeaders(t),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { ok: boolean };
}
✅ Vorteil: MapView ist nachher clean, und wir koennen denselben Code spaeter im Feed wiederverwenden.

Step 2: Reusable FollowButton Komponente
Erstelle Datei:

apps/web/src/components/CourseFollowButton.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  followCourse,
  getCourseFollowing,
  unfollowCourse,
} from "../api/courseFollow";

type Props = {
  courseId: string;
  /** optional: wenn du Status schon kennst (z.B. aus Batch) */
  initialFollowing?: boolean;
  /** optional: wenn du Click nicht willst */
  disabled?: boolean;
  /** optional: callback falls parent state syncen will */
  onChange?: (following: boolean) => void;
};

export default function CourseFollowButton({
  courseId,
  initialFollowing,
  disabled,
  onChange,
}: Props) {
  const token = (localStorage.getItem("fairwayd_token") ?? "").trim();

  const [following, setFollowing] = useState<boolean | undefined>(
    initialFollowing,
  );
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const canUse = useMemo(() => !!token && !disabled, [token, disabled]);

  useEffect(() => {
    // wenn initialFollowing mitgegeben wurde, nicht extra laden
    if (following !== undefined) return;
    if (!token) return;

    let alive = true;
    setLoading(true);
    setError("");

    getCourseFollowing(courseId, token)
      .then((data) => {
        if (!alive) return;
        setFollowing(!!data.following);
      })
      .catch((e: any) => {
        if (!alive) return;
        setFollowing(false);
        setError(String(e?.message ?? "Failed to load follow status"));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [courseId, token, following]);

  const toggle = useCallback(async () => {
    if (!token) return;
    if (following === undefined) return;
    if (busy) return;

    setBusy(true);
    setError("");

    const current = following;
    setFollowing(!current);
    onChange?.(!current);

    try {
      if (current) await unfollowCourse(courseId, token);
      else await followCourse(courseId, token);
    } catch (e: any) {
      // revert
      setFollowing(current);
      onChange?.(current);
      setError(String(e?.message ?? "Follow action failed"));
    } finally {
      setBusy(false);
    }
  }, [token, following, busy, courseId, onChange]);

  const label = loading
    ? "Loading..."
    : following
      ? "Following"
      : "+ Follow";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        disabled={!canUse || loading || busy || following === undefined}
        onClick={toggle}
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          border: "1px solid rgba(0,0,0,.15)",
          background: following ? "black" : "white",
          color: following ? "white" : "black",
          cursor: !canUse ? "not-allowed" : "pointer",
          fontWeight: 800,
          opacity: loading ? 0.8 : 1,
        }}
      >
        {label}
      </button>

      {!token ? (
        <div style={{ fontSize: 12, opacity: 0.7 }}>Login nötig</div>
      ) : null}

      {error ? (
        <div style={{ fontSize: 12, opacity: 0.8 }}>{error}</div>
      ) : null}
    </div>
  );
}
Step 3: MapView vereinfachen (Follow-Teil raus)
Jetzt passen wir MapView.tsx an:

A) Entfernen
Diese Dinge kannst du entfernen:

apiGetFollowing, apiFollow, apiUnfollow

die ganzen States:

followingByCourseId

busyByCourseId

loadingFollowByCourseId

ensureFollowingLoaded

toggleFollow

B) Import und Button nutzen
Oben:

import CourseFollowButton from "../components/CourseFollowButton";
Im Popup ersetzt du den ganzen Button-Block durch:

<div style={{ marginTop: 10 }}>
  <CourseFollowButton courseId={c.id} />
</div>
Step 4 (optional, aber ich wuerde es sofort machen): Marker Dev-Style entfernen
Dein Marker hat aktuell “TEST / magenta / gelb”. Das machen wir gleich als naechstes, aber erst wenn Step 1–3 laeuft.

Was du jetzt machst (in genau dieser Reihenfolge)
Datei courseFollow.ts anlegen

Datei CourseFollowButton.tsx anlegen

MapView Follow-Teil entfernen und Button einbauen

npm run dev und kurz testen: Popup → Follow/Unfollow

Wenn beim Build ein TS-Error kommt, paste ihn hier rein (copy/paste), dann fixen wir sofort.




