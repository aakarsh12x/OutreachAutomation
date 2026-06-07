import { z } from "zod";
import type { SendResult, VerifiedContact } from "../models/index.js";
import type { BrevoClient } from "../types/services.js";
import { errorMessage } from "../utils/error.js";
import { HttpClient } from "../utils/http-client.js";
import { renderTemplate } from "../utils/template.js";

const responseSchema = z.object({
  messageId: z.string().optional(),
  messageIds: z.array(z.string()).optional()
});

export class BrevoService implements BrevoClient {
  constructor(
    private readonly http: HttpClient,
    private readonly apiKey: string,
    private readonly senderEmail: string,
    private readonly senderName: string,
    private readonly subjectTemplate: string,
    private readonly bodyTemplate: string
  ) {}

  async send(contact: VerifiedContact): Promise<SendResult> {
    try {
      const response = await this.http.request(
        "https://api.brevo.com/v3/smtp/email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", "api-key": this.apiKey },
          body: JSON.stringify({
            sender: { email: this.senderEmail, name: this.senderName },
            to: [{ email: contact.email, name: contact.fullName }],
            subject: renderTemplate(this.subjectTemplate, contact),
            textContent: renderTemplate(this.bodyTemplate, contact),
            tags: ["automated-outreach-pipeline"]
          })
        },
        responseSchema
      );
      return {
        email: contact.email,
        linkedinUrl: contact.linkedinUrl,
        status: "sent",
        messageId: response.messageId ?? response.messageIds?.[0] ?? "accepted"
      };
    } catch (error) {
      return { email: contact.email, linkedinUrl: contact.linkedinUrl, status: "failed", error: errorMessage(error) };
    }
  }
}
