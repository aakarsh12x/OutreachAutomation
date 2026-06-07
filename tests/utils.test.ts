import { describe, expect, it } from "vitest";
import type { VerifiedContact } from "../src/models/index.js";
import { configSchema } from "../src/config/index.js";
import { dedupeBy } from "../src/utils/dedupe.js";
import { normalizeDomain } from "../src/utils/domain.js";
import { HttpError, isRetryable } from "../src/utils/error.js";
import { renderTemplate } from "../src/utils/template.js";
import { isAllowedDecisionMakerTitle } from "../src/utils/title.js";

describe("utilities", () => {
  it("normalizes domains", () => {
    expect(normalizeDomain("https://www.Stripe.com/path")).toBe("stripe.com");
    expect(() => normalizeDomain("not-a-domain")).toThrow();
  });

  it("filters only requested decision maker roles", () => {
    expect(isAllowedDecisionMakerTitle("Co-Founder & CEO")).toBe(true);
    expect(isAllowedDecisionMakerTitle("VP of Sales")).toBe(true);
    expect(isAllowedDecisionMakerTitle("Director of Sales")).toBe(false);
  });

  it("deduplicates case-insensitively", () => {
    expect(dedupeBy(["A@x.com", "a@x.com", "b@x.com"], (value) => value)).toEqual(["A@x.com", "b@x.com"]);
  });

  it("renders personalization placeholders", () => {
    const contact: VerifiedContact = {
      fullName: "Ada Lovelace", firstName: "Ada", jobTitle: "CTO", linkedinUrl: "https://linkedin.com/in/ada",
      companyDomain: "example.com", companyName: "Example", email: "ada@example.com"
    };
    expect(renderTemplate("Hi {{firstName}}, {{title}} at {{company}}", contact)).toBe("Hi Ada, CTO at Example");
  });

  it("classifies retryable errors", () => {
    expect(isRetryable(new HttpError("rate limited", 429))).toBe(true);
    expect(isRetryable(new HttpError("unauthorized", 401))).toBe(false);
    expect(isRetryable(new HttpError("missing", 404))).toBe(false);
  });

  it("validates required configuration", () => {
    expect(() => configSchema.parse({})).toThrow();
  });
});
