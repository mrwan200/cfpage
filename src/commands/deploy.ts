import fs from "fs/promises";
import path from "path";

import dotenv from "dotenv";
import { ZodError, z } from "zod";
import CloudflareAPI from "../services/api";

const ENV_VALIDATE = z.object({
  CF_EMAIL: z.string().email(),
  CF_ACCOUNT: z.string(),
  CF_TOKEN: z.string(),
  CF_PROJECT_NAME: z.string(),
  CF_BRANCH: z.string().optional(),
});
const PROJECT_BRANCH = "main";

export async function deployCloudflarePage(
  name: string,
  sub: string[],
  options: any
) {
  if (sub.length === 1) {
    // Trying to open folder exist
    const outputFolder = path.resolve(process.cwd(), sub[0]);
    try {
      await fs.readdir(outputFolder);
    } catch (e) {
      return console.log("😫 Can't open folder:", outputFolder);
    }

    // Checking .env
    const envFile = path.resolve(process.cwd(), options.env);
    const { error, parsed } = dotenv.config({
      path: envFile,
    });
    if (!error) {
      // Validate env
      try {
        ENV_VALIDATE.parse(parsed);
      } catch (e) {
        const err = e as ZodError;
        console.log(`🫡  "${err.issues[0].path}" has ${err.issues[0].message}`);
      }

      // Init cloudflare
      const cf = new CloudflareAPI(
        parsed?.CF_EMAIL || "",
        parsed?.CF_TOKEN || "",
        parsed?.CF_ACCOUNT || "",
      );
      // Load account first
      console.log(`⚡️  Getting account id....`);
      const accountId = await cf.getAccountId();
      if (!accountId)
        return console.log(
          "❓ Account not exist. Please change account name has startswith E-Mail"
        );
      // Get project info
      //   c
      try {
        await cf.getPagesInfo(parsed?.CF_PROJECT_NAME || "");
      } catch (e) {
        console.log("🫠  Project not exist. Createing....");
        await cf.createPage(
          parsed?.CF_PROJECT_NAME || "",
          parsed?.CF_BRANCH || PROJECT_BRANCH
        );
        console.log("✅ Sweet! Cloudflare page has been created!");
      }
      // Getting started to upload
      const result = await cf.uploadFile(
        parsed?.CF_PROJECT_NAME || "",
        outputFolder
      );
      // Deploy script it
      const deploy = await cf.createNewDeployment(
        parsed?.CF_PROJECT_NAME || "",
        {
          manifest: result.manifest,
          branch: parsed?.CF_BRANCH || PROJECT_BRANCH,
        }
      );

      console.log(`\n🎉 Hooray! Your website has been deployed!\n`);
      console.log(
        `🌐 URL [Production]: https://${deploy.result.project_name}.pages.dev`
      );
      console.log(`🌐 URL [Branch]: ${deploy.result.url}\n`);
    } else {
      console.log(`🫤 Missing file ${options.env}`);
    }
  } else {
    console.log("🫤 Missing output folder");
  }
}
