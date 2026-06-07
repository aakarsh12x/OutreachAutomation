#!/usr/bin/env node
import { ZodError } from "zod";
import { loadConfig } from "./config/index.js";
import { CliLogger } from "./logger/index.js";
import { OutreachPipeline } from "./pipeline/outreach.pipeline.js";
import { BrevoService } from "./services/brevo.service.js";
import { EazyreachService } from "./services/eazyreach.service.js";
import { OceanService } from "./services/ocean.service.js";
import { ProspeoService } from "./services/prospeo.service.js";
import { normalizeDomain } from "./utils/domain.js";
import { errorMessage } from "./utils/error.js";
import { HttpClient } from "./utils/http-client.js";
import { confirmSend } from "./utils/prompt.js";

function domainArgument(args: string[]): string | undefined {
  const positional = args.find((arg) => arg.startsWith("domain="));
  const flagIndex = args.indexOf("--domain");
  return positional?.slice("domain=".length) ?? (flagIndex >= 0 ? args[flagIndex + 1] : undefined);
}

async function main(): Promise<void> {
  const logger = new CliLogger();
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("Usage: npm start -- domain=company.com");
    return;
  }
  const rawDomain = domainArgument(process.argv.slice(2));
  if (!rawDomain) throw new Error("Missing domain. Usage: npm start -- domain=company.com");
  const domain = normalizeDomain(rawDomain);
  const config = loadConfig();
  const http = new HttpClient({
    concurrency: config.REQUEST_CONCURRENCY,
    timeoutMs: config.REQUEST_TIMEOUT_MS,
    maxRetries: config.REQUEST_MAX_RETRIES,
    backoffMs: config.REQUEST_BACKOFF_MS
  });

  const pipeline = new OutreachPipeline({
    ocean: new OceanService(http, config.OCEAN_API_KEY, config.OCEAN_COMPANY_LIMIT),
    prospeo: new ProspeoService(http, config.PROSPEO_API_KEY, config.PROSPEO_MAX_PAGES),
    eazyreach: new EazyreachService(http, config.EAZYREACH_CLIENT_ID, config.EAZYREACH_CLIENT_SECRET),
    brevo: new BrevoService(
      http,
      config.BREVO_API_KEY,
      config.BREVO_SENDER_EMAIL,
      config.BREVO_SENDER_NAME,
      config.EMAIL_SUBJECT_TEMPLATE,
      config.EMAIL_BODY_TEMPLATE
    ),
    logger,
    confirmSend
  });
  await pipeline.run(domain);
}

main().catch((error: unknown) => {
  if (error instanceof ZodError) {
    console.error("Configuration or input validation failed:");
    for (const issue of error.issues) console.error(`- ${issue.path.join(".") || "value"}: ${issue.message}`);
  } else {
    console.error(errorMessage(error));
  }
  process.exitCode = 1;
});
