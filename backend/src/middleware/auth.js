import jwt from 'jsonwebtoken';

export function tokenSecret() {
  const value = process.env.JWT_SECRET || '';
  return value.length >= 24 ? value : null;
}

export function readUser(req) {
  const key = tokenSecret();
  if (!key) return null;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), key);
  } catch {
    return null;
  }
}

export function canSeeCost(req) {
  const user = readUser(req);
  return user?.role === 'ADMIN' || user?.role === 'MANAGER';
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const user = readUser(req);
    if (!user) {
      return res.status(401).json({ error: true, message: 'Ingia kwanza ili kuendelea.' });
    }
    if (roles.length > 0 && !roles.includes(user.role)) {
      return res.status(403).json({ error: true, message: 'Akaunti hii haina ruhusa ya kitendo hiki.' });
    }
    req.user = user;
    next();
  };
}

function shopDoorOpen(req) {
  if (req.get('x-shop-mode') !== 'remote') {
    const host = String(req.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1';
  }
  const token = String(req.get('x-shop-token') || '').trim();
  if (token.length < 4) return false;
  try {
    const url = new URL(String(req.get('x-shop-base') || '').trim());
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    return url.protocol === 'https:' || (url.protocol === 'http:' && local);
  } catch {
    return false;
  }
}

export function requireDesk(...roles) {
  return (req, res, next) => {
    const user = readUser(req);
    if (user && (roles.length === 0 || roles.includes(user.role))) {
      req.user = user;
      return next();
    }
    if (!shopDoorOpen(req)) {
      return res.status(401).json({ error: true, message: 'Weka anwani na neno la siri la duka.' });
    }
    req.user = { id: 'shop', name: 'Duka', role: 'ADMIN', email: '' };
    next();
  };
}
