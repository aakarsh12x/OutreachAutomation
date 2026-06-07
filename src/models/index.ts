export interface Company {
  domain: string;
  name?: string;
}

export interface Contact {
  id?: string;
  fullName: string;
  firstName: string;
  jobTitle: string;
  linkedinUrl: string;
  companyDomain: string;
  companyName: string;
}

export interface VerifiedContact extends Contact {
  email: string;
  emailSource?: string;
}

export interface SendResult {
  email: string;
  linkedinUrl: string;
  status: "sent" | "failed";
  messageId?: string;
  error?: string;
}

export interface PipelineFailure {
  stage: "ocean" | "prospeo" | "eazyreach" | "brevo" | "pipeline";
  item: string;
  message: string;
  code?: string;
}

export interface PipelineReport {
  seedDomain: string;
  startedAt: string;
  completedAt: string;
  sendConfirmed: boolean;
  companies: Company[];
  contacts: Contact[];
  emails: VerifiedContact[];
  sendStatus: SendResult[];
  failures: PipelineFailure[];
  counts: {
    companies: number;
    contacts: number;
    verifiedEmails: number;
    emailsToSend: number;
    sent: number;
    failedToSend: number;
  };
}
