import bcrypt from "bcryptjs";

export { PASSWORD_MIN_LENGTH, passwordProblem } from "./password-rules";

const ROUNDS = 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
