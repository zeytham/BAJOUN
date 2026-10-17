import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByPin } from '../services/pin.service.js';

const prisma = new PrismaClient();

const loginAttempts = new Map();

function tooManyAttempts(key) {
  const now = Date.now();
  const bucket = (loginAttempts.get(key) || []).filter((time) => now - time < 10 * 60 * 1000);
  if (bucket.length >= 8) {
    loginAttempts.set(key, bucket);
    return true;
  }
  bucket.push(now);
  loginAttempts.set(key, bucket);
  return false;
}

/**
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: true, message: 'Email and password are required' });
    }
    const attemptKey = String(email).toLowerCase();
    if (tooManyAttempts(attemptKey)) {
      return res.status(429).json({ error: true, message: 'Majaribio mengi. Subiri dakika kumi.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: true, message: 'Taarifa za kuingia sio sahihi (Invalid credentials)' });
    }

    if (!user.active) {
      return res.status(403).json({ error: true, message: 'Akaunti hii imesitishwa na Msimamizi (Account deactivated).' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: true, message: 'Password sio sahihi (Invalid password)' });
    }

    loginAttempts.delete(attemptKey);

    const signingKey = process.env.JWT_SECRET || '';
    if (signingKey.length < 24) {
      return res.status(500).json({ error: true, message: 'JWT_SECRET haijawekwa kwenye seva.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      signingKey,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: true, message: error.message });
  }
};

/**
 * POST /api/auth/unlock-pin
 * Verify Owner 4-digit PIN for quick screen unlocking
 */
export const unlockWithPin = async (req, res) => {
  try {
    const { pin, email, userId } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'PIN is required' });
    }
    if (!email && !userId) {
      return res.status(400).json({ success: false, message: 'Chagua akaunti kwanza, kisha weka PIN.' });
    }

    const user = await findUserByPin(pin, { userId, email });

    if (!user) {
      return res.status(401).json({ success: false, message: 'PIN sio sahihi.' });
    }

    return res.json({
      success: true,
      message: 'PIN verified successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('PIN verification error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
