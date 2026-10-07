import { Agent, request } from "node:https";

const approvedPage = "https://yuc.wiki/202610/";
const approvedProxy = "http://127.0.0.1:10090";

export type FetchFailure =
  | "disabled"
  | "budget-exhausted"
  | "circuit-open"
  | "timeout"
  | "cancelled"
  | "tls-error"
  | "network-error"
  | "forbidden"
  | "rate-limited"
  | "http-error"
  | "too-large"
  | "invalid-response";

export class YucFetchError extends Error {
  constructor(
    public readonly reason: FetchFailure,
    public readonly nodeCode: string | null = null,
    public readonly httpStatus: number | null = null,
  ) {
    super(`YUC acquisition stopped: ${reason}`);
    this.name = "YucFetchError";
  }
}

export interface WireResponse {
  status: number;
  headers: Readonly<Record<string, string>>;
  body: AsyncIterable<Uint8Array>;
  close(): void;
}

export type YucWire = (signal: AbortSignal) => Promise<WireResponse>;

export type YucConnectionMode = "approved-proxy" | "direct";

/** Explicit process-local path, strict TLS; never inherits proxy env or falls back. */
export function createNodeYucWire(options?: { connectionMode: YucConnectionMode }): YucWire {
  if (!options || !["approved-proxy", "direct"].includes(options.connectionMode)) {
    throw new RangeError("Explicit connection mode is required");
  }
  const mode = options.connectionMode;
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major !== 24 || minor === undefined || minor < 5) {
    throw new RangeError("Native proxy acquisition requires Node 24.5 or later in Node 24");
  }
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    throw new RangeError("Strict TLS verification is required");
  }
  return (signal) =>
    new Promise((resolve, reject) => {
      const agent = new Agent({
        keepAlive: false,
        maxSockets: 1,
        rejectUnauthorized: true,
        proxyEnv:
          mode === "direct"
            ? {}
            : {
                HTTPS_PROXY: approvedProxy,
                https_proxy: approvedProxy,
                NO_PROXY: "",
                no_proxy: "",
              },
      });
      const req = request(
        approvedPage,
        {
          method: "GET",
          agent,
          signal,
          rejectUnauthorized: true,
          headers: { Accept: "text/html", "Accept-Encoding": "identity" },
        },
        (res) => {
          resolve({
            status: res.statusCode ?? 0,
            headers: {
              "content-type": String(res.headers["content-type"] ?? ""),
              "content-encoding": String(res.headers["content-encoding"] ?? "identity"),
            },
            body: res,
            close: () => {
              res.destroy();
              req.destroy();
              agent.destroy();
            },
          });
        },
      );
      req.once("error", (error) => {
        agent.destroy();
        reject(error);
      });
      req.end();
    });
}

function failure(error: unknown): FetchFailure {
  if (error instanceof YucFetchError) return error.reason;
  // Never publish raw errors: URL, proxy credentials or response text could occur there.
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" &&
    /^CERT_|^ERR_TLS_|^DEPTH_ZERO_|^SELF_SIGNED_|^UNABLE_TO_/.test(code)
    ? "tls-error"
    : "network-error";
}

// Only recognized transport codes may cross the evidence boundary, never raw errors.
const safeNodeCodes = new Set([
  "CERT_HAS_EXPIRED",
  "CERT_NOT_YET_VALID",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "ERR_TLS_CERT_SIGNATURE_ALGORITHM_UNSUPPORTED",
  "ERR_SSL_WRONG_VERSION_NUMBER",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ABORT_ERR",
]);
function safeNodeCode(error: unknown): string | null {
  const code =
    error instanceof YucFetchError ? error.nodeCode : (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && safeNodeCodes.has(code) ? code : null;
}

export interface YucFetchOptions {
  wire: YucWire;
  enabled?: boolean;
  /** One approved call for this batch; callers cannot increase the bound. */
  timeoutMs?: number;
  maxBytes?: number;
  budget?: number;
}

function bounded(value: number | undefined, fallback: number, maximum: number): number {
  const selected = value ?? fallback;
  if (!Number.isSafeInteger(selected) || selected < 1 || selected > maximum) {
    throw new RangeError("Invalid acquisition bound");
  }
  return selected;
}

/** Acquisition only: no parsing, persistence, promotion, public page import or scheduler. */
export class YucNodeAcquisition {
  private enabled: boolean;
  private tail: Promise<void> = Promise.resolve();
  private active: AbortController | null = null;
  private stopped = false;
  private remaining: number;
  private readonly timeout: number;
  private readonly limit: number;

  constructor(private readonly options: YucFetchOptions) {
    this.enabled = options.enabled ?? false;
    this.remaining = bounded(options.budget, 1, 1);
    this.timeout = bounded(options.timeoutMs, 20_000, 20_000);
    this.limit = bounded(options.maxBytes, 1_048_576, 1_048_576);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.active?.abort();
  }

  readonly fetch = async (url: string, externalSignal: AbortSignal) => {
    if (url !== approvedPage) throw new RangeError("Only the approved page is accepted");
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await this.acquire(externalSignal);
    } finally {
      release();
    }
  };

  private async acquire(externalSignal: AbortSignal) {
    if (!this.enabled) throw new YucFetchError("disabled");
    if (externalSignal.aborted) throw new YucFetchError("cancelled");
    if (this.stopped) throw new YucFetchError("circuit-open");
    if (this.remaining === 0) throw new YucFetchError("budget-exhausted");
    const controller = new AbortController();
    this.active = controller;
    let response: WireResponse | undefined;
    let reason: FetchFailure = "cancelled";
    const cancel = () => controller.abort();
    externalSignal.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(() => {
      reason = "timeout";
      controller.abort();
    }, this.timeout);
    let rejectAbort!: (error: Error) => void;
    const aborted = new Promise<never>((_, reject) => {
      rejectAbort = reject;
    });
    const onAbort = () => rejectAbort(new YucFetchError(this.enabled ? reason : "disabled"));
    controller.signal.addEventListener("abort", onAbort, { once: true });
    const operation = async () => {
      if (controller.signal.aborted) throw new YucFetchError(reason);
      if (!this.enabled) throw new YucFetchError("disabled");
      this.remaining -= 1;
      response = await this.options.wire(controller.signal);
      if (controller.signal.aborted) {
        response.close();
        throw new YucFetchError(reason);
      }
      if (response.status !== 200) {
        throw new YucFetchError(
          response.status === 403
            ? "forbidden"
            : response.status === 429
              ? "rate-limited"
              : "http-error",
        );
      }
      if (
        !/^text\/html(?:;|$)/i.test(response.headers["content-type"] ?? "") ||
        !["", "identity"].includes(response.headers["content-encoding"] ?? "")
      ) {
        throw new YucFetchError("invalid-response");
      }
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      for await (const chunk of response.body) {
        if (controller.signal.aborted) throw new YucFetchError(reason);
        bytes += chunk.byteLength;
        if (bytes > this.limit) throw new YucFetchError("too-large");
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks).toString("utf8");
      return { status: 200, headers: response.headers, body };
    };
    try {
      return await Promise.race([operation(), aborted]);
    } catch (error) {
      this.stopped = true;
      throw new YucFetchError(failure(error), safeNodeCode(error), response?.status ?? null);
    } finally {
      clearTimeout(timer);
      externalSignal.removeEventListener("abort", cancel);
      controller.signal.removeEventListener("abort", onAbort);
      controller.abort();
      response?.close();
      this.active = null;
    }
  }
}
