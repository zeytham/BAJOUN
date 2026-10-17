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
