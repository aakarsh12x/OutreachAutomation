import { describe, expect, it, vi } from "vitest";
import type { Contact, PipelineReport, VerifiedContact } from "../src/models/index.js";
import { OutreachPipeline } from "../src/pipeline/outreach.pipeline.js";

const contact: Contact = {
  fullName: "Ada A", firstName: "Ada", jobTitle: "CTO", linkedinUrl: "https://linkedin.com/in/ada",
  companyDomain: "acme.com", companyName: "Acme"
};
const verified: VerifiedContact = { ...contact, email: "ada@acme.com" };
const logger = { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe("OutreachPipeline", () => {
  it("continues after company failures, deduplicates emails, and writes a declined report", async () => {
    let written: PipelineReport | undefined;
    const pipeline = new OutreachPipeline({
      ocean: { findLookalikes: vi.fn().mockResolvedValue([{ domain: "acme.com" }, { domain: "bad.com" }]) },
      prospeo: { findDecisionMakers: vi.fn().mockImplementation(({ domain }) => domain === "bad.com" ? Promise.reject(new Error("failed")) : Promise.resolve([contact])) },
      eazyreach: { resolveVerifiedEmail: vi.fn().mockResolvedValue(verified) },
      brevo: { send: vi.fn() },
      logger,
      confirmSend: vi.fn().mockResolvedValue(false),
      writeReport: vi.fn().mockImplementation((report) => { written = report; })
    });
    const report = await pipeline.run("seed.com");
    expect(report.counts).toMatchObject({ companies: 2, contacts: 1, verifiedEmails: 1, sent: 0 });
    expect(report.failures[0]?.stage).toBe("prospeo");
    expect(written?.sendConfirmed).toBe(false);
  });

  it("records partial Brevo failures", async () => {
    const pipeline = new OutreachPipeline({
      ocean: { findLookalikes: vi.fn().mockResolvedValue([{ domain: "acme.com" }]) },
      prospeo: { findDecisionMakers: vi.fn().mockResolvedValue([contact, { ...contact, linkedinUrl: "https://linkedin.com/in/b", fullName: "Bob B", firstName: "Bob" }]) },
      eazyreach: { resolveVerifiedEmail: vi.fn().mockImplementation((c) => Promise.resolve({ ...c, email: c.firstName === "Ada" ? "ada@acme.com" : "bob@acme.com" })) },
      brevo: { send: vi.fn().mockImplementation((c) => Promise.resolve(c.firstName === "Ada"
        ? { email: c.email, linkedinUrl: c.linkedinUrl, status: "sent", messageId: "1" }
        : { email: c.email, linkedinUrl: c.linkedinUrl, status: "failed", error: "rejected" })) },
      logger,
      confirmSend: vi.fn().mockResolvedValue(true),
      writeReport: vi.fn()
    });
    const report = await pipeline.run("seed.com");
    expect(report.counts).toMatchObject({ sent: 1, failedToSend: 1 });
    expect(report.failures.some((failure) => failure.stage === "brevo")).toBe(true);
  });
});
