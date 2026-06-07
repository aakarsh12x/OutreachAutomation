import type { VerifiedContact } from "../models/index.js";

export function renderTemplate(template: string, contact: VerifiedContact): string {
  const values: Record<string, string> = {
    name: contact.fullName,
    firstName: contact.firstName,
    title: contact.jobTitle,
    company: contact.companyName,
    domain: contact.companyDomain,
    email: contact.email
  };
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
}
