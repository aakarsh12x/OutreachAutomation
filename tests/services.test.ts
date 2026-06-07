import { describe, expect, it, vi } from "vitest";
import type { Contact } from "../src/models/index.js";
import { EazyreachService } from "../src/services/eazyreach.service.js";
import { OceanService } from "../src/services/ocean.service.js";
import { ProspeoService } from "../src/services/prospeo.service.js";
import { HttpClient } from "../src/utils/http-client.js";

function httpWith(...responses: Array<{ body: unknown; status?: number }>): HttpClient {
  const fetchImpl = vi.fn();
  for (const response of responses) {
    fetchImpl.mockResolvedValueOnce(new Response(JSON.stringify(response.body), { status: response.status ?? 200 }));
  }
  return new HttpClient({ concurrency: 3, timeoutMs: 1000, maxRetries: 0, backoffMs: 1, fetchImpl });
}

describe("services", () => {
  it("normalizes and deduplicates Ocean companies", async () => {
    const service = new OceanService(httpWith({ body: { companies: [
      { company: { domain: "WWW.Acme.com", name: "Acme" } },
      { company: { domain: "acme.com", name: "Acme" } },
      { company: { domain: "seed.com", name: "Seed" } }
    ] } }), "key", 25);
    await expect(service.findLookalikes("seed.com")).resolves.toEqual([{ domain: "acme.com", name: "Acme" }]);
  });

  it("paginates Prospeo and filters titles and missing LinkedIn URLs", async () => {
    const page = (current: number, total: number, title: string, linkedin = "https://linkedin.com/in/a") => ({
      error: false,
      results: [{ person: { person_id: String(current), first_name: "Ada", full_name: "Ada A", linkedin_url: linkedin, current_job_title: title }, company: { name: "Acme" } }],
      pagination: { current_page: current, total_page: total }
    });
    const service = new ProspeoService(httpWith({ body: page(1, 2, "CEO") }, { body: page(2, 2, "Director") }), "key", 4);
    const contacts = await service.findDecisionMakers({ domain: "acme.com" });
    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.jobTitle).toBe("CEO");
  });

  it("keeps only verified Eazyreach emails and reuses auth token", async () => {
    const http = httpWith(
      { body: { status: "success", auth_token: "token", id: "1" } },
      { body: { status: "success", emails: [{ email: "ada@acme.com", verification: "verified", source: "work" }] } },
      { body: { status: "success", emails: [{ email: "ada@gmail.com", verification: "probable" }] } }
    );
    const service = new EazyreachService(http, "id", "secret");
    const contact: Contact = { fullName: "Ada A", firstName: "Ada", jobTitle: "CEO", linkedinUrl: "https://linkedin.com/in/a", companyDomain: "acme.com", companyName: "Acme" };
    await expect(service.resolveVerifiedEmail(contact)).resolves.toMatchObject({ email: "ada@acme.com" });
    await expect(service.resolveVerifiedEmail(contact)).resolves.toBeNull();
  });

  it("accepts Eazyreach's live camelCase token response", async () => {
    const http = httpWith(
      { body: { affectedRows: 1, authToken: "token", id: 1 } },
      { body: { status: "success", emails: [] } }
    );
    const service = new EazyreachService(http, "id", "secret");
    const contact: Contact = { fullName: "Ada A", firstName: "Ada", jobTitle: "CEO", linkedinUrl: "https://linkedin.com/in/a", companyDomain: "acme.com", companyName: "Acme" };
    await expect(service.resolveVerifiedEmail(contact)).resolves.toBeNull();
  });
});
