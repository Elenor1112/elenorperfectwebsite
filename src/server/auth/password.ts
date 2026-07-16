import bcrypt from 'bcryptjs';

const COST = 12;

// Hash of a random throwaway string. Compared against when the email doesn't
// match any user so that "unknown email" and "wrong password" take the same
// time (no account-enumeration timing signal).
const DUMMY_HASH = '$2b$12$Uj44wDSFFcej4aJrcETTVuMYao7t/hW8PnUTGYf01fYRBUtnygcMu';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  return bcrypt.compare(password, hash ?? DUMMY_HASH);
}
