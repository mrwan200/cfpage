import { program } from "commander";
import { deployCloudflarePage } from "./commands/deploy";


// Init argument(s)
program
  .name("Cloudflare page deploy")
  .description(
    "A simple for deploy Cloudflare page with custom data in .env file"
  )
  .version("0.1.0-alpha.1");

// Command
program
  .command("deploy")
  .description("Deploy project into Cloudflare page")
  .option(
    "-e, --env",
    'Load config .env for get "CF_EMAIL", "CF_TOKEN" and "CF_PAGE_NAME"',
    ".env"
  )
  .action((args, options) =>
    deployCloudflarePage("deploy",  options.args, args)
  );

program.parse();
