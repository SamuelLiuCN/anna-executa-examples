/**
 * WebClient — issue reverse `web/search` and `web/fetch` JSON-RPC requests
 * to the host Agent (Anna), which proxies to Nexus's `/api/v1/copilot/web/*`
 * endpoints using the short-lived `sampling_token` the host minted at
 * invoke time.
 *
 * The plugin never sees a search-provider API key — provider routing,
 * SSRF guarding, quota, billing and audit all stay host-side. Response
 * schemas are provider-agnostic (`search_depth` expresses quality intent,
 * never provider choice).
 *
 * stdio-channel budgets (tighter than the iframe HOST API):
 *   - fetch: max_chars ≤ 8,000/page, whole response ≤ 256 KB.
 *
 * Threading model identical to SamplingClient / ImageClient:
 *   - Construct one WebClient per process.
 *   - Feed every parsed JSON-RPC frame received on stdin to
 *     `web.dispatchResponse(msg)`; pair with `makeResponseRouter()`.
 *
 * Error codes — keep in sync with matrix/src/executa/protocol.py:
 *   WEB_ERR_NOT_GRANTED     = -32521
 *   WEB_ERR_QUOTA_EXCEEDED  = -32522   (CU pool exhausted)
 *   WEB_ERR_PROVIDER_ERROR  = -32523
 *   WEB_ERR_INVALID_REQUEST = -32524
 *   WEB_ERR_TIMEOUT         = -32525
 *   WEB_ERR_NOT_NEGOTIATED  = -32526
 *   WEB_ERR_USER_DENIED     = -32527
 *   WEB_ERR_TOKEN_EXPIRED   = -32528
 *
 * See matrix-nexus docs/design/app-web-search.md §2 / §4 for the wire
 * contract.
 */

"use strict";

const crypto = require("node:crypto");

const { attachInvokeContext } = require("./context");

const METHOD_WEB_SEARCH = "web/search";
const METHOD_WEB_FETCH = "web/fetch";
// Phase 2 (app-web-search.md §2.3 / §2.4)
const METHOD_WEB_IMAGE_SEARCH = "web/image_search";
const METHOD_WEB_IMAGE_FETCH = "web/image_fetch";

const WEB_ERR_NOT_GRANTED = -32521;
const WEB_ERR_QUOTA_EXCEEDED = -32522;
const WEB_ERR_PROVIDER_ERROR = -32523;
const WEB_ERR_INVALID_REQUEST = -32524;
const WEB_ERR_TIMEOUT = -32525;
const WEB_ERR_NOT_NEGOTIATED = -32526;
const WEB_ERR_USER_DENIED = -32527;
const WEB_ERR_TOKEN_EXPIRED = -32528;

class WebError extends Error {
  constructor(code, message, data) {
    super(`[${code}] ${message}`);
    this.name = "WebError";
    this.code = code;
    this.data = data || {};
  }
}

class WebClient {
  constructor(opts = {}) {
    this._writeFrame =
      opts.writeFrame ||
      ((msg) => {
        process.stdout.write(JSON.stringify(msg) + "\n");
      });
    /** @type {Map<string, {resolve: Function, reject: Function, timer: NodeJS.Timeout}>} */
    this._pending = new Map();
    this._disabledReason = null;
  }

  disable(reason) {
    this._disabledReason = reason;
  }

  /**
   * Web / news search. Requires manifest
   * `host_capabilities: ["web.search"]` plus the user's web grant.
   *
   * Resolves to `{ results: [{title, url, snippet, site, published_at?,
   * score?}], provider_tier: "basic"|"advanced", quota_consumed }`.
   * `provider_tier` reports the ACTUALLY executed tier (a degraded
   * advanced request comes back "basic" and is billed cheaper).
   *
   * @param {{
   *   query: string,
   *   max_results?: number,              // default 5
   *   search_depth?: "basic"|"advanced", // advanced needs allowAdvanced grant
   *   topic?: "general"|"news",
   *   time_range?: "day"|"week"|"month"|"year",
   *   region?: string,                   // e.g. "us-en"
   *   include_domains?: string[],
   *   exclude_domains?: string[],
   *   timeoutMs?: number,                // default 30_000
   * }} opts
   */
  search(opts) {
    const {
      query,
      max_results,
      search_depth,
      topic,
      time_range,
      region,
      include_domains,
      exclude_domains,
      timeoutMs = 30_000,
    } = opts;
    if (typeof query !== "string" || !query.trim()) {
      return Promise.reject(
        new WebError(WEB_ERR_INVALID_REQUEST, "query must be non-empty string")
      );
    }
    const params = { query };
    if (max_results != null) params.max_results = Number(max_results);
    if (search_depth != null) params.search_depth = search_depth;
    if (topic != null) params.topic = topic;
    if (time_range != null) params.time_range = time_range;
    if (region != null) params.region = region;
    if (include_domains != null) params.include_domains = include_domains;
    if (exclude_domains != null) params.exclude_domains = exclude_domains;
    return this._call(METHOD_WEB_SEARCH, params, timeoutMs);
  }

  /**
   * SSRF-guarded page extraction (1–10 URLs, per-item failure isolation).
   * Requires manifest `host_capabilities: ["web.fetch"]` + user grant.
   *
   * Resolves to `{ pages: [{url, final_url?, ok, title?, content?,
   * truncated?, error?}], quota_consumed }` — check `pages[i].ok` per
   * item; the whole call only rejects on auth/quota/protocol errors.
   *
   * @param {{
   *   urls: string[],
   *   format?: "markdown"|"text",
   *   max_chars?: number,      // stdio cap: 8,000 per page
   *   timeout_ms?: number,     // per-page budget, ≤ 30_000
   *   timeoutMs?: number,      // client wall clock, default 90_000
   * }} opts
   */
  fetch(opts) {
    const { urls, format, max_chars, timeout_ms, timeoutMs = 90_000 } = opts;
    if (!Array.isArray(urls) || urls.length === 0) {
      return Promise.reject(
        new WebError(WEB_ERR_INVALID_REQUEST, "urls must be non-empty array")
      );
    }
    const params = { urls };
    if (format != null) params.format = format;
    if (max_chars != null) params.max_chars = Number(max_chars);
    if (timeout_ms != null) params.timeout_ms = Number(timeout_ms);
    return this._call(METHOD_WEB_FETCH, params, timeoutMs);
  }

  /**
   * Image search (Phase 2). Requires manifest
   * `host_capabilities: ["web.image_search"]` plus the user's
   * `web_grant.allowImageSearch` (defaults OFF). Safe-search is always
   * enforced host-side and cannot be disabled. `license_hint` is a
   * best-effort passthrough — the platform makes no copyright warranty.
   *
   * Resolves to `{ results: [{image_url, thumbnail_url?, source_url,
   * title?, width?, height?, mime_type?, license_hint?}],
   * quota_consumed, cached? }`.
   *
   * @param {{
   *   query: string,
   *   max_results?: number,            // default 8, cap 20
   *   min_width?: number, min_height?: number,
   *   aspect?: "any"|"wide"|"tall"|"square",
   *   timeoutMs?: number,              // default 30_000
   * }} opts
   */
  imageSearch(opts) {
    const { query, max_results, min_width, min_height, aspect, timeoutMs = 30_000 } = opts;
    if (typeof query !== "string" || !query.trim()) {
      return Promise.reject(
        new WebError(WEB_ERR_INVALID_REQUEST, "query must be non-empty string")
      );
    }
    const params = { query };
    if (max_results != null) params.max_results = Number(max_results);
    if (min_width != null) params.min_width = Number(min_width);
    if (min_height != null) params.min_height = Number(min_height);
    if (aspect != null) params.aspect = aspect;
    return this._call(METHOD_WEB_IMAGE_SEARCH, params, timeoutMs);
  }

  /**
   * Image download → APS files artifact (Phase 2). Requires manifest
   * `host_capabilities: ["web.image_fetch"]` + `web_grant.allowImageFetch`
   * (defaults OFF). The response is an artifact REFERENCE (`path` +
   * short-lived `get_url`), never bytes — stdio-frame safe. The stored
   * object counts against the tool's storage quota.
   *
   * Resolves to `{ path, get_url, mime_type, bytes_size, sha256,
   * source_url, final_url, quota_consumed }`.
   *
   * @param {{
   *   url: string,
   *   max_bytes?: number,   // default 5 MiB, cap 20 MiB
   *   purpose?: string,     // audit label
   *   timeoutMs?: number,   // default 60_000
   * }} opts
   */
  imageFetch(opts) {
    const { url, max_bytes, purpose, timeoutMs = 60_000 } = opts;
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
      return Promise.reject(
        new WebError(WEB_ERR_INVALID_REQUEST, "url must be an http(s) URL")
      );
    }
    const params = { url };
    if (max_bytes != null) params.max_bytes = Number(max_bytes);
    if (purpose != null) params.purpose = purpose;
    return this._call(METHOD_WEB_IMAGE_FETCH, params, timeoutMs);
  }

  dispatchResponse(msg) {
    if (!msg || typeof msg !== "object" || "method" in msg) return false;
    const id = msg.id;
    if (id == null) return false;
    const pending = this._pending.get(id);
    if (!pending) return false;
    this._pending.delete(id);
    clearTimeout(pending.timer);
    if (msg.error) {
      pending.reject(
        new WebError(
          Number(msg.error.code) || -32603,
          String(msg.error.message || "unknown error"),
          msg.error.data
        )
      );
    } else {
      pending.resolve(msg.result || {});
    }
    return true;
  }

  _call(method, params, timeoutMs) {
    if (this._disabledReason) {
      return Promise.reject(
        new WebError(WEB_ERR_NOT_NEGOTIATED, this._disabledReason)
      );
    }
    const reqId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this._pending.delete(reqId)) {
          reject(
            new WebError(
              WEB_ERR_TIMEOUT,
              `${method} timed out after ${timeoutMs}ms`
            )
          );
        }
      }, timeoutMs);
      this._pending.set(reqId, { resolve, reject, timer });
      try {
        this._writeFrame({
          jsonrpc: "2.0",
          id: reqId,
          method,
          params: attachInvokeContext(params),
        });
      } catch (err) {
        clearTimeout(timer);
        this._pending.delete(reqId);
        reject(err);
      }
    });
  }
}

module.exports = {
  WebClient,
  WebError,
  METHOD_WEB_SEARCH,
  METHOD_WEB_FETCH,
  METHOD_WEB_IMAGE_SEARCH,
  METHOD_WEB_IMAGE_FETCH,
  WEB_ERR_NOT_GRANTED,
  WEB_ERR_QUOTA_EXCEEDED,
  WEB_ERR_PROVIDER_ERROR,
  WEB_ERR_INVALID_REQUEST,
  WEB_ERR_TIMEOUT,
  WEB_ERR_NOT_NEGOTIATED,
  WEB_ERR_USER_DENIED,
  WEB_ERR_TOKEN_EXPIRED,
};
