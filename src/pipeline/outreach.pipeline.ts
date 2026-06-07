import ora from "ora";
import type { Company, Contact, PipelineFailure, PipelineReport, SendResult, VerifiedContact } from "../models/index.js";
import type { BrevoClient, EazyreachClient, Logger, OceanClient, ProspeoClient } from "../types/services.js";
import { dedupeBy } from "../utils/dedupe.js";
import { errorCode, errorMessage } from "../utils/error.js";
import { writeReport } from "../utils/report.js";

export interface PipelineDependencies {
  ocean: OceanClient;
  prospeo: ProspeoClient;
  eazyreach: EazyreachClient;
  brevo: BrevoClient;
  logger: Logger;
  confirmSend: () => Promise<boolean>;
  writeReport?: (report: PipelineReport) => Promise<void>;
}

export class OutreachPipeline {
  constructor(private readonly deps: PipelineDependencies) {}

  async run(seedDomain: string): Promise<PipelineReport> {
    const startedAt = new Date().toISOString();
    const failures: PipelineFailure[] = [];
    let companies: Company[] = [];
    let contacts: Contact[] = [];
    let emails: VerifiedContact[] = [];
    let sendStatus: SendResult[] = [];
    let sendConfirmed = false;

    const oceanSpinner = ora("Finding similar companies").start();
    try {
      companies = await this.deps.ocean.findLookalikes(seedDomain);
      oceanSpinner.succeed(`Found ${companies.length} similar companies`);
    } catch (error) {
      oceanSpinner.fail("Failed to find similar companies");
      failures.push(this.failure("ocean", seedDomain, error));
    }

    const contactSpinner = ora("Finding decision makers").start();
    const contactGroups = await Promise.all(companies.map(async (company) => {
      try {
        return await this.deps.prospeo.findDecisionMakers(company);
      } catch (error) {
        failures.push(this.failure("prospeo", company.domain, error));
        return [];
      }
    }));
    contacts = dedupeBy(contactGroups.flat(), (contact) => contact.linkedinUrl || contact.id || contact.fullName);
    contactSpinner.succeed(`Found ${contacts.length} decision makers`);

    const emailSpinner = ora("Resolving verified emails").start();
    const resolved = await Promise.all(contacts.map(async (contact) => {
      try {
        return await this.deps.eazyreach.resolveVerifiedEmail(contact);
      } catch (error) {
        failures.push(this.failure("eazyreach", contact.linkedinUrl, error));
        return null;
      }
    }));
    emails = dedupeBy(resolved.filter((contact): contact is VerifiedContact => contact !== null), (contact) => contact.email);
    emailSpinner.succeed(`Resolved ${emails.length} verified emails`);
    this.deps.logger.success(`Ready to send ${emails.length} emails`);

    console.log("");
    console.log(`Companies Found: ${companies.length}`);
    console.log(`Contacts Found: ${contacts.length}`);
    console.log(`Verified Emails: ${emails.length}`);
    console.log(`Emails To Send: ${emails.length}`);
    console.log("-----------------");
    sendConfirmed = emails.length > 0 && await this.deps.confirmSend();

    if (sendConfirmed) {
      const sendSpinner = ora("Sending emails").start();
      sendStatus = await Promise.all(emails.map((contact) => this.deps.brevo.send(contact)));
      for (const result of sendStatus.filter((item) => item.status === "failed")) {
        failures.push({ stage: "brevo", item: result.email, message: result.error ?? "Unknown send failure" });
      }
      const sent = sendStatus.filter((result) => result.status === "sent").length;
      const failed = sendStatus.length - sent;
      sendSpinner.stop();
      this.deps.logger.success(`${sent} sent`);
      if (failed > 0) this.deps.logger.error(`${failed} failed`);
    } else {
      this.deps.logger.warn(emails.length === 0 ? "No verified emails to send" : "Sending cancelled");
    }

    const report = this.report(seedDomain, startedAt, sendConfirmed, companies, contacts, emails, sendStatus, failures);
    await (this.deps.writeReport ?? writeReport)(report);
    return report;
  }

  private failure(stage: PipelineFailure["stage"], item: string, error: unknown): PipelineFailure {
    const code = errorCode(error);
    return { stage, item, message: errorMessage(error), ...(code ? { code } : {}) };
  }

  private report(
    seedDomain: string,
    startedAt: string,
    sendConfirmed: boolean,
    companies: Company[],
    contacts: Contact[],
    emails: VerifiedContact[],
    sendStatus: SendResult[],
    failures: PipelineFailure[]
  ): PipelineReport {
    const sent = sendStatus.filter((result) => result.status === "sent").length;
    return {
      seedDomain,
      startedAt,
      completedAt: new Date().toISOString(),
      sendConfirmed,
      companies,
      contacts,
      emails,
      sendStatus,
      failures,
      counts: {
        companies: companies.length,
        contacts: contacts.length,
        verifiedEmails: emails.length,
        emailsToSend: emails.length,
        sent,
        failedToSend: sendStatus.length - sent
      }
    };
  }
}
