import fs from "fs/promises";
import path from "path";
import mime from "mime";
import { hash } from "blake3-wasm";

import {
  IGNORE_UPLOAD_FILE,
  MAX_ASSET_SIZE,
  MAX_BUCKET_CONCURRENCY_SIZE,
  MAX_BUCKET_FILE_COUNT,
  MAX_BUCKET_SIZE,
} from "./constant";
import { IFileHash } from "./interface/file-hash.interface";

async function getHash(_path: string) {
  const rawContent = (await fs.readFile(_path))?.toString("base64") || "";
  const ext = path.extname(_path).substring(1);

  return hash(rawContent + ext)
    .toString("hex")
    .slice(0, 32);
}

export async function getFileHash(dir: string, offsetDir: string = "/") {
  // File path
  const fileArray: IFileHash[] = [];

  // Get dir and file path
  const dirFullPath = path.resolve(__dirname, dir);
  const files = await fs.readdir(dirFullPath);

  for (const file of files) {
    const fileFullPath = path.join(dirFullPath, file);
    // Get stat
    const stat = await fs.stat(fileFullPath);
    // Check if symbol link
    if (stat.isSymbolicLink()) continue;
    // if(IGNORE.)
    for (const ignore of IGNORE_UPLOAD_FILE) {
      if (ignore.match(file)) continue;
    }
    // Check file size
    if (stat.size > MAX_ASSET_SIZE) {
      throw new Error("File maxium per size is 25MB");
    }
    // Check if directory
    if (stat.isDirectory()) {
      fileArray.push(
        ...(await getFileHash(fileFullPath, offsetDir + `${file}/`))
      );
    } else {
      // Push it
      fileArray.push({
        path: fileFullPath,
        url: `${offsetDir}${file}`,
        contentType: mime.getType(file) || "application/octet-stream",
        sizeInBytes: stat.size,
        hash: await getHash(fileFullPath),
      });
    }
  }

  return fileArray;
}

export function createBucketConcurrency(sortedFile: IFileHash[]) {
  // Create new bucket first (Max 150MB)
  const buckets = new Array(MAX_BUCKET_CONCURRENCY_SIZE).fill(null).map(() => ({
    files: [],
    remainingSize: MAX_BUCKET_SIZE,
  })) as {
    files: IFileHash[];
    remainingSize: number;
  }[];

  let bucketOffset = 0;
  for (const file of sortedFile || []) {
    let inserted = false;

    for (let i = 0; i < buckets.length; i++) {
      const index = (i + bucketOffset) % buckets.length;
      const bucket = buckets[index];

      if (
        bucket.remainingSize >= file.sizeInBytes &&
        bucket.files.length < MAX_BUCKET_FILE_COUNT
      ) {
        bucket.files.push(file);
        bucket.remainingSize -= file.sizeInBytes;
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      buckets.push({
        files: [file],
        remainingSize: MAX_BUCKET_SIZE - file.sizeInBytes,
      });
    }
    bucketOffset++;
  }

  return buckets;
}
