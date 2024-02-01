import { Minimatch } from "minimatch";

// Ignore file
export const IGNORE_UPLOAD_FILE = [
  "_worker.js",
  "_redirects",
  "_headers",
  "_routes.json",
  "functions",
  "**/.DS_Store",
  "**/node_modules",
  "**/.git",
].map((pattern) => new Minimatch(pattern));
// Config assets & bucket
export const MAX_ASSET_SIZE = 25 * 1024 * 1024; // 25MB
export const MAX_BUCKET_SIZE = 50 * 1024 * 1024; // 50MB / 1 Bucket
export const MAX_BUCKET_CONCURRENCY_SIZE = 3; // Block size
export const MAX_BUCKET_FILE_COUNT = 5000; // Max file count size
