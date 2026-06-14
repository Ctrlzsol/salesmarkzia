import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const COOKIE_NAME = "mkz_admin";
const COOKIE_VALUE = "ok";
const isProd = process.env.NODE_ENV === "production";
const MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

// Timing-safe password comparison. Both sides are hashed to a fixed length so
// timingSafeEqual never throws on length mismatch and no length info leaks.
export function checkPassword(input: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || typeof input !== "string") return false;
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function setAdminCookie(res: Response): void {
  res.cookie(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    signed: true,
    maxAge: MAX_AGE,
    path: "/",
  });
}

export function clearAdminCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function isAuthed(req: Request): boolean {
  return req.signedCookies?.[COOKIE_NAME] === COOKIE_VALUE;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthed(req)) {
    res.status(401).json({ error: "غير مصرح — يلزم تسجيل دخول المدير" });
    return;
  }
  next();
}

// CSRF defence: a state-changing request must originate from our own origin.
// The browser always sends Origin (or at least Referer) on fetch POST/PATCH/
// DELETE; we require its host to match the request Host.
function sameOrigin(req: Request): boolean {
  const host = req.get("host");
  if (!host) return false;
  const candidate = req.get("origin") || req.get("referer");
  if (!candidate) return false;
  try {
    return new URL(candidate).host === host;
  } catch {
    return false;
  }
}

export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "طلب غير موثوق المصدر" });
    return;
  }
  next();
}
