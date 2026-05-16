import path from "node:path";
import { env } from "@/lib/config";

export const resolvedWatchDirectory = path.resolve(process.cwd(), env.WATCH_DIRECTORY);
export const resolvedArchiveDirectory = path.resolve(process.cwd(), env.ARCHIVE_DIRECTORY);
