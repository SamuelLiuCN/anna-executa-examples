// Package web implements the Executa v2 reverse JSON-RPC
// `web/search` and `web/fetch` requests that let a plugin ask its host
// (Anna) to search the web / extract page content on its behalf.
//
// Why reverse RPC?
//   - Plugins do NOT need their own search-provider API key.
//   - Provider routing, SSRF guarding, quota and billing live in the
//     host (web_grant on UserExecuta.custom_config).
//   - Response schemas are provider-agnostic; `search_depth` expresses
//     quality intent, never provider choice.
//
// stdio-channel budgets (tighter than the iframe HOST API):
//   - fetch: max_chars ≤ 8,000/page, whole response ≤ 256 KB.
//
// Wire layout (Plugin → Agent → Nexus REST):
//
//	Plugin (us)                          Agent (host)              Nexus
//	────────────────────────────────────────────────────────────────────
//	← invoke(req_id=42, …)
//	→ web/search(req_id=A, …)            POST /copilot/web/search
//	                                      ← 200 {results, provider_tier, …}
//	← result | error
//	→ invoke result(req_id=42)
//
// Threading model identical to the sampling/image clients. Construct one
// *Client per process; feed every parsed frame to DispatchResponse.
//
// See matrix-nexus docs/design/app-web-search.md §2 / §4 for the wire
// contract.
package web

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"
)

// Constants — keep in sync with matrix/src/executa/protocol.py.
const (
	MethodWebSearch = "web/search"
	MethodWebFetch  = "web/fetch"
	// Phase 2 (app-web-search.md §2.3 / §2.4)
	MethodWebImageSearch = "web/image_search"
	MethodWebImageFetch  = "web/image_fetch"

	ErrCodeNotGranted     = -32521
	ErrCodeQuotaExceeded  = -32522 // CU pool exhausted
	ErrCodeProviderError  = -32523
	ErrCodeInvalidRequest = -32524
	ErrCodeTimeout        = -32525
	ErrCodeNotNegotiated  = -32526
	ErrCodeUserDenied     = -32527
	ErrCodeTokenExpired   = -32528
)

// WebError wraps a JSON-RPC error returned by the host.
type WebError struct {
	Code    int            `json:"code"`
	Message string         `json:"message"`
	Data    map[string]any `json:"data,omitempty"`
}

func (e *WebError) Error() string {
	return fmt.Sprintf("[%d] %s", e.Code, e.Message)
}

// SearchRequest mirrors `web/search` params (§2.1).
type SearchRequest struct {
	Query          string   `json:"query"`
	MaxResults     int      `json:"max_results,omitempty"`
	SearchDepth    string   `json:"search_depth,omitempty"` // "basic" | "advanced"
	Topic          string   `json:"topic,omitempty"`        // "general" | "news"
	TimeRange      string   `json:"time_range,omitempty"`   // day|week|month|year
	Region         string   `json:"region,omitempty"`
	IncludeDomains []string `json:"include_domains,omitempty"`
	ExcludeDomains []string `json:"exclude_domains,omitempty"`
}

// SearchResult is one item in the search results array.
type SearchResult struct {
	Title       string   `json:"title"`
	URL         string   `json:"url"`
	Snippet     string   `json:"snippet"`
	Site        string   `json:"site"`
	PublishedAt *string  `json:"published_at,omitempty"`
	Score       *float64 `json:"score,omitempty"`
}

// SearchResponse is the parsed response from `web/search`.
type SearchResponse struct {
	Results       []SearchResult `json:"results"`
	ProviderTier  string         `json:"provider_tier"` // actually-executed tier
	QuotaConsumed float64        `json:"quota_consumed"`
}

// FetchRequest mirrors `web/fetch` params (§2.2).
type FetchRequest struct {
	URLs      []string `json:"urls"`
	Format    string   `json:"format,omitempty"` // "markdown" | "text"
	MaxChars  int      `json:"max_chars,omitempty"`
	TimeoutMs int      `json:"timeout_ms,omitempty"`
}

// Page is one item in the fetch pages array (per-item failure isolation —
// check OK per page; the call itself only errors on auth/quota issues).
type Page struct {
	URL         string  `json:"url"`
	FinalURL    *string `json:"final_url,omitempty"`
	OK          bool    `json:"ok"`
	Title       *string `json:"title,omitempty"`
	Content     *string `json:"content,omitempty"`
	PublishedAt *string `json:"published_at,omitempty"`
	Truncated   bool    `json:"truncated,omitempty"`
	Error       *string `json:"error,omitempty"`
}

// FetchResponse is the parsed response from `web/fetch`.
type FetchResponse struct {
	Pages         []Page  `json:"pages"`
	QuotaConsumed float64 `json:"quota_consumed"`
}

// ImageSearchRequest mirrors `web/image_search` params (§2.3, Phase 2).
// Safe-search is always enforced host-side and cannot be disabled.
type ImageSearchRequest struct {
	Query      string `json:"query"`
	MaxResults int    `json:"max_results,omitempty"` // default 8, cap 20
	MinWidth   int    `json:"min_width,omitempty"`
	MinHeight  int    `json:"min_height,omitempty"`
	Aspect     string `json:"aspect,omitempty"` // any|wide|tall|square
}

// ImageResult is one item in the image search results array.
// LicenseHint is best-effort — the platform makes no copyright warranty.
type ImageResult struct {
	ImageURL     string  `json:"image_url"`
	ThumbnailURL *string `json:"thumbnail_url,omitempty"`
	SourceURL    string  `json:"source_url"`
	Title        *string `json:"title,omitempty"`
	Width        *int    `json:"width,omitempty"`
	Height       *int    `json:"height,omitempty"`
	MimeType     *string `json:"mime_type,omitempty"`
	LicenseHint  *string `json:"license_hint,omitempty"`
}

// ImageSearchResponse is the parsed response from `web/image_search`.
type ImageSearchResponse struct {
	Results       []ImageResult `json:"results"`
	QuotaConsumed float64       `json:"quota_consumed"`
	Cached        bool          `json:"cached,omitempty"`
}

// ImageFetchRequest mirrors `web/image_fetch` params (§2.4, Phase 2).
type ImageFetchRequest struct {
	URL      string `json:"url"`
	MaxBytes int    `json:"max_bytes,omitempty"` // default 5 MiB, cap 20 MiB
	Purpose  string `json:"purpose,omitempty"`   // audit label
}

// ImageFetchResponse is an artifact REFERENCE (never bytes — stdio safe).
// The stored object counts against the tool's storage quota.
type ImageFetchResponse struct {
	Path          string  `json:"path"`
	GetURL        string  `json:"get_url"`
	MimeType      string  `json:"mime_type"`
	BytesSize     int64   `json:"bytes_size"`
	SHA256        string  `json:"sha256"`
	SourceURL     string  `json:"source_url"`
	FinalURL      string  `json:"final_url"`
	QuotaConsumed float64 `json:"quota_consumed"`
}

// FrameWriter writes one newline-delimited JSON-RPC frame to the host.
type FrameWriter func(msg map[string]any) error

// DefaultFrameWriter writes to os.Stdout under a process-wide mutex.
func DefaultFrameWriter() FrameWriter {
	var mu sync.Mutex
	return func(msg map[string]any) error {
		buf, err := json.Marshal(msg)
		if err != nil {
			return err
		}
		mu.Lock()
		defer mu.Unlock()
		if _, err := os.Stdout.Write(append(buf, '\n')); err != nil {
			return err
		}
		return nil
	}
}

type pending struct {
	ch chan json.RawMessage
}

// Client tracks outstanding reverse RPC requests and resolves them as
// responses arrive on stdin.
type Client struct {
	write          FrameWriter
	mu             sync.Mutex
	pending        map[string]*pending
	disabledReason string
}

// New constructs a Client. Pass nil to use the default stdout writer.
func New(w FrameWriter) *Client {
	if w == nil {
		w = DefaultFrameWriter()
	}
	return &Client{
		write:   w,
		pending: map[string]*pending{},
	}
}

// Disable marks web access as unavailable.
func (c *Client) Disable(reason string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.disabledReason = reason
}

// Search issues a `web/search` request. Pass timeout = 0 for the default
// (30s).
func (c *Client) Search(req SearchRequest, timeout time.Duration) (*SearchResponse, error) {
	if req.Query == "" {
		return nil, errors.New("query must be non-empty")
	}
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	raw, err := c.call(MethodWebSearch, req, timeout)
	if err != nil {
		return nil, err
	}
	var out SearchResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("decode web/search result: %w", err)
	}
	return &out, nil
}

// Fetch issues a `web/fetch` request. Pass timeout = 0 for the default
// (90s — fetch may crawl up to 10 slow pages).
func (c *Client) Fetch(req FetchRequest, timeout time.Duration) (*FetchResponse, error) {
	if len(req.URLs) == 0 {
		return nil, errors.New("urls must be non-empty")
	}
	if timeout <= 0 {
		timeout = 90 * time.Second
	}
	raw, err := c.call(MethodWebFetch, req, timeout)
	if err != nil {
		return nil, err
	}
	var out FetchResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("decode web/fetch result: %w", err)
	}
	return &out, nil
}

// ImageSearch issues a `web/image_search` request (Phase 2). Requires
// manifest host_capabilities "web.image_search" + the user's
// web_grant.allowImageSearch (defaults OFF). Pass timeout = 0 for the
// default (30s).
func (c *Client) ImageSearch(req ImageSearchRequest, timeout time.Duration) (*ImageSearchResponse, error) {
	if req.Query == "" {
		return nil, errors.New("query must be non-empty")
	}
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	raw, err := c.call(MethodWebImageSearch, req, timeout)
	if err != nil {
		return nil, err
	}
	var out ImageSearchResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("decode web/image_search result: %w", err)
	}
	return &out, nil
}

// ImageFetch issues a `web/image_fetch` request (Phase 2): the host
// downloads the image (SSRF-guarded, MIME whitelist + magic bytes) into
// APS file storage and returns an artifact reference — never bytes.
// Requires "web.image_fetch" cap + web_grant.allowImageFetch (defaults
// OFF). Pass timeout = 0 for the default (60s).
func (c *Client) ImageFetch(req ImageFetchRequest, timeout time.Duration) (*ImageFetchResponse, error) {
	if req.URL == "" {
		return nil, errors.New("url must be non-empty")
	}
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	raw, err := c.call(MethodWebImageFetch, req, timeout)
	if err != nil {
		return nil, err
	}
	var out ImageFetchResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("decode web/image_fetch result: %w", err)
	}
	return &out, nil
}

func (c *Client) call(method string, params any, timeout time.Duration) (json.RawMessage, error) {
	c.mu.Lock()
	if c.disabledReason != "" {
		reason := c.disabledReason
		c.mu.Unlock()
		return nil, &WebError{Code: ErrCodeNotNegotiated, Message: reason}
	}
	c.mu.Unlock()

	id, err := newReqID()
	if err != nil {
		return nil, err
	}

	p := &pending{ch: make(chan json.RawMessage, 1)}
	c.mu.Lock()
	c.pending[id] = p
	c.mu.Unlock()

	envelope := map[string]any{
		"jsonrpc": "2.0",
		"id":      id,
		"method":  method,
		"params":  params,
	}
	if err := c.write(envelope); err != nil {
		c.mu.Lock()
		delete(c.pending, id)
		c.mu.Unlock()
		return nil, err
	}

	select {
	case raw := <-p.ch:
		var resp struct {
			Result json.RawMessage `json:"result"`
			Error  *WebError       `json:"error"`
		}
		if err := json.Unmarshal(raw, &resp); err != nil {
			return nil, fmt.Errorf("decode web response: %w", err)
		}
		if resp.Error != nil {
			return nil, resp.Error
		}
		if resp.Result == nil {
			return nil, errors.New("empty web result")
		}
		return resp.Result, nil
	case <-time.After(timeout):
		c.mu.Lock()
		delete(c.pending, id)
		c.mu.Unlock()
		return nil, &WebError{
			Code:    ErrCodeTimeout,
			Message: fmt.Sprintf("%s timed out after %s", method, timeout),
		}
	}
}

// DispatchResponse resolves a pending request from a parsed JSON-RPC
// frame. Returns true if `frame` was a response we owned.
func (c *Client) DispatchResponse(frame json.RawMessage) bool {
	var head struct {
		ID     any  `json:"id"`
		Method *any `json:"method"`
	}
	if err := json.Unmarshal(frame, &head); err != nil {
		return false
	}
	if head.Method != nil {
		return false
	}
	idStr, ok := head.ID.(string)
	if !ok {
		return false
	}
	c.mu.Lock()
	p := c.pending[idStr]
	if p != nil {
		delete(c.pending, idStr)
	}
	c.mu.Unlock()
	if p == nil {
		return false
	}
	select {
	case p.ch <- frame:
	default:
	}
	return true
}

func newReqID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
