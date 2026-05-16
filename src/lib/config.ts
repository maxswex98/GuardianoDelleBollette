import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_NAME: z.string().default("Bill Guardian"),
  OWNER_NAME: z.string().default("BERTOLI MASSIMILIANO"),
  SERVICE_ADDRESS: z.string().default("Via di casa, paese"),
  BASIC_AUTH_USER: z.string().min(1),
  BASIC_AUTH_PASSWORD: z.string().min(1),
  WATCH_DIRECTORY: z.string().default("./data/inbox"),
  ARCHIVE_DIRECTORY: z.string().default("./data/archive"),
  HOST_WATCH_DIRECTORY: z.string().default("./data/inbox"),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(30000),
  ALERT_THRESHOLD_PERCENT: z.coerce.number().positive().default(15)
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_URL: process.env.APP_URL,
  APP_NAME: process.env.APP_NAME,
  OWNER_NAME: process.env.OWNER_NAME,
  SERVICE_ADDRESS: process.env.SERVICE_ADDRESS,
  BASIC_AUTH_USER: process.env.BASIC_AUTH_USER,
  BASIC_AUTH_PASSWORD: process.env.BASIC_AUTH_PASSWORD,
  WATCH_DIRECTORY: process.env.WATCH_DIRECTORY,
  ARCHIVE_DIRECTORY: process.env.ARCHIVE_DIRECTORY,
  HOST_WATCH_DIRECTORY: process.env.HOST_WATCH_DIRECTORY,
  POLL_INTERVAL_MS: process.env.POLL_INTERVAL_MS,
  ALERT_THRESHOLD_PERCENT: process.env.ALERT_THRESHOLD_PERCENT
});
