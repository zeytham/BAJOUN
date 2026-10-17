import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';

export function normalizePin(pin) {
  const digits = String(pin ?? '').replace(/\D/g, '');
  if (digits.length !== 4) return '';
  return digits;
}

export function isBcryptHash(value) {
  return typeof value === 'string' && value.startsWith('$2');
}

export async function hashPin(pin) {
  const clean = normalizePin(pin);
  if (!clean) throw new Error('PIN iwe tarakimu 4.');
  return bcrypt.hash(clean, 10);
}

export async function pinMatches(stored, pin) {
  const clean = normalizePin(pin);
  if (!clean || !stored) return false;
  if (isBcryptHash(stored)) return bcrypt.compare(clean, stored);
  return stored === clean;
}

export async function findUserByPin(pin, { roles, userId, email } = {}) {
  const clean = normalizePin(pin);
  if (!clean) return null;
  const wanted = email ? String(email).trim().toLowerCase() : '';
  const users = await prisma.user.findMany({
    where: {
      active: true,
      ...(roles ? { role: { in: roles } } : {}),
      ...(userId ? { id: userId } : {}),
    },
  });
  for (const user of users) {
    if (wanted && user.email.toLowerCase() !== wanted) continue;
    if (!(await pinMatches(user.pin, clean))) continue;
    if (!isBcryptHash(user.pin)) {
      await prisma.user.update({ where: { id: user.id }, data: { pin: await hashPin(clean) } });
    }
    return user;
  }
  return null;
}

export async function upgradePlainPins() {
  const users = await prisma.user.findMany({ select: { id: true, pin: true } });
  for (const user of users) {
    if (!user.pin || isBcryptHash(user.pin) || !/^\d{4}$/.test(user.pin)) continue;
    await prisma.user.update({ where: { id: user.id }, data: { pin: await hashPin(user.pin) } });
  }
}
