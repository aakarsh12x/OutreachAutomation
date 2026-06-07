import { z } from "zod";

const domainSchema = z.string().trim().min(1).transform((value, ctx) => {
  const withProtocol = /^[a-z]+:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    const domain = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    if (!domain.includes(".") || domain.includes(" ") || url.username || url.password) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid company domain" });
      return z.NEVER;
    }
    return domain;
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid company domain" });
    return z.NEVER;
  }
});

export function normalizeDomain(value: string): string {
  return domainSchema.parse(value);
}
