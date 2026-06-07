import type { Company, Contact, SendResult, VerifiedContact } from "../models/index.js";

export interface OceanClient {
  findLookalikes(seedDomain: string): Promise<Company[]>;
}

export interface ProspeoClient {
  findDecisionMakers(company: Company): Promise<Contact[]>;
}

export interface EazyreachClient {
  resolveVerifiedEmail(contact: Contact): Promise<VerifiedContact | null>;
}

export interface BrevoClient {
  send(contact: VerifiedContact): Promise<SendResult>;
}

export interface Logger {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
