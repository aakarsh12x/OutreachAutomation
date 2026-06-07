import { z } from "zod";
import type { Company, Contact } from "../models/index.js";
import type { ProspeoClient } from "../types/services.js";
import { dedupeBy } from "../utils/dedupe.js";
import { HttpClient } from "../utils/http-client.js";
import { isAllowedDecisionMakerTitle } from "../utils/title.js";

const personSchema = z.object({
  person_id: z.string().nullish(),
  first_name: z.string().nullish(),
  full_name: z.string().nullish(),
  linkedin_url: z.string().nullish(),
  current_job_title: z.string().nullish()
});

const responseSchema = z.object({
  error: z.boolean(),
  results: z.array(z.object({
    person: personSchema,
    company: z.object({ name: z.string().nullish(), website: z.string().nullish() }).passthrough().nullish()
  })).default([]),
  pagination: z.object({
    current_page: z.number(),
    total_page: z.number()
  }).nullish()
});

export class ProspeoService implements ProspeoClient {
  constructor(
    private readonly http: HttpClient,
    private readonly apiKey: string,
    private readonly maxPages: number
  ) {}

  async findDecisionMakers(company: Company): Promise<Contact[]> {
    const contacts: Contact[] = [];
    for (let page = 1; page <= this.maxPages; page += 1) {
      const response = await this.http.request(
        "https://api.prospeo.io/search-person",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-KEY": this.apiKey },
          body: JSON.stringify({
            page,
            filters: {
              company: { websites: { include: [company.domain] } },
              person_seniority: { include: ["Founder/Owner", "C-Suite", "Vice President"] }
            }
          })
        },
        responseSchema
      );

      for (const result of response.results ?? []) {
        const person = result.person;
        const title = person.current_job_title?.trim();
        const linkedinUrl = person.linkedin_url?.trim();
        const fullName = person.full_name?.trim();
        if (!title || !linkedinUrl || !fullName || !isAllowedDecisionMakerTitle(title)) continue;
        contacts.push({
          ...(person.person_id ? { id: person.person_id } : {}),
          fullName,
          firstName: person.first_name?.trim() || fullName.split(/\s+/)[0] || fullName,
          jobTitle: title,
          linkedinUrl,
          companyDomain: company.domain,
          companyName: result.company?.name?.trim() || company.name || company.domain
        });
      }
      if (!response.pagination || page >= response.pagination.total_page) break;
    }
    return dedupeBy(contacts, (contact) => contact.linkedinUrl || contact.id || contact.fullName);
  }
}
