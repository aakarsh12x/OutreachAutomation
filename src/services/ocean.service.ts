import { z } from "zod";
import type { Company } from "../models/index.js";
import type { OceanClient } from "../types/services.js";
import { dedupeBy } from "../utils/dedupe.js";
import { normalizeDomain } from "../utils/domain.js";
import { HttpClient } from "../utils/http-client.js";

const responseSchema = z.object({
  companies: z.array(z.object({
    company: z.object({
      domain: z.string(),
      name: z.string().nullish()
    })
  })).default([])
});

export class OceanService implements OceanClient {
  constructor(
    private readonly http: HttpClient,
    private readonly apiKey: string,
    private readonly limit: number
  ) {}

  async findLookalikes(seedDomain: string): Promise<Company[]> {
    const response = await this.http.request(
      "https://api.ocean.io/v3/search/companies",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-token": this.apiKey },
        body: JSON.stringify({
          size: this.limit,
          fields: ["domain", "name"],
          companiesFilters: {
            lookalikeDomains: [seedDomain],
            excludeDomains: [seedDomain]
          }
        })
      },
      responseSchema
    );

    const companies = (response.companies ?? []).flatMap(({ company }) => {
      try {
        return [{ domain: normalizeDomain(company.domain), ...(company.name ? { name: company.name } : {}) }];
      } catch {
        return [];
      }
    }).filter((company) => company.domain !== seedDomain);
    return dedupeBy(companies, (company) => company.domain);
  }
}
