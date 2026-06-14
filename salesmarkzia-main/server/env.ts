// Fail fast at boot if a required secret is missing, with an explicit message.
// Imported first in server.ts so this runs before any DB/auth module loads.
const REQUIRED_ENV = ["DATABASE_URL", "ADMIN_PASSWORD", "SESSION_SECRET"] as const;

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `Missing required environment variable(s): ${missing.join(", ")}.\n` +
      `Set them in the Secrets panel (or .env.local) before starting the server.`,
  );
  process.exit(1);
}
