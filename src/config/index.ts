import "dotenv/config";
import { z } from "zod";

export const configSchema = z.object({
  OCEAN_API_KEY: z.string().min(1),
  PROSPEO_API_KEY: z.string().min(1),
  EAZYREACH_CLIENT_ID: z.string().min(1),
  EAZYREACH_CLIENT_SECRET: z.string().min(1),
  BREVO_API_KEY: z.string().min(1),
  BREVO_SENDER_EMAIL: z.string().email(),
  BREVO_SENDER_NAME: z.string().min(1),
  OCEAN_COMPANY_LIMIT: z.coerce.number().int().min(1).max(10000).default(25),
  PROSPEO_MAX_PAGES: z.coerce.number().int().min(1).max(1000).default(4),
  REQUEST_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(3),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30000),
  REQUEST_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
  REQUEST_BACKOFF_MS: z.coerce.number().int().min(1).default(1000),
  EMAIL_SUBJECT_TEMPLATE: z.string().min(1).default("Quick idea for {{company}}"),
  EMAIL_BODY_TEMPLATE: z.string().min(1).default(
    "Hi {{firstName}},\n\nI noticed your work as {{title}} at {{company}} and wanted to reach out with a quick idea that may be relevant to your team.\n\nWould you be open to a brief conversation?\n\nBest regards"
  )
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse(env);
}
