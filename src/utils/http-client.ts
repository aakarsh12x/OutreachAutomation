import pLimit from "p-limit";
import type { ZodType } from "zod";
import { HttpError, isRetryable } from "./error.js";

export interface HttpClientOptions {
  concurrency: number;
  timeoutMs: number;
  maxRetries: number;
  backoffMs: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export class HttpClient {
  private readonly limit;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: HttpClientOptions) {
    this.limit = pLimit(options.concurrency);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  request<T>(url: string, init: RequestInit, schema: ZodType<T>): Promise<T> {
    return this.limit(() => this.requestWithRetry(url, init, schema));
  }

  private async requestWithRetry<T>(url: string, init: RequestInit, schema: ZodType<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      try {
        const response = await this.fetchOnce(url, init);
        const raw: unknown = await response.json().catch(() => ({}));
        if (!response.ok) {
          const body = raw as Record<string, unknown>;
          const message = String(body.detail ?? body.message ?? body.error_code ?? `HTTP ${response.status}`);
          const code = typeof body.error_code === "string" ? body.error_code : undefined;
          const retryAfter = response.headers.get("retry-after");
          throw new HttpError(message, response.status, code, retryAfter ? Number(retryAfter) * 1000 : undefined);
        }
        return schema.parse(raw);
      } catch (error) {
        lastError = error;
        if (attempt >= this.options.maxRetries || !isRetryable(error)) throw error;
        const retryAfter = error instanceof HttpError ? error.retryAfterMs : undefined;
        await this.sleep(retryAfter ?? this.options.backoffMs * 2 ** attempt);
      }
    }
    throw lastError;
  }

  private async fetchOnce(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}
