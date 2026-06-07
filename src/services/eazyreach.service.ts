import { z } from "zod";
import type { Contact, VerifiedContact } from "../models/index.js";
import type { EazyreachClient } from "../types/services.js";
import { HttpClient } from "../utils/http-client.js";

const tokenSchema = z.object({
  auth_token: z.string().min(1).optional(),
  authToken: z.string().min(1).optional(),
  id: z.union([z.string(), z.number()]).optional()
}).refine((value) => value.auth_token || value.authToken, {
  message: "Eazyreach authentication response did not contain an auth token"
});

const emailSchema = z.object({
  status: z.string(),
  emails: z.array(z.object({
    email: z.string().email(),
    verification: z.string(),
    source: z.string().optional()
  })).default([])
});

export class EazyreachService implements EazyreachClient {
  private token?: string;

  constructor(
    private readonly http: HttpClient,
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {}

  async resolveVerifiedEmail(contact: Contact): Promise<VerifiedContact | null> {
    const token = await this.getToken();
    const response = await this.http.request(
      "https://api.superflow.run/b2b/linkedin-emails",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ linkedinUrl: contact.linkedinUrl })
      },
      emailSchema
    );
    const match = (response.emails ?? []).find((item) => item.verification.toLowerCase() === "verified");
    return match ? { ...contact, email: match.email.toLowerCase(), ...(match.source ? { emailSource: match.source } : {}) } : null;
  }

  private async getToken(): Promise<string> {
    if (this.token) return this.token;
    const response = await this.http.request(
      "https://api.superflow.run/b2b/createAuthToken/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: this.clientId, clientSecret: this.clientSecret })
      },
      tokenSchema
    );
    const token = response.auth_token ?? response.authToken;
    if (!token) throw new Error("Eazyreach authentication response did not contain an auth token");
    this.token = token;
    return token;
  }
}
