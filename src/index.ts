#! /usr/bin/env node

import args from "args";
import { deployCloudflarePage } from "./commands/deploy";

// Init argument(s)
args
  .option(
    "env",
    'Load config .env for get "CF_EMAIL", "CF_TOKEN", "CF_PAGE_NAME" and "CF_ACCOUNT"',
    ".env"
  )
  .command(
    "deploy",
    "Deploy project into Cloudflare page",
    deployCloudflarePage
  );

args.parse(process.argv);