import jwt from 'jsonwebtoken';

export function tokenSecret() {
  const value = process.env.JWT_SECRET || '';
  return value.length >= 24 ? value : null;
}

const secret = () => tokenSecret() || '';

export function readUser(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), secret());
  } catch {
    return null;
  }
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
