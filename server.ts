import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, {type NextFunction, type Request, type Response} from 'express';

dotenv.config();

interface AssetRecord {
  id: string;
  name: string;
  code: string;
  category: string;
  serial: string;
  purchase_date: string;
  value: number;
  location: string;
  condition: string;
  status: string;
  custodian: string;
  remarks: string;
}

interface AssignmentRecord {
  id: string;
  asset_id: string;
  asset_name?: string;
  asset_code?: string;
  person: string;
  department: string;
  issue_date: string;
  due_date: string;
  notes: string;
  returned: boolean;
  returned_date?: string;
}

interface MaintenanceRecord {
  id: string;
  asset_id: string;
  asset_name?: string;
  asset_code?: string;
  date: string;
  type: string;
  provider: string;
  cost: number;
  notes: string;
}

interface DatabaseState {
  assets: AssetRecord[];
  assignments: AssignmentRecord[];
  maintenance: MaintenanceRecord[];
}

const PORT = Number(process.env.PORT) || 3000;
const OFFICE_PASSWORD = process.env.OFFICE_PASSWORD || 'pedo123';
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto
    .createHash('sha256')
    .update(`${OFFICE_PASSWORD}::pedo-pmo-session`)
    .digest('hex');

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'pedo-pmo-db.json');
const COOKIE_NAME = 'pedo_pmo_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function ensureDb(): DatabaseState {
  fs.mkdirSync(DATA_DIR, {recursive: true});
  if (!fs.existsSync(DB_PATH)) {
    const initial: DatabaseState = {
      assets: [],
      assignments: [],
      maintenance: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    return {
      assets: Array.isArray(parsed.assets) ? parsed.assets : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      maintenance: Array.isArray(parsed.maintenance) ? parsed.maintenance : [],
    };
  } catch {
    return {assets: [], assignments: [], maintenance: []};
  }
}

function saveDb(state: DatabaseState): void {
  fs.mkdirSync(DATA_DIR, {recursive: true});
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

function signToken(): string {
  const payload = Buffer.from(
    JSON.stringify({role: 'office', exp: Date.now() + SESSION_TTL_MS}),
    'utf8',
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload || !sig) return false;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as {exp?: number};
    return typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const pairs = header.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return undefined;
}

function isAuthenticated(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    if (verifyToken(bearerToken)) return true;
  }
  const cookieToken = parseCookie(req.headers.cookie, COOKIE_NAME);
  return verifyToken(cookieToken);
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthenticated(req)) {
    res.status(401).json({error: 'Authentication required'});
    return;
  }
  next();
}

function passwordsMatch(input: string, expected: string): boolean {
  const a = Buffer.from(input, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function enrichData(db: DatabaseState): DatabaseState {
  const assetMap = new Map<string, AssetRecord>();
  for (const asset of db.assets) {
    assetMap.set(asset.id, asset);
  }

  return {
    assets: db.assets,
    assignments: db.assignments.map((item) => {
      const asset = assetMap.get(item.asset_id);
      return {
        ...item,
        asset_name: asset?.name || item.asset_name || 'Removed Asset',
        asset_code: asset?.code || item.asset_code || '—',
      };
    }),
    maintenance: db.maintenance.map((item) => {
      const asset = assetMap.get(item.asset_id);
      return {
        ...item,
        asset_name: asset?.name || item.asset_name || 'Removed Asset',
        asset_code: asset?.code || item.asset_code || '—',
      };
    }),
  };
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({limit: '10mb'}));

  app.get('/api/session', (req: Request, res: Response) => {
    res.json({authenticated: isAuthenticated(req)});
  });

  app.post('/api/login', (req: Request, res: Response) => {
    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';
    if (!passwordsMatch(password, OFFICE_PASSWORD)) {
      res.status(401).json({error: 'Invalid office password'});
      return;
    }

    const token = signToken();
    const isHttps =
      req.secure || req.headers['x-forwarded-proto'] === 'https';

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      maxAge: SESSION_TTL_MS,
      path: '/',
    });

    res.json({authenticated: true, token});
  });

  app.post('/api/logout', (req: Request, res: Response) => {
    const isHttps =
      req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      path: '/',
    });
    res.json({ok: true});
  });

  app.get('/api/data', requireAuth, (_req: Request, res: Response) => {
    const db = ensureDb();
    res.json(enrichData(db));
  });

  app.post('/api/assets', requireAuth, (req: Request, res: Response) => {
    const body = req.body as Partial<AssetRecord>;
    const name = String(body.name ?? '').trim();
    const code = String(body.code ?? '').trim();
    if (!name || !code) {
      res.status(400).json({error: 'Asset name and asset code are required'});
      return;
    }

    const db = ensureDb();
    const id = String(body.id || crypto.randomUUID());
    const record: AssetRecord = {
      id,
      name,
      code,
      category: String(body.category || 'IT Equipment'),
      serial: String(body.serial || ''),
      purchase_date: String(body.purchase_date || ''),
      value: Math.max(0, Number(body.value) || 0),
      location: String(body.location || ''),
      condition: String(body.condition || 'Good'),
      status: String(body.status || 'Available'),
      custodian: String(body.custodian || ''),
      remarks: String(body.remarks || ''),
    };

    const existingIdx = db.assets.findIndex((a) => a.id === id);
    if (existingIdx >= 0) {
      db.assets[existingIdx] = record;
    } else {
      db.assets.unshift(record);
    }

    saveDb(db);
    res.json({asset: record});
  });

  app.delete('/api/assets/:id', requireAuth, (req: Request, res: Response) => {
    const {id} = req.params;
    const db = ensureDb();
    const before = db.assets.length;
    db.assets = db.assets.filter((a) => a.id !== id);
    if (db.assets.length === before) {
      res.status(404).json({error: 'Asset not found'});
      return;
    }
    saveDb(db);
    res.json({ok: true});
  });

  app.post('/api/assignments', requireAuth, (req: Request, res: Response) => {
    const body = req.body as Partial<AssignmentRecord>;
    const assetId = String(body.asset_id ?? '').trim();
    const person = String(body.person ?? '').trim();
    const issueDate = String(body.issue_date ?? '').trim();

    if (!assetId || !person || !issueDate) {
      res
        .status(400)
        .json({error: 'Asset, custodian, and issue date are required'});
      return;
    }

    const db = ensureDb();
    const asset = db.assets.find((a) => a.id === assetId);
    if (!asset) {
      res.status(404).json({error: 'Selected asset not found'});
      return;
    }

    const record: AssignmentRecord = {
      id: String(body.id || crypto.randomUUID()),
      asset_id: asset.id,
      asset_name: asset.name,
      asset_code: asset.code,
      person,
      department: String(body.department || ''),
      issue_date: issueDate,
      due_date: String(body.due_date || ''),
      notes: String(body.notes || ''),
      returned: false,
    };

    asset.status = 'In Use';
    asset.custodian = person;
    db.assignments.unshift(record);

    saveDb(db);
    res.json({assignment: record});
  });

  app.post(
    '/api/assignments/:id/return',
    requireAuth,
    (req: Request, res: Response) => {
      const {id} = req.params;
      const db = ensureDb();
      const assignment = db.assignments.find((a) => a.id === id);
      if (!assignment) {
        res.status(404).json({error: 'Assignment record not found'});
        return;
      }

      assignment.returned = true;
      assignment.returned_date = new Date().toISOString().slice(0, 10);

      const asset = db.assets.find((a) => a.id === assignment.asset_id);
      if (asset && asset.status === 'In Use') {
        asset.status = 'Available';
        asset.custodian = '';
      }

      saveDb(db);
      res.json({ok: true});
    },
  );

  app.post('/api/maintenance', requireAuth, (req: Request, res: Response) => {
    const body = req.body as Partial<MaintenanceRecord> & {
      set_under_maintenance?: boolean;
    };
    const assetId = String(body.asset_id ?? '').trim();
    const date = String(body.date ?? '').trim();
    const type = String(body.type ?? 'Repair').trim();

    if (!assetId || !date) {
      res.status(400).json({error: 'Asset and maintenance date are required'});
      return;
    }

    const db = ensureDb();
    const asset = db.assets.find((a) => a.id === assetId);
    if (!asset) {
      res.status(404).json({error: 'Selected asset not found'});
      return;
    }

    const record: MaintenanceRecord = {
      id: String(body.id || crypto.randomUUID()),
      asset_id: asset.id,
      asset_name: asset.name,
      asset_code: asset.code,
      date,
      type,
      provider: String(body.provider || ''),
      cost: Math.max(0, Number(body.cost) || 0),
      notes: String(body.notes || ''),
    };

    if (body.set_under_maintenance !== false) {
      asset.status = 'Under Maintenance';
    }

    db.maintenance.unshift(record);
    saveDb(db);
    res.json({maintenance: record});
  });

  app.get('/api/backup', requireAuth, (_req: Request, res: Response) => {
    const db = ensureDb();
    res.json({
      ...enrichData(db),
      exported_at: new Date().toISOString(),
    });
  });

  app.post('/api/restore', requireAuth, (req: Request, res: Response) => {
    const body = req.body as Partial<DatabaseState>;
    if (
      !Array.isArray(body.assets) ||
      !Array.isArray(body.assignments) ||
      !Array.isArray(body.maintenance)
    ) {
      res.status(400).json({
        error:
          'Invalid backup format. Expected assets, assignments, and maintenance arrays.',
      });
      return;
    }

    const restored: DatabaseState = {
      assets: body.assets,
      assignments: body.assignments,
      maintenance: body.maintenance,
    };
    saveDb(restored);
    res.json({ok: true});
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PEDO PMO Asset Management server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
