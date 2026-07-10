# anna-app-credentials-demo

Demonstrates the **multi-account unified-authorizations** surface
(design: matrix-nexus `docs/design/platform-credentials-multi-account.md` §7)
over **both** transports:

| Path | Wire | Gating |
| --- | --- | --- |
| **HOST API** | iframe → `anna.credentials.list_accounts` / `anna.credentials.get_token` | manifest `ui.host_api.credentials` (provider ids) + per-app `credentials_grant` (Installed Apps → Permissions → *Connected accounts*) |
| **Reverse RPC** | iframe → `anna.tools.invoke` → bundled Executa → `credentials/listAccounts` + `credentials/getToken` | the Executa manifest's `credentials` declaration — `GOOGLE_ACCESS_TOKEN` maps to the OAuth provider `google`, so the host mints a per-invoke `credentials_token` covering it |

## What's inside

- `bundle/` — static single-window UI: pick a transport, list the user's
  authorized Google accounts (metadata only), fetch a **masked** short-lived
  access token for the default or a specific account, and fetch the
  account's **most recent Gmail messages** (From / Subject / Date / snippet)
  using that token — over either transport:
  - **HOST API** — the iframe calls `anna.credentials.get_token`, then hits
    `gmail.googleapis.com` directly (allowed via
    `ui.bundle.external_origins`, which is auto-added to the bundle CSP's
    `connect-src`).
  - **Reverse RPC** — the Executa's `gmail_recent` tool exchanges the token
    and calls the Gmail REST API server-side; the token never enters the
    iframe.
- `executas/credentials-via-executa-python/` — Python stdio Executa with
  four tools:
  - `list_accounts` — wraps `credentials/listAccounts`.
  - `token_info` — wraps `credentials/getToken`; declares
    **`"multi_account": true`** so the platform injects an optional
    `account` argument into the LLM-visible schema (email or account_id;
    emails are resolved via `list_accounts`). Returns the token masked.
  - `gmail_recent` — `credentials/getToken` + Gmail REST API
    (`users/me/messages`, `format=metadata`): returns message headers and
    snippets, never bodies or tokens. Also `multi_account: true`.
  - `injected_credential_info` — inspects the classic default-account
    injection (`params.context.credentials.GOOGLE_ACCESS_TOKEN`) so you can
    compare the legacy startup-injection path with on-demand `getToken`.

## Prerequisites

1. Authorize at least one Google account on **Settings → Authorizations**
   (authorize two to see the multi-account behavior; the page supports
   *Add account*, per-row refresh/disconnect and *Set default*).
   The Gmail section additionally requires the authorization to include
   the `gmail.readonly` scope — 401/403 from the Gmail API usually means
   the account was authorized without it.
2. `anna-app dev` installs grant the app's `credentials_grant`
   automatically; production installs need the user to enable
   **Connected accounts** in the app's permission editor.

## Run

```bash
cd examples/anna-app-credentials-demo
anna-app dev            # real host; mock fixtures only cover the happy path
```

Note: the Reverse RPC path requires a real host (`credentials/*` is not
served by the offline harness); the HOST API path replays
`fixtures/happy-path.jsonl` in mock mode. The Gmail section needs a real
host + a really authorized account either way — in mock mode the HOST API
path gets a fake token that the Gmail API rejects, while the Reverse RPC
path replays a canned two-message fixture.

## Security notes baked in

- `list_accounts` returns metadata only — never tokens.
- Tokens are masked (prefix + length) before they reach the UI or chat.
- `gmail_recent` returns headers + snippet only — never message bodies,
  and never the token it used.
- Gmail-sourced strings (sender, subject, snippet) are HTML-escaped before
  rendering — mail content is untrusted input.
- `refresh_token` never crosses either channel — the platform keeps it.
