import {adminHtml, adminCss, adminScript} from './admin-ui.js';

const cookieName = '__Secure-chaomu_admin';
const sessionSeconds = 8 * 3600;
const feedbackStatuses = ['open', 'reviewing', 'closed'];
const photoStatuses = ['pending', 'reviewed', 'rejected'];
const securityHeaders = {
  'cache-control': 'no-store',
  'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
};

function respond(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...securityHeaders, 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

function serve(content, type) {
  return new Response(content, { headers: { ...securityHeaders, 'content-type': type + '; charset=utf-8' } });
}

async function sha256(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function sessionCookie(value, maxAge) {
  return cookieName + '=' + value + '; Path=/manage; Secure; HttpOnly; SameSite=Strict; Max-Age=' + maxAge;
}

async function readInput(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  let count = 0;
  let text = '';
  const decode = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(text + decode.decode());
      count += value.byteLength;
      if (count > 4096) {
        await reader.cancel();
        return null;
      }
      text += decode.decode(value, { stream: true });
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

async function signIn(request, env) {
  const data = await readInput(request);
  if (typeof data?.username !== 'string' || !/^[a-z0-9-]{3,32}$/.test(data.username) ||
      typeof data.password !== 'string' || data.password.length > 160) {
    return respond({ code: 'INVALID_LOGIN' }, 400);
  }
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const ipHash = await sha256((env.SESSION_SECRET || 'local-admin-rate-limit') + ':' + ip);
  const limit = await env.DB.prepare(`
    INSERT INTO web_admin_attempts (ip_hash)
    SELECT ? WHERE (SELECT COUNT(*) FROM web_admin_attempts
                    WHERE ip_hash=? AND attempted_at>=datetime('now','-15 minutes'))<10
  `).bind(ipHash, ipHash).run();
  if (!limit.meta?.changes) return respond({ code: 'RATE_LIMIT' }, 429);

  const account = await env.DB.prepare(
    'SELECT password_salt, password_verifier FROM web_admin_accounts WHERE username=?'
  ).bind(data.username).first();
  const verifier = await sha256((account?.password_salt || 'unknown-account') + ':' + data.password);
  if (!account || verifier !== account.password_verifier) return respond({ code: 'INVALID_LOGIN' }, 401);

  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + sessionSeconds * 1000).toISOString();
  await env.DB.prepare('INSERT INTO web_admin_sessions (token_hash, username, expires_at) VALUES (?,?,?)')
    .bind(await sha256(token), data.username, expiresAt).run();
  return respond({ username: data.username }, 200, { 'set-cookie': sessionCookie(token, sessionSeconds) });
}

async function activeSession(request, env) {
  const cookies = request.headers.get('cookie') || '';
  const part = cookies.split(';').map(value => value.trim()).find(value => value.startsWith(cookieName + '='));
  const token = part?.slice(cookieName.length + 1) || '';
  if (!/^[a-f0-9-]{72}$/.test(token)) return null;
  const tokenHash = await sha256(token);
  const account = await env.DB.prepare(
    'SELECT username FROM web_admin_sessions WHERE token_hash=? AND expires_at>?'
  ).bind(tokenHash, new Date().toISOString()).first();
  return account ? { username: account.username, tokenHash } : null;
}

async function overview(db) {
  return db.prepare(`
    SELECT (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM users WHERE created_at>=datetime('now','-7 days')) AS newUsers,
      (SELECT COUNT(*) FROM user_feedback WHERE status!='closed') AS feedback,
      (SELECT COUNT(*) FROM plant_photo_corrections WHERE status='pending') AS corrections,
      (SELECT COUNT(*) FROM catalog_photo_overrides) AS published,
      (SELECT COUNT(*) FROM gardens) AS syncedGardens,
      (SELECT COUNT(*) FROM care_records) AS syncedRecords
  `).bind().first();
}

async function users(db, url) {
  const page = Math.min(200, Math.max(1, parseInt(url.searchParams.get('page'), 10) || 1));
  const offset = (page - 1) * 30;
  const rows = await db.prepare(`
    SELECT substr(u.id,1,12) AS userRef,u.role,u.created_at AS createdAt,
      (SELECT COUNT(*) FROM gardens g WHERE g.user_id=u.id) AS gardens,
      (SELECT COUNT(*) FROM care_records r WHERE r.user_id=u.id) AS records,
      (SELECT MAX(created_at) FROM sessions s WHERE s.user_id=u.id) AS lastLogin
    FROM users u ORDER BY created_at DESC, id LIMIT 31 OFFSET ?
  `).bind(offset).all();
  return { items: rows.results.slice(0, 30), hasMore: rows.results.length > 30, page };
}

async function audit(db, account, action, target) {
  await db.prepare('INSERT INTO web_admin_audit (id,username,action,target_id) VALUES (?,?,?,?)')
    .bind(crypto.randomUUID(), account.username, action, target).run();
}

async function feedbackRoute(request, db, url, account, id) {
  if (!id && request.method === 'GET') {
    const status = url.searchParams.get('status') || 'open';
    if (!feedbackStatuses.includes(status)) return respond({ code: 'INVALID_STATUS' }, 400);
    const result = await db.prepare(`
      SELECT id,category,content,contact,status,created_at AS createdAt
      FROM user_feedback WHERE status=? ORDER BY created_at DESC LIMIT 100
    `).bind(status).all();
    return respond({ items: result.results });
  }
  if (!id || request.method !== 'PATCH') return respond({ code: 'NOT_FOUND' }, 404);
  const input = await readInput(request);
  if (!feedbackStatuses.includes(input?.status)) return respond({ code: 'INVALID_STATUS' }, 400);
  const result = await db.prepare('UPDATE user_feedback SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .bind(input.status, id).run();
  if (!result.meta?.changes) return respond({ code: 'NOT_FOUND' }, 404);
  await audit(db, account, 'feedback:' + input.status, id);
  return respond({ status: input.status });
}

function jpeg(photo, cacheControl) {
  const decoded = Uint8Array.from(atob(photo), c => c.charCodeAt(0));
  return new Response(decoded, { headers: {
    'cache-control': cacheControl, 'content-type': 'image/jpeg',
    'x-content-type-options': 'nosniff',
  } });
}

async function correctionRoute(request, db, url, account, id) {
  if (!id && request.method === 'GET') {
    const status = url.searchParams.get('status') || 'pending';
    if (!photoStatuses.includes(status)) return respond({ code: 'INVALID_STATUS' }, 400);
    const result = await db.prepare(`
      SELECT c.id,c.plant_id AS plantId,p.name AS plantName,c.scientific_name AS scientificName,
        c.note,c.created_at AS createdAt,c.status,o.correction_id=c.id AS active
      FROM plant_photo_corrections c
      JOIN plant_species p ON c.plant_id=p.id
      LEFT JOIN catalog_photo_overrides o ON o.plant_id=p.id
      WHERE c.status=? ORDER BY c.created_at DESC LIMIT 100
    `).bind(status).all();
    return respond({ items: result.results });
  }
  if (!id) return respond({ code: 'NOT_FOUND' }, 404);
  if (request.method === 'GET') {
    const result = await db.prepare('SELECT jpeg_base64 AS photo FROM plant_photo_corrections WHERE id=?').bind(id).first();
    return result ? jpeg(result.photo, 'private, no-store') : respond({ code: 'NOT_FOUND' }, 404);
  }
  if (request.method !== 'PATCH') return respond({ code: 'NOT_FOUND' }, 404);
  const input = await readInput(request);
  if (input?.action === 'publish') {
    if (input.taxonChecked !== true || input.rightsChecked !== true) return respond({ code: 'CHECKS_REQUIRED' }, 400);
    const result = await db.batch([
      db.prepare(`
        INSERT INTO catalog_photo_overrides (plant_id, correction_id)
        SELECT c.plant_id,c.id FROM plant_photo_corrections c JOIN plant_species p ON p.id=c.plant_id
        WHERE c.id=? AND c.status IN ('pending','reviewed') AND p.status='published'
          AND c.scientific_name IS p.scientific_name
        ON CONFLICT (plant_id) DO UPDATE SET correction_id=excluded.correction_id,published_at=CURRENT_TIMESTAMP
      `).bind(id),
      db.prepare(`
        UPDATE plant_photo_corrections SET status='reviewed',reviewed_at=CURRENT_TIMESTAMP
        WHERE id=? AND EXISTS(SELECT 1 FROM catalog_photo_overrides WHERE correction_id=?)
      `).bind(id, id),
    ]);
    if (!result[0]?.meta?.changes) return respond({ code: 'CORRECTION_CONFLICT' }, 409);
    await audit(db, account, 'photo:publish', id);
    return respond({ status: 'reviewed', published: true });
  }
  if (input?.action === 'reject') {
    const result = await db.prepare("UPDATE plant_photo_corrections SET status='rejected',reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").bind(id).run();
    if (!result.meta?.changes) return respond({ code: 'CORRECTION_CONFLICT' }, 409);
    await audit(db, account, 'photo:reject', id);
    return respond({ status: 'rejected' });
  }
  return respond({ code: 'INVALID_ACTION' }, 400);
}

export async function handleAdmin(request, env, url) {
  const path = url.pathname;
  if (request.method === 'GET') {
    if (path === '/manage' || path === '/manage/') return serve(adminHtml, 'text/html');
    if (path === '/manage/app.css') return serve(adminCss, 'text/css');
    if (path === '/manage/app.js') return serve(adminScript, 'application/javascript');
  } else if (request.headers.get('origin') !== url.origin) {
    return respond({ code: 'ORIGIN_MISMATCH' }, 403);
  }
  if (path === '/manage/api/session' && request.method === 'POST') return signIn(request, env);
  const account = await activeSession(request, env);
  if (!account) return respond({ code: 'LOGIN_REQUIRED' }, 401);
  if (path === '/manage/api/session') {
    if (request.method === 'GET') return respond({ username: account.username });
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM web_admin_sessions WHERE token_hash=?').bind(account.tokenHash).run();
      return respond({}, 200, { 'set-cookie': sessionCookie('', 0) });
    }
  }
  if (path === '/manage/api/overview' && request.method === 'GET') return respond(await overview(env.DB));
  if (path === '/manage/api/users' && request.method === 'GET') return respond(await users(env.DB, url));
  const match = /^\/manage\/api\/(feedback|corrections)(?:\/([0-9a-f-]{36}))?$/.exec(path);
  if (!match) return respond({ code: 'NOT_FOUND' }, 404);
  if (match[1] === 'feedback') return feedbackRoute(request, env.DB, url, account, match[2]);
  return correctionRoute(request, env.DB, url, account, match[2]);
}

export async function publicPhotoOverrides(db) {
  const rows = await db.prepare(`
    SELECT p.id,o.correction_id AS revision FROM catalog_photo_overrides o
    JOIN plant_species p ON p.id=o.plant_id
    JOIN plant_photo_corrections c ON c.id=o.correction_id
    WHERE p.status='published' AND c.scientific_name IS p.scientific_name
  `).bind().all();
  return respond({ items: rows.results });
}

export async function publicCatalogPhoto(env, request, url, plantId) {
  const row = await env.DB.prepare(`
    SELECT c.jpeg_base64 AS photo FROM catalog_photo_overrides o
    JOIN plant_photo_corrections c ON c.id=o.correction_id
    JOIN plant_species p ON p.id=o.plant_id
    WHERE p.id=? AND p.status='published' AND c.scientific_name IS p.scientific_name
  `).bind(plantId).first();
  if (row) return jpeg(row.photo, 'public, max-age=120');
  if (env.ASSETS) {
    const imageUrl = new URL('/catalog-photos/' + plantId + '.jpg', url.origin);
    const asset = await env.ASSETS.fetch(new Request(imageUrl, { method: 'GET' }));
    if (asset.ok) return asset;
  }
  return respond({ code: 'PHOTO_NOT_FOUND' }, 404);
}
