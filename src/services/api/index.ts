import { readFileSync } from "fs";
import { Bar, Presets } from "cli-progress";
import { FormData } from "undici";

import { CFResponse } from "./interface/api.interface";
import { IRequestConfig } from "./interface/config.interface";
import { createBucketConcurrency, getFileHash } from "./utils";
import { MAX_BUCKET_CONCURRENCY_SIZE } from "./constant";
import { INewDeployment } from "./interface/deployment.interface";

export default class CloudflareAPI {
  private readonly api = "https://api.cloudflare.com/client/v4";
  private readonly email: string;
  private readonly token: string;
  private accountId: string | null = null;

  constructor(email: string, token: string) {
    this.email = email;
    this.token = token;
  }

  async getAccountId() {
    // Get account(s) list
    const resp = await this.requestApi<any>({
      method: "GET",
      path: "/accounts",
      headers: this.getHeaders(),
    });
    // Find user
    for (const account of resp?.result || []) {
      if (
        account.name.toLowerCase().startsWith(this.email.toLocaleLowerCase())
      ) {
        // Replace it
        this.accountId = account.id;
        return account.id;
      }
    }

    return null;
  }

  async getPagesInfo(project_id: string) {
    return this.requestApi<any>({
      method: "GET",
      path: `/accounts/${this.accountId}/pages/projects/${project_id}`,
      headers: this.getHeaders(),
    });
  }

  async createNewDeployment(project_id: string, data: INewDeployment) {
    const form = new FormData();
    form.append("manifest", JSON.stringify(data.manifest));
    form.append("branch", data.branch || "main");
    if (data.commit_message) {
      form.append("commit_message", data.commit_message);
    }
    if (data.commit_hash) {
      form.append("commit_hash", data.commit_hash);
    }

    return this.requestApi<any>({
      method: "POST",
      path: `/accounts/${this.accountId}/pages/projects/${project_id}/deployments`,
      body: form,
      headers: this.getHeaders(),
    });
  }

  async uploadFile(project_id: string, path: string) {
    const result = {
      cached: 0,
      uploaded: 0,
      manifest: {},
    };

    const respJwt = await this.requestApi<{ jwt: string }>({
      method: "GET",
      path: `/accounts/${this.accountId}/pages/projects/${project_id}/upload-token`,
      headers: this.getHeaders(),
    });
    const headers = {
      "Content-Type": "application/json",
      authorization: `Bearer ${respJwt.result.jwt}`,
    };

    // Create file hash
    console.log(`🚧  Checking missing file....`);
    const fileHashed = await getFileHash(path, "/");
    // Check missing file
    const hashedPayload = {
      hashes: fileHashed.map(({ hash }) => hash),
    };
    const respMissingFile = await this.requestApi<string[]>({
      method: "POST",
      headers: headers,
      path: `/pages/assets/check-missing`,
      body: JSON.stringify(hashedPayload),
    });
    const totalMissingFile = fileHashed
      .filter((f) => respMissingFile.result.includes(f.hash))
      .sort((a, b) => b.sizeInBytes - a.sizeInBytes);
    // Store data
    result.cached = fileHashed.length - totalMissingFile.length;
    result.uploaded = totalMissingFile.length;
    result.manifest = Object.fromEntries(
      fileHashed.map((file) => [file.url, file.hash])
    );
    if (totalMissingFile.length > 0) {
      console.log("🚀  Uploading...");
      // Create bucket file
      // TODO: Please create retry upload for reason if lose data
      const buckets = createBucketConcurrency(totalMissingFile);

      // Create prgress bar
      const bar = new Bar({}, Presets.shades_classic);
      bar.start(MAX_BUCKET_CONCURRENCY_SIZE, 0);

      for (const [idx, bucket] of buckets.entries()) {
        if (bucket.files.length === 0) {
          console.log(
            `🪣  Bucket slot ${idx + 1} has empty payload. Skipping...`
          );
          bar.increment();
          continue;
        }
        // Create payload for upload
        const payload = bucket.files.map((i) => ({
          key: i.hash,
          value: readFileSync(i.path).toString("base64"),
          metadata: {
            contentType: i.contentType,
          },
          base64: true,
        }));
        // Upload it
        await this.requestApi<string[]>({
          method: "POST",
          headers: headers,
          path: `/pages/assets/upload`,
          body: JSON.stringify(payload),
        });
        bar.increment();
      }
      // Stop for completed
      bar.stop();
      // Upsert hash
      await this.requestApi<string[]>({
        method: "POST",
        headers: headers,
        path: `/pages/assets/upsert-hashes`,
        body: JSON.stringify(hashedPayload),
      });

      console.log(`✅  Upload completed!`);
    } else {
      console.log(`🫠  Not exist new file to upload. Skipping...`);
    }

    return result;
  }

  async createPage(project_id: string, branch: string = "main") {
    return this.requestApi<any>({
      method: "POST",
      path: `/accounts/${this.accountId}/pages/projects`,
      body: JSON.stringify({
        name: project_id,
        production_branch: branch,
      }),
      headers: this.getHeaders(),
    });
  }

  private async requestApi<D>(config: IRequestConfig): Promise<CFResponse<D>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      config.timeout || 30 * 1000
    );

    const resp = await fetch(`${this.api}${config.path}`, {
      body: config.body,
      method: config.method,
      signal: controller.signal,
      headers: config.headers,
    });
    // If response success clear timeout it
    clearTimeout(timeoutId);

    const body = (await resp.json()) as CFResponse<D>;
    if ((body.errors || []).length > 0) {
      // Get latest error
      const err = body.errors[0];
      throw new Error(`Cloudflare error: ${err.code} [${err.message}]`);
    }
    return body;
  }

  private getHeaders() {
    return {
      "X-Auth-Email": this.email,
      "X-Auth-Key": this.token,
    };
  }
}
