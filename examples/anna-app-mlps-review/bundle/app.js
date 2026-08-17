import { AnnaAppRuntime } from "/static/anna-apps/_sdk/latest/index.js";

const EXECUTA_HANDLE = "document-extractor";
const DEV_FALLBACK_TOOL_ID = "tool-intern2-document-extractor-u2n2j8x5";
const BUNDLED_TOOL_ID = `bundled:${EXECUTA_HANDLE}`;
const EXECUTA_METHOD = "extract_document";
const EXECUTA_LIST_ARCHIVE_METHOD = "list_archive";
const EXECUTA_ARCHIVE_ENTRY_METHOD = "extract_archive_entry";
const EXECUTA_IMPORT_ARCHIVE_CHUNK_METHOD = "import_archive_chunk";
const EXECUTA_DIAGNOSE_METHOD = "diagnose_environment";
const NATIVE_DOC_READ_TOOL = "doc_read";
const NATIVE_SHEET_READ_TOOL = "sheet_read";

const STORAGE_KEYS = {
  index: "mlps:v1:index",
  companies: "mlps:v1:companies",
  projects: "mlps:v1:projects",
  reviews: "mlps:v1:reviews",
  knowledge: "mlps:v1:knowledge",
  interprets: "mlps:v1:interprets",
};

const INLINE_CAP_BYTES = 24 * 1024;
const TOOL_RESPONSE_TEXT_CHARS = 12000;
const ARCHIVE_IMPORT_CHUNK_BYTES = 16 * 1024;
const ARCHIVE_IMPORT_MIN_CHUNK_BYTES = 4 * 1024;
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const NATIVE_ATTACHMENT_INLINE_CAP_BYTES = 24 * 1024;
const TOOL_HOST_TIMEOUT_MS = 180000;
const TOOL_CLIENT_TIMEOUT_MS = 190000;
const OCR_DPI = 120;
const PAGES_PER_TOOL_CALL = 20;
const INTERPRET_PAGES_PER_TOOL_CALL = 5;
const MIN_PAGES_PER_TOOL_CALL = 1;
const MAX_PROCESS_PAGES = 500;
const MAX_EXTRACT_CHARS = 500000;
const MAX_ARCHIVE_FILES = 200;
const MAX_ARCHIVE_DEPTH = 5;
const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 500 * 1024 * 1024;
const MAX_LLM_CHARS = 90000;
const REVIEW_REPORT_END_MARKER = "<!-- MLPS_REVIEW_REPORT_END -->";
const REVIEW_MAX_RETRIES = 3;
const REVIEW_FINAL_CONTEXT_CHARS = 70000;
const REVIEW_FINDINGS_CONTEXT_CHARS = 52000;
const MAX_KNOWLEDGE_ITEMS = 8;
const MAX_KNOWLEDGE_CHARS = 40000;
const MAX_INTERPRET_SYSTEM_PROMPT_CHARS = 3000;
const MAX_INTERPRET_TURN_CONTEXT_CHARS = 8500;
const MAX_INTERPRET_DIGEST_SOURCE_CHARS = 24000;
const MAX_INTERPRET_DIGEST_CHARS = 1800;
const MAX_INTERPRET_CONVERSATION_DIGEST_CHARS = 1500;
const MAX_INTERPRET_EVIDENCE_ITEMS = 8;
const MAX_INTERPRET_RECENT_MESSAGES = 6;
const INTERPRET_EVIDENCE_CHUNK_CHARS = 2200;
const INTERPRET_EVIDENCE_OVERLAP_CHARS = 200;
const INTERPRET_EVIDENCE_MAX_CHUNKS = 260;
const INTERPRET_CONVERSATION_DIGEST_TRIGGER = 10;
const TEXT_UPLOAD_TYPE = "text/plain; charset=utf-8";
const REVIEW_SOURCE_LABEL = "PDF / DOCX / PPTX / XLSX / XLS / CSV / TXT / MD / ZIP / TAR.GZ，最大 200 MB";
const KNOWLEDGE_SOURCE_LABEL = "PDF / DOCX / TXT / MD，最大 200 MB";

const CONTROL_TERMS = [
  "安全物理环境",
  "安全通信网络",
  "安全区域边界",
  "安全计算环境",
  "安全管理中心",
  "安全管理制度",
  "安全管理机构",
  "安全管理人员",
  "安全建设管理",
  "安全运维管理",
  "身份鉴别",
  "访问控制",
  "入侵防范",
  "恶意代码",
  "安全审计",
  "备份恢复",
  "应急预案",
  "测评",
  "整改",
];

const $ = (id) => document.getElementById(id);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  connection: $("connection"),
  navLinks: $$(".side-link"),
  companySelect: $("company-select"),
  projectSelect: $("project-select"),
  companyList: $("company-list"),
  projectList: $("project-list"),
  companyCreate: $("company-create-btn"),
  projectCreate: $("project-create-btn"),
  knowledgeOpenUpload: $("knowledge-open-upload-btn"),
  reviewEmpty: $("review-empty"),
  reviewContent: $("review-content"),
  emptyCompany: $("empty-company-btn"),
  emptyProject: $("empty-project-btn"),
  interpretEmpty: $("interpret-empty"),
  interpretContent: $("interpret-content"),
  interpretEmptyCompany: $("interpret-empty-company-btn"),
  interpretEmptyProject: $("interpret-empty-project-btn"),
  interpretFileInput: $("interpret-file-input"),
  interpretDropZone: $("interpret-drop-zone"),
  interpretFileMeta: $("interpret-file-meta"),
  interpretProcessPages: $("interpret-pages"),
  interpretUseKnowledge: $("interpret-use-knowledge"),
  interpretAnalyze: $("interpret-analyze-btn"),
  interpretReport: $("interpret-report-output"),
  interpretStatName: $("interpret-stat-name"),
  interpretStatText: $("interpret-stat-text"),
  interpretStatKnowledge: $("interpret-stat-knowledge"),
  interpretStatSession: $("interpret-stat-session"),
  interpretProgressWrap: $("interpret-progress-wrap"),
  interpretProgressText: $("interpret-progress-text"),
  interpretProgressPercent: $("interpret-progress-percent"),
  interpretProgressBar: $("interpret-progress-bar"),
  interpretList: $("interpret-list"),
  interpretChatList: $("interpret-chat-list"),
  interpretChatInput: $("interpret-chat-input"),
  interpretChatSend: $("interpret-chat-send-btn"),
  interpretDownloadSource: $("interpret-download-source-btn"),
  interpretDownloadReport: $("interpret-download-report-btn"),
  interpretClearChat: $("interpret-clear-chat-btn"),
  fileInput: $("file-input"),
  dropZone: $("drop-zone"),
  fileMeta: $("file-meta"),
  level: $("level-select"),
  docKind: $("doc-kind"),
  processPages: $("ocr-pages"),
  analyze: $("analyze-btn"),
  report: $("report-output"),
  text: $("text-output"),
  statName: $("stat-name"),
  statText: $("stat-text"),
  statKnowledge: $("stat-knowledge"),
  statModel: $("stat-model"),
  statTesseract: $("stat-tesseract"),
  progressWrap: $("progress-wrap"),
  progressText: $("progress-text"),
  progressPercent: $("progress-percent"),
  progressBar: $("progress-bar"),
  tabReportBtn: $("tab-report-btn"),
  tabTextBtn: $("tab-text-btn"),
  recordList: $("record-list"),
  knowledgeList: $("knowledge-list"),
  modalBackdrop: $("modal-backdrop"),
  modalTitle: $("modal-title"),
  modalBody: $("modal-body"),
  modalFooter: $("modal-footer"),
  modalClose: $("modal-close-btn"),
};

let anna = null;
let selectedFile = null;
let selectedKnowledgeFile = null;
let selectedInterpretFile = null;
let selectedKnowledgeId = null;
let selectedRecordId = null;
let selectedInterpretId = null;
let latestReport = "";
let latestExtraction = null;
let latestKnowledgeRefs = [];
let activeReviewParams = null;
let activeTab = "review";
let modalState = { type: null, payload: null };
let activeWorkstream = "review";
let isSendingInterpretMessage = false;
const interpretSessions = new Map();
const localFileStore = new Map();
let interpretRunId = null;
let nativeParserCatalogPromise = null;

const appState = {
  index: { selectedCompanyId: null, selectedProjectId: null },
  companies: [],
  projects: [],
  reviews: [],
  knowledge: [],
  interprets: [],
};

const annaReady = (async () => {
  try {
    const runtime = await AnnaAppRuntime.connect();
    anna = runtime;
    els.connection.textContent = "已连接";
    markStep("connect", "done");
    markStep("connect", "done", "interpret");
    await loadState();
    ensureValidSelection();
    renderAll();
    try {
      await anna.window.set_title({ title: "等保审查工作台" });
    } catch {
      // Title updates are cosmetic.
    }
    return runtime;
  } catch (err) {
    els.connection.textContent = "未连接";
    markStep("connect", "error");
    setReportPlain(formatError("runtime.connect", err));
    throw err;
  }
})();

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix) {
  const value =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${value}`;
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function workstreamEls(kind = activeWorkstream) {
  if (kind === "interpret") {
    return {
      steps: "#interpret-steps li",
      progressWrap: els.interpretProgressWrap,
      progressText: els.interpretProgressText,
      progressPercent: els.interpretProgressPercent,
      progressBar: els.interpretProgressBar,
      report: els.interpretReport,
    };
  }
  return {
    steps: "#steps li",
    progressWrap: els.progressWrap,
    progressText: els.progressText,
    progressPercent: els.progressPercent,
    progressBar: els.progressBar,
    report: els.report,
  };
}

function markStep(name, state, kind = activeWorkstream) {
  const target = workstreamEls(kind);
  for (const li of document.querySelectorAll(target.steps)) {
    if (li.dataset.step === name) {
      li.classList.toggle("active", state === "active");
      li.classList.toggle("done", state === "done");
      li.classList.toggle("error", state === "error");
    } else if (state === "active") {
      li.classList.remove("active");
    }
  }
}

function resetSteps(kind = activeWorkstream) {
  const target = workstreamEls(kind);
  for (const li of document.querySelectorAll(target.steps)) {
    li.classList.remove("active", "done", "error");
  }
  markStep("connect", anna ? "done" : "active", kind);
}

function setProgress(label, percent = null) {
  const target = workstreamEls();
  if (!target.progressWrap) return;
  target.progressWrap.hidden = false;
  target.progressText.textContent = label;
  if (Number.isFinite(percent)) {
    const bounded = Math.max(0, Math.min(100, percent));
    target.progressWrap.classList.remove("indeterminate");
    target.progressBar.style.width = `${bounded.toFixed(1)}%`;
    target.progressPercent.textContent = `${Math.round(bounded)}%`;
  } else {
    target.progressWrap.classList.add("indeterminate");
    target.progressBar.style.width = "";
    target.progressPercent.textContent = "处理中";
  }
}

function resetProgress(kind = activeWorkstream) {
  const target = workstreamEls(kind);
  if (!target.progressWrap) return;
  target.progressWrap.hidden = true;
  target.progressWrap.classList.remove("indeterminate");
  target.progressText.textContent = "等待";
  target.progressPercent.textContent = "0%";
  target.progressBar.style.width = "0";
}

function finishProgress(label) {
  setProgress(label, 100);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fileExt(name) {
  return (name.split(".").pop() || "").toLowerCase();
}

function archiveKind(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".zip")) return "zip";
  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) return "tar.gz";
  return "";
}

function isArchiveName(name) {
  return Boolean(archiveKind(name));
}

function nativeParserToolForFile(name) {
  const ext = fileExt(name);
  if (["pdf", "docx", "pptx"].includes(ext)) return NATIVE_DOC_READ_TOOL;
  if (["xlsx", "xls"].includes(ext)) return NATIVE_SHEET_READ_TOOL;
  return "";
}

function isDirectTextName(name) {
  return ["txt", "md", "markdown", "csv"].includes(fileExt(name));
}

function localDevDownloadsPath(file) {
  if (!isLocalDevOrigin() || !file?.name) return "";
  return `/Users/samuel/Downloads/${file.name}`;
}

function basename(path) {
  const name = String(path || "").split("/").filter(Boolean).pop() || "";
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function isSupported(file) {
  return isArchiveName(file.name) || ["pdf", "docx", "pptx", "xlsx", "xls", "csv", "txt", "md", "markdown"].includes(fileExt(file.name));
}

function formatError(label, err) {
  const code = err?.code || err?.error?.code || "error";
  const message = err?.message || err?.error?.message || String(err);
  return `[${label}] ${code}: ${message}`;
}

function setReportPlain(text) {
  const target = workstreamEls();
  if (target.report) target.report.textContent = text || "";
}

function setReportMarkdown(markdown) {
  const target = workstreamEls();
  if (target.report) target.report.innerHTML = renderMarkdown(markdown || "");
}

function renderMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];
  let codeLines = [];
  let codeLang = "";
  let inCode = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushCode = () => {
    blocks.push(
      `<pre class="markdown-code"><code${codeLang ? ` data-lang="${escapeHtml(codeLang)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
    );
    codeLines = [];
    codeLang = "";
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const fence = trimmed.match(/^```([A-Za-z0-9_-]*)\s*$/);
    if (fence) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph();
        inCode = true;
        codeLang = fence[1] || "";
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = Math.min(6, heading[1].length + 1);
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushParagraph();
      blocks.push("<hr />");
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      flushParagraph();
      const tableLines = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }
      index -= 1;
      blocks.push(renderMarkdownTable(tableLines));
      continue;
    }

    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      const quoteLines = [quote[1]];
      while (index + 1 < lines.length) {
        const next = lines[index + 1].trim().match(/^>\s?(.*)$/);
        if (!next) break;
        quoteLines.push(next[1]);
        index += 1;
      }
      blocks.push(`<blockquote>${quoteLines.map((part) => `<p>${renderInlineMarkdown(part)}</p>`).join("")}</blockquote>`);
      continue;
    }

    const listMatch = trimmed.match(/^((?:[-*+])|\d+\.)\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      const ordered = /^\d+\./.test(listMatch[1]);
      const items = [listMatch[2]];
      while (index + 1 < lines.length) {
        const next = lines[index + 1].trim().match(/^((?:[-*+])|\d+\.)\s+(.+)$/);
        if (!next || /^\d+\./.test(next[1]) !== ordered) break;
        items.push(next[2]);
        index += 1;
      }
      const tag = ordered ? "ol" : "ul";
      blocks.push(`<${tag}>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</${tag}>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  if (inCode) flushCode();
  flushParagraph();
  return blocks.length ? blocks.join("\n") : `<p>${escapeHtml(markdown || "")}</p>`;
}

function renderInlineMarkdown(value) {
  let html = escapeHtml(value);
  const codes = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const token = `\u0000CODE${codes.length}\u0000`;
    codes.push(`<code>${code}</code>`);
    return token;
  });
  html = html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*\s][^*]*?)\*/g, "<em>$1</em>")
    .replace(/_([^_\s][^_]*?)_/g, "<em>$1</em>");
  return html.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => codes[Number(index)] || "");
}

function isMarkdownTableStart(lines, index) {
  const current = lines[index]?.trim() || "";
  const next = lines[index + 1]?.trim() || "";
  return current.includes("|") && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(next);
}

function splitMarkdownTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderMarkdownTable(tableLines) {
  const header = splitMarkdownTableRow(tableLines[0] || "");
  const rows = tableLines.slice(2).map(splitMarkdownTableRow);
  return `
    <div class="markdown-table-wrap">
      <table>
        <thead><tr>${header.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${header.map((_, i) => `<td>${renderInlineMarkdown(row[i] || "")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function setBusy(isBusy) {
  els.analyze.disabled = isBusy || !selectedFile || !currentProject();
  els.analyze.classList.toggle("busy", isBusy);
  els.analyze.textContent = isBusy ? "分析中" : "开始分析";
  els.interpretAnalyze.disabled = isBusy || !selectedInterpretFile || !currentProject();
  els.interpretAnalyze.classList.toggle("busy", isBusy);
  els.interpretAnalyze.textContent = isBusy ? "解读中" : "开始解读";
  els.interpretChatSend.disabled = isBusy || isSendingInterpretMessage || !currentInterpret() || !currentProject();
  els.interpretChatSend.classList.toggle("busy", isSendingInterpretMessage);
  els.interpretChatSend.textContent = isSendingInterpretMessage ? "发送中" : "发送";
  els.interpretChatInput.disabled = isBusy || isSendingInterpretMessage || !currentInterpret() || !currentProject();
  const uploadBtn = $("knowledge-upload-btn");
  if (uploadBtn) uploadBtn.disabled = isBusy || !selectedKnowledgeFile || !currentCompany();
}

async function loadState() {
  await Promise.all(
    Object.entries(STORAGE_KEYS).map(async ([name, key]) => {
      appState[name] = await readStorage(key, name === "index" ? {} : []);
    }),
  );
}

async function readStorage(key, fallback) {
  try {
    const result = await anna.storage.get({ key });
    const value = result?.value;
    if (value == null || value === "") return structuredClone(fallback);
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return structuredClone(fallback);
  }
}

function compactStringForStorage(value, maxChars = 4000) {
  const text = String(value || "");
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n...[已截断用于索引存储]` : text;
}

function compactListForStorage(items, limit = 20) {
  return (Array.isArray(items) ? items : []).slice(0, limit).map((item) => ({
    path: item.path || item.filename || "",
    kind: item.kind || "",
    reason: item.reason || "",
    char_count: item.char_count || null,
    page_count: item.page_count || null,
    processed_page_count: item.processed_page_count || null,
  }));
}

function slimArchiveForStorage(archive) {
  if (!archive) return null;
  return {
    kind: archive.kind || "",
    fileCount: archive.fileCount || 0,
    processedFileCount: archive.processedFileCount || 0,
    entries: compactListForStorage(archive.entries, 20),
    skipped: compactListForStorage(archive.skipped, 20),
    entriesTruncated: (archive.entries || []).length > 20,
    skippedTruncated: (archive.skipped || []).length > 20,
  };
}

function slimExtractionMetaForStorage(meta) {
  if (!meta) return meta;
  return {
    ...meta,
    warnings: (meta.warnings || []).slice(0, 20).map((warning) => compactStringForStorage(warning, 800)),
    entries: compactListForStorage(meta.entries, 20),
    skipped: compactListForStorage(meta.skipped, 20),
    entriesTruncated: (meta.entries || []).length > 20,
    skippedTruncated: (meta.skipped || []).length > 20,
  };
}

function slimReviewRecordForStorage(record) {
  const {
    report,
    analysis,
    extractedText,
    evidenceIndexCache,
    ...rest
  } = record;
  return {
    ...rest,
    failureReason: compactStringForStorage(rest.failureReason, 4000),
    sourceArchive: slimArchiveForStorage(rest.sourceArchive),
    extractionMeta: slimExtractionMetaForStorage(rest.extractionMeta),
    knowledgeRefs: (rest.knowledgeRefs || []).slice(0, 12).map((item) => ({
      id: item.id,
      title: item.title,
      score: item.score,
    })),
  };
}

function slimInterpretRecordForStorage(record) {
  const { analysis, evidenceIndexCache, ...rest } = record;
  return {
    ...rest,
    sourceArchive: slimArchiveForStorage(rest.sourceArchive),
    messages: (rest.messages || []).slice(-MAX_INTERPRET_RECENT_MESSAGES).map((message) => ({
      ...message,
      content: compactStringForStorage(message.content, 3000),
    })),
  };
}

async function saveStateSlice(name) {
  const value =
    name === "interprets"
      ? appState.interprets.map(slimInterpretRecordForStorage)
      : name === "reviews"
        ? appState.reviews.map(slimReviewRecordForStorage)
        : appState[name];
  await anna.storage.set({
    key: STORAGE_KEYS[name],
    value: JSON.stringify(value),
  });
}

async function saveIndex() {
  await saveStateSlice("index");
}

function ensureValidSelection() {
  if (!appState.companies.some((c) => c.id === appState.index.selectedCompanyId)) {
    appState.index.selectedCompanyId = appState.companies[0]?.id || null;
  }
  const projects = projectsForCurrentCompany();
  if (!projects.some((p) => p.id === appState.index.selectedProjectId)) {
    appState.index.selectedProjectId = projects[0]?.id || null;
  }
}

function currentCompany() {
  return appState.companies.find((c) => c.id === appState.index.selectedCompanyId) || null;
}

function currentProject() {
  return (
    appState.projects.find(
      (p) => p.id === appState.index.selectedProjectId && p.companyId === appState.index.selectedCompanyId,
    ) || null
  );
}

function projectsForCurrentCompany() {
  return appState.projects.filter((p) => p.companyId === appState.index.selectedCompanyId);
}

function knowledgeForCurrentCompany() {
  return appState.knowledge.filter((k) => k.companyId === appState.index.selectedCompanyId);
}

function reviewsForCurrentProject() {
  return appState.reviews
    .filter((r) => r.projectId === appState.index.selectedProjectId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function interpretsForCurrentProject() {
  return appState.interprets
    .filter((r) => r.projectId === appState.index.selectedProjectId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function renderAll() {
  renderNavigation();
  renderContextSelectors();
  renderManagementLists();
  renderContext();
  renderReviewAvailability();
  renderInterpretAvailability();
  renderKnowledgeList();
  renderRecordList();
  renderInterpretList();
  renderInterpretWorkspace();
  renderModal();
  updateActionState();
}

function renderNavigation() {
  for (const btn of els.navLinks) {
    btn.classList.toggle("active", btn.dataset.tab === activeTab);
  }
}

function renderContextSelectors() {
  const selectedCompanyId = appState.index.selectedCompanyId || "";
  els.companySelect.innerHTML = appState.companies.length
    ? appState.companies
        .map((company) => `<option value="${escapeHtml(company.id)}">${escapeHtml(company.name)}</option>`)
        .join("")
    : `<option value="">暂无公司</option>`;
  els.companySelect.value = selectedCompanyId;
  els.companySelect.disabled = !appState.companies.length;

  const projects = projectsForCurrentCompany();
  els.projectSelect.innerHTML = projects.length
    ? projects
        .map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`)
        .join("")
    : `<option value="">暂无项目</option>`;
  els.projectSelect.value = appState.index.selectedProjectId || "";
  els.projectSelect.disabled = !projects.length;
}

function renderManagementLists() {
  if (!appState.companies.length) {
    els.companyList.innerHTML = `<div class="empty">暂无公司，点击右上角新建公司。</div>`;
  } else {
    els.companyList.innerHTML = tableHtml(
      ["公司名称", "说明", "项目数", "知识条目数", "更新时间", "操作"],
      appState.companies
        .map((company) => {
          const active = company.id === appState.index.selectedCompanyId;
          const projectCount = appState.projects.filter((p) => p.companyId === company.id).length;
          const knowledgeCount = appState.knowledge.filter((k) => k.companyId === company.id).length;
          return `
            <tr class="${active ? "selected-row" : ""}">
              <td class="cell-strong">${escapeHtml(company.name)}</td>
              <td>${escapeHtml(company.description || "-")}</td>
              <td>${projectCount}</td>
              <td>${knowledgeCount}</td>
              <td>${formatDate(company.updatedAt || company.createdAt)}</td>
              <td>${rowActions([
                ["select-company", company.id, active ? "已选择" : "选择", "ghost"],
                ["edit-company", company.id, "编辑", "ghost"],
                ["delete-company", company.id, "删除", "danger"],
              ])}</td>
            </tr>
          `;
        })
        .join(""),
    );
  }

  const projects = projectsForCurrentCompany();
  if (!currentCompany()) {
    els.projectList.innerHTML = `<div class="empty">先在公司管理中新建或选择公司。</div>`;
  } else if (!projects.length) {
    els.projectList.innerHTML = `<div class="empty">当前公司暂无项目，点击右上角新建项目。</div>`;
  } else {
    els.projectList.innerHTML = tableHtml(
      ["项目名称", "系统名称", "保护等级", "审查记录数", "解读记录数", "更新时间", "操作"],
      projects
        .map((project) => {
          const active = project.id === appState.index.selectedProjectId;
          const reviewCount = appState.reviews.filter((r) => r.projectId === project.id).length;
          const interpretCount = appState.interprets.filter((r) => r.projectId === project.id).length;
          return `
            <tr class="${active ? "selected-row" : ""}">
              <td class="cell-strong">${escapeHtml(project.name)}</td>
              <td>${escapeHtml(project.systemName || "-")}</td>
              <td>${escapeHtml(project.level || "-")}</td>
              <td>${reviewCount}</td>
              <td>${interpretCount}</td>
              <td>${formatDate(project.updatedAt || project.createdAt)}</td>
              <td>${rowActions([
                ["select-project", project.id, active ? "已选择" : "选择", "ghost"],
                ["edit-project", project.id, "编辑", "ghost"],
                ["delete-project", project.id, "删除", "danger"],
              ])}</td>
            </tr>
          `;
        })
        .join(""),
    );
  }
}

function renderContext() {
  const project = currentProject();
  els.level.value = project?.level || "三级";
}

function renderReviewAvailability() {
  const ready = Boolean(currentCompany() && currentProject());
  els.reviewEmpty.hidden = ready;
  els.reviewContent.hidden = !ready;
  els.emptyProject.disabled = !currentCompany();
}

function renderInterpretAvailability() {
  const ready = Boolean(currentCompany() && currentProject());
  els.interpretEmpty.hidden = ready;
  els.interpretContent.hidden = !ready;
  els.interpretEmptyProject.disabled = !currentCompany();
}

function renderKnowledgeList() {
  const items = knowledgeForCurrentCompany().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  if (!currentCompany()) {
    els.knowledgeList.innerHTML = `<div class="empty">先选择公司后再管理知识库。</div>`;
    return;
  }
  if (!items.length) {
    els.knowledgeList.innerHTML = `<div class="empty">当前公司暂无知识条目，点击右上角“上传知识”。</div>`;
    return;
  }
  els.knowledgeList.innerHTML = tableHtml(
    ["标题", "标签", "类型", "字数", "更新时间", "操作"],
    items
      .map((item) => `
        <tr>
          <td class="cell-strong">${escapeHtml(item.title)}</td>
          <td>${escapeHtml((item.tags || []).join(", ") || "-")}</td>
          <td>${escapeHtml(item.docKind || "-")}</td>
          <td>${Number(item.charCount || 0).toLocaleString("zh-CN")}</td>
          <td>${formatDate(item.updatedAt || item.createdAt)}</td>
          <td>${rowActions([
            ["view-knowledge", item.id, "查看", "ghost"],
            ["edit-knowledge", item.id, "编辑", "ghost"],
            ["delete-knowledge", item.id, "删除", "danger"],
          ])}</td>
        </tr>
      `)
      .join(""),
  );
}

function renderRecordList() {
  const records = reviewsForCurrentProject();
  if (!currentProject()) {
    els.recordList.innerHTML = `<div class="empty">先选择项目后再查看审查记录。</div>`;
    return;
  }
  if (!records.length) {
    els.recordList.innerHTML = `<div class="empty">暂无审查记录。完成一次审查后会自动归档到这里。</div>`;
    return;
  }
  els.recordList.innerHTML = tableHtml(
    ["标题", "状态", "页数进度", "知识引用", "创建时间", "操作"],
    records
      .map((record) => `
        <tr>
          <td class="cell-strong">${escapeHtml(record.title)}</td>
          <td><span class="${reviewStatusClass(record)}">${escapeHtml(reviewStatusLabel(record))}</span></td>
          <td>${record.processedPages || 0}/${record.pageCount || "-"}</td>
          <td>${(record.knowledgeRefs || []).length} 条</td>
          <td>${formatDate(record.createdAt)}</td>
          <td>${rowActions([
            ["view-record", record.id, "查看", "ghost"],
            ["rerun-record", record.id, "重新审查", "ghost", reviewIsRunning(record)],
            ["download-source", record.id, "下载源文件", "ghost"],
            ["download-record", record.id, "下载报告", "ghost", !reviewReportPath(record)],
            ["delete-record", record.id, "删除", "danger"],
          ])}</td>
        </tr>
      `)
      .join(""),
  );
}

function reviewStatusLabel(record) {
  if (!record) return "-";
  if (record.status) return record.status;
  return record.reportComplete === false ? "失败" : "已完成";
}

function reviewStatusClass(record) {
  const label = reviewStatusLabel(record);
  const suffix =
    label === "失败"
      ? " error"
      : label === "重试中"
        ? " warning"
        : label === "运行中"
          ? " running"
          : "";
  return `status-chip${suffix}`;
}

function reviewIsRunning(record) {
  return ["运行中", "重试中"].includes(reviewStatusLabel(record));
}

function reviewIsComplete(record) {
  return reviewStatusLabel(record) === "已完成" && record?.reportComplete !== false;
}

function reviewReportPath(record) {
  if (!record) return "";
  if (record.reportComplete === false) {
    return record.reportDraftAvailable ? record.reportDraftPath || "" : "";
  }
  return record.reportPath || (record.reportDraftAvailable ? record.reportDraftPath : "") || "";
}

function currentInterpret() {
  return appState.interprets.find((r) => r.id === selectedInterpretId) || null;
}

function renderInterpretList() {
  const records = interpretsForCurrentProject();
  if (!currentProject()) {
    els.interpretList.innerHTML = `<div class="empty">先选择项目后再查看解读记录。</div>`;
    return;
  }
  if (!records.length) {
    els.interpretList.innerHTML = `<div class="empty">暂无解读记录。上传第三方测评结果后会自动归档到这里。</div>`;
    return;
  }
  els.interpretList.innerHTML = tableHtml(
    ["标题", "状态", "页数进度", "知识引用", "对话轮次", "更新时间", "操作"],
    records
      .map((record) => `
        <tr class="${record.id === selectedInterpretId ? "selected-row" : ""}">
          <td class="cell-strong">${escapeHtml(record.title)}</td>
          <td><span class="status-chip">${escapeHtml(record.status || "-")}</span></td>
          <td>${record.processedPages || 0}/${record.pageCount || "-"}</td>
          <td>${(record.knowledgeRefs || []).length} 条</td>
          <td>${Math.floor((record.messages || []).length / 2)} 轮</td>
          <td>${formatDate(record.updatedAt || record.createdAt)}</td>
          <td>${rowActions([
            ["open-interpret", record.id, "打开", "ghost"],
            ["download-interpret-source", record.id, "下载源文件", "ghost"],
            ["download-interpret-report", record.id, "下载报告", "ghost"],
            ["delete-interpret", record.id, "删除", "danger"],
          ])}</td>
        </tr>
      `)
      .join(""),
  );
}

function renderInterpretWorkspace() {
  const record = currentInterpret();
  els.interpretDownloadSource.disabled = !record?.sourceFilePath;
  els.interpretDownloadReport.disabled = !record?.analysisPath;
  els.interpretClearChat.disabled = !record || !(record.messages || []).length;
  els.interpretChatSend.disabled = isSendingInterpretMessage || !record || !currentProject();
  els.interpretChatSend.classList.toggle("busy", isSendingInterpretMessage);
  els.interpretChatSend.textContent = isSendingInterpretMessage ? "发送中" : "发送";
  els.interpretChatInput.disabled = isSendingInterpretMessage || !record || !currentProject();
  if (!record) {
    if (!selectedInterpretFile) {
      els.interpretReport.textContent = currentProject()
        ? "上传第三方测评结果文件后开始解读。"
        : "请先创建公司和项目。";
    }
    renderInterpretMessages([]);
    return;
  }
  if (record.analysis) {
    els.interpretReport.innerHTML = renderMarkdown(record.analysis);
  }
  renderInterpretMessages(record.messages || []);
  els.interpretStatName.textContent = record.sourceFilename || basename(record.sourceFilePath) || "-";
  els.interpretStatText.textContent = record.charCount
    ? `${Number(record.charCount).toLocaleString("zh-CN")} 字`
    : "-";
  els.interpretStatKnowledge.textContent = (record.knowledgeRefs || []).length
    ? `${record.knowledgeRefs.length} 条`
    : "未使用";
  els.interpretStatSession.textContent = record.appSessionUuid ? "已创建" : "未创建";
}

function renderInterpretMessages(messages, pendingText = "") {
  if (!messages.length && !pendingText) {
    els.interpretChatList.innerHTML = `<div class="empty">完成一次解读后，可以继续追问整改优先级、证据材料和具体修改建议。</div>`;
    return;
  }
  const rows = [...messages];
  if (pendingText) {
    rows.push({ role: "assistant", content: pendingText, pending: true });
  }
  els.interpretChatList.innerHTML = rows
    .map((message) => `
      <article class="chat-message ${message.role === "user" ? "user" : "assistant"} ${message.pending ? "pending" : ""}">
        <header>${message.role === "user" ? "你" : message.pending ? "Anna 正在处理" : "Anna"}</header>
        <div class="chat-bubble ${message.role === "assistant" ? "markdown-output" : ""} ${message.pending ? "pending-bubble" : ""}">
          ${message.role === "assistant" ? renderMarkdown(message.content || "") : escapeHtml(message.content || "")}
        </div>
      </article>
    `)
    .join("");
  els.interpretChatList.scrollTop = els.interpretChatList.scrollHeight;
}

function updateActionState() {
  els.analyze.disabled = !selectedFile || !currentCompany() || !currentProject();
  els.interpretAnalyze.disabled = !selectedInterpretFile || !currentCompany() || !currentProject();
  els.knowledgeOpenUpload.disabled = !currentCompany();
  els.projectCreate.disabled = !currentCompany();
  els.interpretChatSend.disabled = isSendingInterpretMessage || !currentInterpret() || !currentProject();
  els.interpretChatSend.classList.toggle("busy", isSendingInterpretMessage);
  els.interpretChatSend.textContent = isSendingInterpretMessage ? "发送中" : "发送";
  els.interpretChatInput.disabled = isSendingInterpretMessage || !currentInterpret() || !currentProject();
  const uploadBtn = $("knowledge-upload-btn");
  if (uploadBtn) {
    uploadBtn.disabled = !selectedKnowledgeFile || !currentCompany();
  }
}

function tableHtml(headings, rows) {
  return `
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr>${headings.map((heading) => `<th>${escapeHtml(heading)}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function rowActions(actions) {
  return `
    <div class="table-actions">
      ${actions
        .map(
          ([action, id, label, kind, disabled]) =>
            `<button class="${kind || "ghost"} mini-action" type="button" data-action="${escapeHtml(action)}" data-id="${escapeHtml(id)}" ${disabled ? "disabled" : ""}>${escapeHtml(label)}</button>`,
        )
        .join("")}
    </div>
  `;
}

function archiveSummaryHtml(archive) {
  if (!archive) return "";
  const entries = Array.isArray(archive.entries) ? archive.entries : [];
  const skipped = Array.isArray(archive.skipped) ? archive.skipped : [];
  const entryText = entries.length
    ? entries
        .slice(0, 30)
        .map((entry) => `${entry.path || "-"}（${entry.kind || "-"}，${Number(entry.char_count || 0).toLocaleString("zh-CN")} 字）`)
        .join("\n")
    : "暂无参与文件";
  const skippedText = skipped.length
    ? skipped
        .slice(0, 30)
        .map((item) => `${item.path || "-"}：${item.reason || "已跳过"}`)
        .join("\n")
    : "无";
  return `
    <h4 class="modal-subtitle">压缩包来源</h4>
    <dl class="meta-grid">
      <div><dt>格式</dt><dd>${escapeHtml(archive.kind || "-")}</dd></div>
      <div><dt>参与文件</dt><dd>${escapeHtml(`${archive.processedFileCount || 0}/${archive.fileCount || 0}`)}</dd></div>
      <div><dt>跳过文件</dt><dd>${escapeHtml(String(skipped.length))}</dd></div>
    </dl>
    <pre class="output modal-output active">${escapeHtml(`参与文件：\n${entryText}\n\n跳过文件：\n${skippedText}${entries.length > 30 || skipped.length > 30 ? "\n\n（仅显示前 30 条）" : ""}`)}</pre>
  `;
}

function reviewNoticeHtml(record) {
  if (!record) return "";
  const messages = [];
  if (reviewStatusLabel(record) === "失败" || record.reportComplete === false) {
    messages.push("未形成完整审查报告，可查看已保留内容并手动重新审查。");
  }
  if (record.failureStage || record.failureReason) {
    messages.push(`失败阶段：${record.failureStage || "-"}；原因：${record.failureReason || "-"}`);
  }
  if (record.extractionTruncated) {
    messages.push("抽取内容达到页数、文件数或字符上限，报告仅覆盖已处理材料。");
  }
  if (!messages.length) return "";
  return `<div class="modal-alert ${reviewStatusLabel(record) === "失败" ? "error" : "warning"}">${escapeHtml(messages.join("\n"))}</div>`;
}

function openModal(type, payload = {}) {
  modalState = { type, payload };
  renderModal();
}

function closeModal() {
  modalState = { type: null, payload: null };
  selectedKnowledgeFile = null;
  renderModal();
}

function renderModal() {
  if (!modalState.type) {
    els.modalBackdrop.hidden = true;
    els.modalTitle.textContent = "";
    els.modalBody.innerHTML = "";
    els.modalFooter.innerHTML = "";
    return;
  }

  els.modalBackdrop.hidden = false;
  const { type, payload } = modalState;
  const viewOutput = (text) => `<pre class="output modal-output active">${escapeHtml(text || "")}</pre>`;
  const viewMarkdown = (text) => `<div class="output markdown-output modal-output active">${renderMarkdown(text || "")}</div>`;

  if (type === "record-view") {
    const record = payload.record;
    els.modalTitle.textContent = "审查报告";
    els.modalBody.innerHTML = payload.loading
      ? `<div class="empty">正在读取审查归档...</div>`
      : payload.error
        ? `<div class="empty">${escapeHtml(payload.error)}</div>`
        : `
          ${reviewNoticeHtml(record)}
          <dl class="meta-grid">
            <div><dt>标题</dt><dd>${escapeHtml(record.title)}</dd></div>
            <div><dt>状态</dt><dd>${escapeHtml(reviewStatusLabel(record))}</dd></div>
            <div><dt>时间</dt><dd>${escapeHtml(formatDate(record.createdAt))}</dd></div>
            <div><dt>重试</dt><dd>${escapeHtml(`${record.retryCount || 0}/${record.maxRetries || REVIEW_MAX_RETRIES}`)}</dd></div>
            <div><dt>知识库引用</dt><dd>${escapeHtml((record.knowledgeRefs || []).map((k) => k.title).join("；") || "未使用公司知识库")}</dd></div>
          </dl>
          ${archiveSummaryHtml(record.sourceArchive)}
          ${viewMarkdown(payload.report || "暂无报告内容。")}
          ${payload.extracted ? `<h4 class="modal-subtitle">抽取文本节选</h4>${viewOutput(payload.extracted.slice(0, 12000))}` : ""}
        `;
    els.modalFooter.innerHTML = `
      <button class="ghost compact-action" type="button" data-modal-action="rerun-record" ${reviewIsRunning(record) ? "disabled" : ""}>重新审查</button>
      <button class="ghost compact-action" type="button" data-modal-action="download-source" ${record?.sourceFilePath ? "" : "disabled"}>下载源文件</button>
      <button class="ghost compact-action" type="button" data-modal-action="download-record" ${reviewReportPath(record) ? "" : "disabled"}>下载报告</button>
      <button class="ghost compact-action" type="button" data-modal-action="close-modal">关闭</button>
    `;
    return;
  }

  if (type === "knowledge-view") {
    const item = payload.item;
    els.modalTitle.textContent = "查看知识";
    els.modalBody.innerHTML = payload.loading
      ? `<div class="empty">正在读取知识文本...</div>`
      : payload.error
        ? `<div class="empty">${escapeHtml(payload.error)}</div>`
        : `
          <dl class="meta-grid">
            <div><dt>标题</dt><dd>${escapeHtml(item.title)}</dd></div>
            <div><dt>标签</dt><dd>${escapeHtml((item.tags || []).join(", ") || "-")}</dd></div>
            <div><dt>类型</dt><dd>${escapeHtml(item.docKind || "-")}</dd></div>
            <div><dt>字数</dt><dd>${Number(item.charCount || 0).toLocaleString("zh-CN")}</dd></div>
          </dl>
          ${payload.summary ? `<p class="modal-summary">${escapeHtml(payload.summary)}</p>` : ""}
          ${viewOutput(payload.text)}
        `;
    els.modalFooter.innerHTML = `
      <button class="primary compact-action" type="button" data-modal-action="edit-knowledge">编辑</button>
      <button class="ghost compact-action" type="button" data-modal-action="close-modal">关闭</button>
    `;
    return;
  }

  if (type === "knowledge-edit") {
    const item = payload.item || {};
    els.modalTitle.textContent = "编辑知识";
    els.modalBody.innerHTML = payload.loading
      ? `<div class="empty">正在读取知识文本...</div>`
      : `
        <div class="controls two flat-controls">
          <label><span>知识标题</span><input id="knowledge-edit-title" type="text" value="${escapeHtml(item.title || "")}" /></label>
          <label><span>标签</span><input id="knowledge-edit-tags" type="text" value="${escapeHtml((item.tags || []).join(", "))}" /></label>
        </div>
        <label class="stacked"><span>摘要</span><textarea id="knowledge-summary" rows="3">${escapeHtml(payload.summary ?? item.summary ?? "")}</textarea></label>
        <label class="stacked"><span>知识文本</span><textarea id="knowledge-text" class="tall-textarea" rows="18">${escapeHtml(payload.text || "")}</textarea></label>
      `;
    els.modalFooter.innerHTML = `
      <button class="danger compact-action" type="button" data-modal-action="delete-knowledge">删除知识</button>
      <button class="ghost compact-action" type="button" data-modal-action="close-modal">取消</button>
      <button class="primary compact-action" type="button" data-modal-action="save-knowledge">保存知识</button>
    `;
    return;
  }

  if (type === "knowledge-upload") {
    els.modalTitle.textContent = "上传知识";
    els.modalBody.innerHTML = `
      <label id="knowledge-drop-zone" class="drop-zone compact" for="knowledge-file-input">
        <input id="knowledge-file-input" type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" />
        <span class="drop-title">选择知识库文档</span>
        <span id="knowledge-file-meta" class="drop-meta">PDF / DOCX / TXT / MD，最大 200 MB</span>
      </label>
      <div class="controls two">
        <label><span>标题</span><input id="knowledge-title" type="text" placeholder="默认使用文件名" /></label>
        <label><span>标签</span><input id="knowledge-tags" type="text" placeholder="制度,三级,整改" /></label>
      </div>
    `;
    els.modalFooter.innerHTML = `
      <button class="ghost compact-action" type="button" data-modal-action="close-modal">取消</button>
      <button id="knowledge-upload-btn" class="primary compact-action" type="button" data-modal-action="upload-knowledge" disabled>上传到知识库</button>
    `;
    bindDropZone($("knowledge-drop-zone"), $("knowledge-file-input"), selectKnowledgeFile);
    return;
  }

  if (type === "company-form") {
    const company = payload.company || {};
    els.modalTitle.textContent = payload.mode === "create" ? "新建公司" : "编辑公司";
    els.modalBody.innerHTML = `
      <div class="modal-form">
        <label><span>公司名称</span><input id="company-name" type="text" value="${escapeHtml(company.name || "")}" /></label>
        <label><span>公司说明</span><textarea id="company-desc" rows="6">${escapeHtml(company.description || "")}</textarea></label>
      </div>
    `;
    els.modalFooter.innerHTML = `
      ${payload.mode === "edit" ? `<button class="danger compact-action" type="button" data-modal-action="delete-company">删除公司</button>` : ""}
      <button class="ghost compact-action" type="button" data-modal-action="close-modal">取消</button>
      <button class="primary compact-action" type="button" data-modal-action="save-company">保存公司</button>
    `;
    $("company-name")?.focus();
    return;
  }

  if (type === "project-form") {
    const project = payload.project || {};
    els.modalTitle.textContent = payload.mode === "create" ? "新建项目" : "编辑项目";
    els.modalBody.innerHTML = `
      <div class="modal-form">
        <label><span>项目名称</span><input id="project-name" type="text" value="${escapeHtml(project.name || "")}" /></label>
        <label><span>系统名称</span><input id="project-system" type="text" value="${escapeHtml(project.systemName || "")}" /></label>
        <label><span>保护等级</span>
          <select id="project-level">
            <option value="三级" ${project.level === "三级" || !project.level ? "selected" : ""}>三级</option>
            <option value="二级" ${project.level === "二级" ? "selected" : ""}>二级</option>
            <option value="四级" ${project.level === "四级" ? "selected" : ""}>四级</option>
            <option value="一级" ${project.level === "一级" ? "selected" : ""}>一级</option>
          </select>
        </label>
        <label><span>项目说明</span><textarea id="project-desc" rows="5">${escapeHtml(project.description || "")}</textarea></label>
      </div>
    `;
    els.modalFooter.innerHTML = `
      ${payload.mode === "edit" ? `<button class="danger compact-action" type="button" data-modal-action="delete-project">删除项目</button>` : ""}
      <button class="ghost compact-action" type="button" data-modal-action="close-modal">取消</button>
      <button class="primary compact-action" type="button" data-modal-action="save-project">保存项目</button>
    `;
    $("project-name")?.focus();
  }
}

function selectFile(file) {
  selectedFile = file || null;
  latestReport = "";
  latestExtraction = null;
  latestKnowledgeRefs = [];
  resetProgress();
  resetSteps();

  if (!selectedFile) {
    els.fileMeta.textContent = REVIEW_SOURCE_LABEL;
    els.statName.textContent = "未选择";
    els.statText.textContent = "0 字";
    els.statKnowledge.textContent = "0 条";
    els.statModel.textContent = "等待";
    if (els.statTesseract) els.statTesseract.textContent = "等待检测";
    setReportPlain(currentProject() ? "等待上传文档。" : "请先创建公司和项目。");
    els.text.textContent = "尚无抽取文本。";
    updateActionState();
    return;
  }

  els.statName.textContent = selectedFile.name;
  els.fileMeta.textContent = `${selectedFile.name} · ${formatBytes(selectedFile.size)}`;
  els.statText.textContent = "等待抽取";
  els.statKnowledge.textContent = "等待";
  els.statModel.textContent = "等待";
  if (els.statTesseract) els.statTesseract.textContent = "等待检测";

  if (!isSupported(selectedFile)) {
    setReportPlain("仅支持 .pdf、.docx、.xlsx、.csv、.txt、.md、.zip、.tar.gz、.tgz 文件。");
    selectedFile = null;
  } else if (selectedFile.size > MAX_FILE_BYTES) {
    setReportPlain(`文件过大：${formatBytes(selectedFile.size)}。当前限制为 ${formatBytes(MAX_FILE_BYTES)}。`);
    selectedFile = null;
  } else {
    setReportPlain(currentProject() ? "已选择文档。" : "请先创建公司和项目。");
    els.text.textContent = "等待抽取文本。";
  }
  updateActionState();
}

function selectKnowledgeFile(file) {
  selectedKnowledgeFile = file || null;
  const meta = $("knowledge-file-meta");
  const title = $("knowledge-title");
  if (!selectedKnowledgeFile) {
    if (meta) meta.textContent = KNOWLEDGE_SOURCE_LABEL;
    updateActionState();
    return;
  }
  if (meta) meta.textContent = `${selectedKnowledgeFile.name} · ${formatBytes(selectedKnowledgeFile.size)}`;
  if (!["pdf", "docx", "txt", "md", "markdown"].includes(fileExt(selectedKnowledgeFile.name))) {
    if (meta) meta.textContent = "仅支持 .pdf、.docx、.txt、.md 文件。";
    selectedKnowledgeFile = null;
  } else if (selectedKnowledgeFile.size > MAX_FILE_BYTES) {
    if (meta) meta.textContent = `文件过大：${formatBytes(selectedKnowledgeFile.size)}，当前限制为 ${formatBytes(MAX_FILE_BYTES)}。`;
    selectedKnowledgeFile = null;
  }
  if (selectedKnowledgeFile && title && !title.value.trim()) {
    title.value = selectedKnowledgeFile.name.replace(/\.[^.]+$/, "");
  }
  updateActionState();
}

function selectInterpretFile(file) {
  selectedInterpretFile = file || null;
  selectedInterpretId = null;
  resetProgress("interpret");
  resetSteps("interpret");
  renderInterpretMessages([]);
  els.interpretStatSession.textContent = "等待";

  if (!selectedInterpretFile) {
    els.interpretFileMeta.textContent = REVIEW_SOURCE_LABEL;
    els.interpretStatName.textContent = "未选择";
    els.interpretStatText.textContent = "0 字";
    els.interpretStatKnowledge.textContent = "0 条";
    els.interpretReport.textContent = currentProject() ? "上传第三方测评结果文件后开始解读。" : "请先创建公司和项目。";
    updateActionState();
    return;
  }

  els.interpretStatName.textContent = selectedInterpretFile.name;
  els.interpretFileMeta.textContent = `${selectedInterpretFile.name} · ${formatBytes(selectedInterpretFile.size)}`;
  els.interpretStatText.textContent = "等待抽取";
  els.interpretStatKnowledge.textContent = "等待";

  if (!isSupported(selectedInterpretFile)) {
    els.interpretReport.textContent = "仅支持 .pdf、.docx、.xlsx、.csv、.txt、.md、.zip、.tar.gz、.tgz 文件。";
    selectedInterpretFile = null;
    els.interpretDownloadSource.disabled = true;
    els.interpretDownloadReport.disabled = true;
    els.interpretClearChat.disabled = true;
    updateActionState();
    return;
  } else if (selectedInterpretFile.size > MAX_FILE_BYTES) {
    els.interpretReport.textContent = `文件过大：${formatBytes(selectedInterpretFile.size)}。当前限制为 ${formatBytes(MAX_FILE_BYTES)}。`;
    selectedInterpretFile = null;
    els.interpretDownloadSource.disabled = true;
    els.interpretDownloadReport.disabled = true;
    els.interpretClearChat.disabled = true;
    updateActionState();
    return;
  } else {
    els.interpretReport.textContent = currentProject() ? "已选择第三方测试结果文件。" : "请先创建公司和项目。";
  }
  renderInterpretList();
  renderInterpretWorkspace();
  updateActionState();
}

function readBlobAsBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",", 2)[1] : result);
    };
    reader.readAsDataURL(blob);
  });
}

function extractContent(reply) {
  const content = reply?.content;
  if (typeof content === "string") return content;
  if (content?.type === "text") return content.text || "";
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.type === "text") return part.text || "";
        return "";
      })
      .join("");
  }
  return typeof reply === "string" ? reply : JSON.stringify(reply, null, 2);
}

function llmFinishReason(reply) {
  return (
    reply?.finish_reason ||
    reply?.finishReason ||
    reply?.stop_reason ||
    reply?.stopReason ||
    reply?.choices?.[0]?.finish_reason ||
    reply?.choices?.[0]?.finishReason ||
    ""
  );
}

function stripReportEndMarker(text) {
  return String(text || "").replace(REVIEW_REPORT_END_MARKER, "").trim();
}

function reviewPromptContext() {
  return {
    docKind: activeReviewParams?.docKind || els.docKind.value,
    filename: activeReviewParams?.filename || selectedFile?.name || "-",
    maxPages: activeReviewParams?.maxPages || selectedProcessPages(),
  };
}

function isLengthFinishReason(reason) {
  return /length|max_tokens|token/i.test(String(reason || ""));
}

function isReviewReportComplete(report, reply = null) {
  const value = String(report || "").trim();
  const finishReason = llmFinishReason(reply);
  if (!value) {
    return { ok: false, reason: "报告为空", finishReason };
  }
  if (isLengthFinishReason(finishReason)) {
    return { ok: false, reason: `LLM 因长度限制停止：${finishReason}`, finishReason };
  }
  if (!value.includes(REVIEW_REPORT_END_MARKER)) {
    return { ok: false, reason: "缺少报告结束标记", finishReason };
  }
  const markerIndex = value.lastIndexOf(REVIEW_REPORT_END_MARKER);
  if (value.slice(markerIndex + REVIEW_REPORT_END_MARKER.length).trim()) {
    return { ok: false, reason: "结束标记后仍有额外内容", finishReason };
  }
  const visible = stripReportEndMarker(value);
  const codeFenceCount = (visible.match(/```/g) || []).length;
  if (codeFenceCount % 2 === 1) {
    return { ok: false, reason: "Markdown 代码块未闭合", finishReason };
  }
  const tail = visible.slice(-160).trim();
  if (/[`、，,：:（(【[]$/.test(tail) || /Segment\s+\d+\s*:\s*`?[^`\n]{0,80}$/i.test(tail)) {
    return { ok: false, reason: "报告末尾疑似断在半截句子或来源路径中", finishReason };
  }
  return { ok: true, reason: "", finishReason };
}

function makeIncompleteReportError(validation, report, reply) {
  const err = new Error(`LLM 报告未完整生成：${validation.reason || "未知原因"}`);
  err.partialReport = stripReportEndMarker(report);
  err.llmFinishReason = validation.finishReason || llmFinishReason(reply);
  err.failureStage = "finalize";
  return err;
}

async function completeLlmWithRetry(requestFactory, stageLabel, record = null, failureStage = "analyze") {
  let lastErr = null;
  for (let attempt = 0; attempt <= REVIEW_MAX_RETRIES; attempt += 1) {
    try {
      if (attempt > 0) {
        setProgress(`${stageLabel}失败，正在自动重试 ${attempt}/${REVIEW_MAX_RETRIES}`, null);
      }
      return await requestFactory(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt >= REVIEW_MAX_RETRIES) break;
      if (record) {
        await updateReviewRecord(record, {
          status: "重试中",
          completionState: "retrying",
          retryCount: attempt + 1,
          maxRetries: REVIEW_MAX_RETRIES,
          failureStage,
          failureReason: errorMessage(err),
        });
      }
      setProgress(`${stageLabel}失败，正在自动重试 ${attempt + 1}/${REVIEW_MAX_RETRIES}：${errorMessage(err)}`, null);
      await wait(1000);
    }
  }
  throw lastErr || new Error(`${stageLabel}失败`);
}

function coverageNotice(extraction) {
  const lines = [];
  if (extraction?.truncated) {
    lines.push("抽取文本达到字符上限，报告仅覆盖已成功抽取的内容。");
  }
  if (extraction?.kind === "archive" && Number(extraction.processed_file_count || 0) < Number(extraction.file_count || 0)) {
    lines.push(`压缩包仅处理 ${extraction.processed_file_count || 0}/${extraction.file_count || 0} 个可抽取文件。`);
  }
  if (extraction?.page_count && Number(extraction.processed_page_count || 0) < Number(extraction.page_count || 0)) {
    lines.push(`文档仅处理 ${extraction.processed_page_count || 0}/${extraction.page_count || 0} 页。`);
  }
  if (!lines.length) return "";
  return `> 覆盖范围限制：${lines.join(" ")}\n\n`;
}

function prependCoverageNotice(report, extraction) {
  const notice = coverageNotice(extraction);
  const clean = stripReportEndMarker(report);
  return notice && !clean.includes("覆盖范围限制") ? `${notice}${clean}` : clean;
}

async function uploadFileToPath(runtime, file, path, contentType) {
  setProgress("正在协商源文件上传地址", null);
  if (isArchiveName(file.name) && isLocalDevOrigin()) {
    localFileStore.set(path, {
      file,
      filename: file.name,
      contentType,
      size: file.size,
      transient: true,
      createdAt: nowIso(),
    });
    setProgress("本地 dev 模式：压缩包跳过 R2 直传，直接进入本地抽取", null);
    return path;
  }
  let init;
  try {
    init = await runtime.files.upload_init({
      path,
      content_type: contentType,
      size: file.size,
    });
  } catch (err) {
    if (!isNotImplementedError(err)) throw err;
    if (file.size > INLINE_CAP_BYTES) {
      throw new Error(`当前是本地 legacy 模式，不支持 ${formatBytes(file.size)} 的大文件上传。请切换到 APS / staging，或使用 ${formatBytes(INLINE_CAP_BYTES)} 以内的小文件调试。`);
    }
    localFileStore.set(path, {
      file,
      filename: file.name,
      contentType,
      size: file.size,
      createdAt: nowIso(),
    });
    setProgress("本地 dev 模式：源文件已暂存到浏览器内存", null);
    return path;
  }
  const putUrl = init.put_url || init.upload_url;
  if (!putUrl) {
    throw new Error(`files.upload_init 未返回 put_url/upload_url，返回字段：${Object.keys(init || {}).join(", ")}`);
  }
  const putHeaders = normalizeHeaders(init.headers);
  let put;
  try {
    put = await putFileWithFallback(putUrl, file, putHeaders, (loaded, total) => {
      const percent = total ? (loaded / total) * 100 : null;
      setProgress(`正在上传源文件 ${formatBytes(loaded)} / ${formatBytes(total || file.size)}`, percent);
    });
  } catch (err) {
    if (!isArchiveName(file.name)) throw err;
    localFileStore.set(path, {
      file,
      filename: file.name,
      contentType,
      size: file.size,
      uploadError: errorMessage(err),
      transient: true,
      createdAt: nowIso(),
    });
    setProgress("R2 直传失败，已切换为本地临时压缩包抽取", null);
    return path;
  }
  const etag =
    (put.etag || "").replace(/"/g, "") ||
    init.upload_id ||
    String(Date.now());
  setProgress("正在确认源文件上传", null);
  await runtime.files.upload_finalize({ path, etag, size_bytes: file.size });
  return path;
}

async function writeTextFile(runtime, path, text) {
  const bytes = new TextEncoder().encode(text);
  let init;
  try {
    init = await runtime.files.upload_init({
      path,
      content_type: TEXT_UPLOAD_TYPE,
      size: bytes.length,
    });
  } catch (err) {
    if (!isNotImplementedError(err)) throw err;
    localFileStore.set(path, {
      text,
      bytes,
      filename: basename(path),
      contentType: TEXT_UPLOAD_TYPE,
      size: bytes.length,
      createdAt: nowIso(),
    });
    return path;
  }
  const putUrl = init.put_url || init.upload_url;
  if (!putUrl) {
    throw new Error(`files.upload_init 未返回 put_url/upload_url，返回字段：${Object.keys(init || {}).join(", ")}`);
  }
  const put = await fetchWithTimeout(putUrl, {
    method: "PUT",
    headers: normalizeHeaders(init.headers),
    body: bytes,
  }, 120000);
  if (!put.ok) {
    const body = await put.text().catch(() => "");
    throw new Error(`文本保存失败：HTTP ${put.status} ${body.slice(0, 160)}`);
  }
  const etag =
    (put.headers.get("ETag") || put.headers.get("etag") || "").replace(/"/g, "") ||
    init.upload_id ||
    String(Date.now());
  await runtime.files.upload_finalize({ path, etag, size_bytes: bytes.length });
  return path;
}

async function putFileWithFallback(url, body, headers, onProgress, timeoutMs = 10 * 60 * 1000) {
  try {
    return await putWithProgress(url, body, headers, onProgress, timeoutMs);
  } catch (xhrErr) {
    const message = errorMessage(xhrErr);
    if (!/网络失败|network|failed to fetch/i.test(message)) throw xhrErr;
    setProgress("XHR 上传失败，正在使用 fetch 重试", null);
    try {
      const resp = await fetchWithTimeout(url, {
        method: "PUT",
        headers,
        body,
      }, timeoutMs);
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status} ${text.slice(0, 160)}`);
      }
      return {
        etag: resp.headers.get("ETag") || resp.headers.get("etag") || "",
      };
    } catch (fetchErr) {
      let host = "";
      try {
        host = new URL(url).host;
      } catch {
        host = "unknown-host";
      }
      const contentType = headers?.["Content-Type"] || headers?.["content-type"] || "-";
      throw new Error(
        `文件上传网络失败：无法 PUT 到 ${host}。XHR：${message}；fetch：${errorMessage(fetchErr)}。Content-Type=${contentType}。这通常是浏览器到 R2 的网络/CORS/代理问题，不是 upload_init 失败。`,
      );
    }
  }
}

function putWithProgress(url, body, headers, onProgress, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timer = window.setTimeout(() => {
      xhr.abort();
      reject(new Error(`文件上传超时，已等待 ${Math.round(timeoutMs / 1000)} 秒`));
    }, timeoutMs);

    xhr.open("PUT", url);
    for (const [key, value] of Object.entries(headers || {})) {
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.onprogress = (event) => {
      onProgress?.(event.loaded || 0, event.lengthComputable ? event.total : body.size || 0);
    };
    xhr.onerror = () => {
      window.clearTimeout(timer);
      let host = "";
      try {
        host = new URL(url).host;
      } catch {
        host = "unknown-host";
      }
      reject(new Error(`文件上传网络失败：PUT ${host}，status=${xhr.status || 0}，readyState=${xhr.readyState}`));
    };
    xhr.onabort = () => {
      window.clearTimeout(timer);
      reject(new Error("文件上传已中止"));
    };
    xhr.onload = () => {
      window.clearTimeout(timer);
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`文件上传失败：HTTP ${xhr.status} ${String(xhr.responseText || "").slice(0, 160)}`));
        return;
      }
      resolve({ etag: xhr.getResponseHeader("ETag") || xhr.getResponseHeader("etag") || "" });
    };
    xhr.send(body);
  });
}

function normalizeHeaders(headers) {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`请求超时，已等待 ${Math.round(timeoutMs / 1000)} 秒`);
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

async function readTextFile(runtime, path) {
  if (localFileStore.has(path)) {
    const item = localFileStore.get(path);
    if (typeof item.text === "string") return item.text;
    if (item.bytes) return new TextDecoder().decode(item.bytes);
  }
  const link = await runtime.files.download_url({ path });
  const url = link.get_url || link.url || link.download_url;
  if (!url) throw new Error(`files.download_url 未返回可读取链接，返回字段：${Object.keys(link || {}).join(", ")}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`读取文件失败：HTTP ${resp.status}`);
  return resp.text();
}

async function readSourceArrayBuffer(runtime, file, source) {
  if (file instanceof Blob) return file.arrayBuffer();
  if (source?.storagePath && localFileStore.has(source.storagePath)) {
    const item = localFileStore.get(source.storagePath);
    if (item.file instanceof Blob) return item.file.arrayBuffer();
    if (item.bytes) return item.bytes.buffer.slice(item.bytes.byteOffset, item.bytes.byteOffset + item.bytes.byteLength);
    if (typeof item.text === "string") return new TextEncoder().encode(item.text).buffer;
  }
  if (source?.args?.bytes_b64) {
    const binary = atob(source.args.bytes_b64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes.buffer;
  }
  if (source?.storagePath) {
    const link = await runtime.files.download_url({ path: source.storagePath });
    const url = link.get_url || link.url || link.download_url;
    if (!url) throw new Error(`files.download_url 未返回可读取链接，返回字段：${Object.keys(link || {}).join(", ")}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`读取文件失败：HTTP ${resp.status}`);
    return resp.arrayBuffer();
  }
  throw new Error("缺少可读取的文件来源");
}

async function extractDirectTextDocument(runtime, file, source) {
  const ext = fileExt(file.name);
  setProgress(`正在读取 ${ext.toUpperCase()} 文本`, null);
  const buffer = await readSourceArrayBuffer(runtime, file, source);
  const bytes = new Uint8Array(buffer);
  const encodings = ext === "csv"
    ? [{ name: "utf-8", fatal: true }, { name: "gb18030", fatal: true }, { name: "utf-8", fatal: false }]
    : [{ name: "utf-8", fatal: true }, { name: "gb18030", fatal: true }, { name: "utf-8", fatal: false }];
  let text = "";
  let usedEncoding = encodings[0].name;
  let lastError = null;
  for (const encoding of encodings) {
    try {
      text = new TextDecoder(encoding.name, { fatal: encoding.fatal }).decode(bytes);
      usedEncoding = encoding.name;
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!text && lastError) throw lastError;
  text = text.replace(/^\uFEFF/, "");
  const truncated = text.length > MAX_EXTRACT_CHARS;
  if (truncated) text = text.slice(0, MAX_EXTRACT_CHARS);
  return {
    kind: ext,
    filename: file.name,
    mime_type: source.contentType,
    size_bytes: file.size || bytes.byteLength,
    text,
    char_count: text.length,
    line_count: text ? text.split(/\r\n?|\n/).length : 0,
    truncated,
    warnings: [`前端直接读取 ${ext.toUpperCase()} 文本${usedEncoding ? `（${usedEncoding}）` : ""}`],
  };
}

async function deleteFileQuietly(runtime, path) {
  if (!path) return;
  if (localFileStore.has(path)) {
    localFileStore.delete(path);
    return;
  }
  try {
    await runtime.files.delete({ path });
  } catch {
    // File cleanup is best-effort; indexes remain the source of truth.
  }
}

async function downloadLocalFile(path, filename) {
  const item = localFileStore.get(path);
  if (!item) return;
  const blob = item.file instanceof Blob
    ? item.file
    : item.text != null
      ? new Blob([item.text], { type: item.contentType || TEXT_UPLOAD_TYPE })
      : new Blob([item.bytes || new Uint8Array()], { type: item.contentType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || item.filename || basename(path) || "download";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function executaToolIds() {
  const mappedToolId = typeof window !== "undefined"
    ? window.__ANNA_TOOL_IDS__?.[EXECUTA_HANDLE]
    : "";
  return Array.from(new Set([
    mappedToolId,
    DEV_FALLBACK_TOOL_ID,
    BUNDLED_TOOL_ID,
  ].filter(Boolean)));
}

async function invokeExtractor(runtime, args, method = EXECUTA_METHOD) {
  let lastError = null;
  for (const toolId of executaToolIds()) {
    try {
      const reply = await runtime.tools.invoke({
        tool_id: toolId,
        method,
        args,
        timeoutMs: TOOL_HOST_TIMEOUT_MS,
      }, { timeoutMs: TOOL_CLIENT_TIMEOUT_MS });
      if (reply?.success === false) {
        throw new Error(reply.error || "Executa returned success=false");
      }
      return reply?.data || reply;
    } catch (err) {
      lastError = err;
      if (!isToolResolutionError(err)) throw err;
    }
  }
  throw lastError || new Error("Document extractor is not available");
}

function isToolResolutionError(err) {
  const message = errorMessage(err);
  const code = err?.code || err?.error?.code || "";
  return (
    (code === "permission_denied" && /not whitelisted by host_api\.tools/i.test(message)) ||
    /executa_not_deployed|tool_not_found|not deployed|not found/i.test(`${code} ${message}`)
  );
}

function emptyExtractionMessage(extraction) {
  const warnings = Array.isArray(extraction?.warnings) ? extraction.warnings.filter(Boolean) : [];
  const warningText = warnings.length ? `\n\n抽取提示：\n- ${warnings.join("\n- ")}` : "";
  const ocrHint = extraction?.ocr_used
    ? "\n\n已尝试 OCR，但未识别到可分析文本。若在 staging 运行，请确认所选 Agent 已安装 Tesseract 及中文语言包 chi_sim。"
    : "\n\n未检测到 PDF 文本层。若文档是扫描件或图片型 PDF，需要 OCR 能力。";
  return `未抽取到可分析文本，请检查文档是否为扫描件或图片型 PDF。${ocrHint}${warningText}`;
}

function shouldRunExtractionDiagnostics(err, activeStep) {
  const stage = err?.failureStage || activeStep?.dataset?.step || "";
  const message = errorMessage(err);
  return (
    stage === "extract" ||
    /抽取|OCR|Tesseract|document-extractor|doc_read|sheet_read|tool|executa|bridge|PDF|DOCX|XLSX|archive|压缩包/i.test(message)
  );
}

function formatCatalogDiagnostic(catalog) {
  if (!catalog) return ["Agent catalog：当前运行时未提供 agent.session.catalog"];
  if (catalog.error) return [`Agent catalog：读取失败：${errorMessage(catalog.error)}`];
  const tools = ["doc_read", "sheet_read"].map((name) => {
    const item = (catalog.platform_tools || []).find((tool) => tool.name === name);
    if (!item) return `${name}: 不在 catalog 中`;
    if (item.eligible) return `${name}: eligible`;
    const blocked = Array.isArray(item.blocked_by) ? item.blocked_by.join("/") : item.blocked_by || "unknown";
    return `${name}: blocked_by=${blocked}`;
  });
  return [
    `Agent inherit_host_tools_granted: ${catalog.inherit_host_tools_granted ? "yes" : "no"}`,
    ...tools,
  ];
}

function formatExtractorDiagnostic(diag) {
  if (!diag) return ["document-extractor：未返回诊断信息"];
  if (diag.error) return [`document-extractor：诊断失败：${diag.error}`];
  const tesseract = diag.tesseract || {};
  return [
    `document-extractor: available, version=${diag.plugin_version || "-"}`,
    `Python: ${diag.python || "-"} (${diag.platform || "-"})`,
    `PyMuPDF: ${diag.dependencies?.fitz || "-"}`,
    `pytesseract: ${diag.dependencies?.pytesseract || "-"}`,
    `Tesseract: ${tesseract.available ? "available" : "missing"}${tesseract.path ? ` (${tesseract.path})` : ""}`,
    tesseract.resolution_source ? `Tesseract source: ${tesseract.resolution_source}` : "",
    tesseract.version ? `Tesseract version: ${tesseract.version}` : "",
    tesseract.tessdata_prefix ? `Tessdata: ${tesseract.tessdata_prefix}` : "",
    `chi_sim: ${tesseract.has_chi_sim ? "installed" : "missing"}`,
    tesseract.error ? `Tesseract error: ${tesseract.error}` : "",
  ].filter(Boolean);
}

function formatTesseractStat(diag) {
  const tesseract = diag?.tesseract || {};
  if (!diag || diag.error) return "诊断失败";
  if (!tesseract.available) return "缺失";
  return tesseract.has_chi_sim ? "可用（chi_sim）" : "可用（缺 chi_sim）";
}

async function refreshTesseractStat(runtime) {
  if (!els.statTesseract) return null;
  els.statTesseract.textContent = "检测中";
  try {
    const diag = await invokeExtractor(runtime, {}, EXECUTA_DIAGNOSE_METHOD);
    els.statTesseract.textContent = formatTesseractStat(diag);
    return diag;
  } catch (err) {
    els.statTesseract.textContent = `诊断失败：${errorMessage(err)}`;
    return { error: errorMessage(err) };
  }
}

async function diagnoseExtractionEnvironment(runtime) {
  const lines = ["", "运行环境诊断："];
  const catalog = await nativeParserCatalog(runtime).catch((err) => ({ error: err }));
  lines.push(...formatCatalogDiagnostic(catalog).map((line) => `- ${line}`));
  try {
    const diag = await invokeExtractor(runtime, {}, EXECUTA_DIAGNOSE_METHOD);
    lines.push(...formatExtractorDiagnostic(diag).map((line) => `- ${line}`));
  } catch (err) {
    lines.push(`- document-extractor：诊断调用失败：${errorMessage(err)}`);
  }
  return lines.join("\n");
}

async function errorWithExtractionDiagnostics(runtime, err, activeStep) {
  if (!shouldRunExtractionDiagnostics(err, activeStep)) return errorMessage(err);
  try {
    setProgress("抽取失败，正在读取运行环境诊断", null);
    return `${errorMessage(err)}\n${await diagnoseExtractionEnvironment(runtime)}`;
  } catch (diagErr) {
    return `${errorMessage(err)}\n\n运行环境诊断失败：${errorMessage(diagErr)}`;
  }
}

function archiveScanSummary(listing) {
  const entries = Array.isArray(listing.entries) ? listing.entries : [];
  const skipped = Array.isArray(listing.skipped) ? listing.skipped : [];
  const lines = [
    `压缩包扫描完成：找到 ${entries.length} 个可抽取文件，跳过 ${listing.skipped_count || skipped.length || 0} 个文件。`,
    "",
    "可抽取文件：",
    ...(entries.length
      ? entries.slice(0, 80).map((entry, index) => `${index + 1}. ${entry.path || entry.filename || "-"}（${entry.kind || "-"}，${formatBytes(entry.size_bytes || 0)}）`)
      : ["- 未找到可抽取文件"]),
  ];
  if (entries.length > 80) lines.push(`... 还有 ${entries.length - 80} 个文件未显示`);
  if (skipped.length) {
    lines.push("", `跳过文件（前 ${skipped.length} 条）：`);
    lines.push(...skipped.map((item) => `- ${item.path || "-"}：${item.reason || "已跳过"}`));
    if ((listing.skipped_count || skipped.length) > skipped.length) {
      lines.push(`... 还有 ${(listing.skipped_count || skipped.length) - skipped.length} 个跳过文件未显示`);
    }
  }
  return lines.join("\n");
}

async function sourceArgs(runtime, source) {
  if (!source.storagePath) return source.args || {};
  if (localFileStore.has(source.storagePath)) {
    const item = localFileStore.get(source.storagePath);
    if (item.size && item.size > INLINE_CAP_BYTES) {
      const localPath = localDevDownloadsPath({ name: item.filename || source.filename || basename(source.storagePath) });
      if (localPath) return { local_path: localPath };
      throw new Error(`本地 legacy 模式只支持 ${formatBytes(INLINE_CAP_BYTES)} 以内的文件内联传输：${basename(source.storagePath)}`);
    }
    if (item.file instanceof Blob) return { bytes_b64: await readBlobAsBase64(item.file) };
    if (item.bytes) return { bytes_b64: btoa(String.fromCharCode(...item.bytes)) };
    if (typeof item.text === "string") {
      return { bytes_b64: await readBlobAsBase64(new Blob([item.text], { type: item.contentType || TEXT_UPLOAD_TYPE })) };
    }
  }
  const link = await runtime.files.download_url({ path: source.storagePath });
  const downloadUrl = link.get_url || link.url || link.download_url;
  if (!downloadUrl) {
    throw new Error(`files.download_url 未返回 get_url/url，返回字段：${Object.keys(link || {}).join(", ")}`);
  }
  return { download_url: downloadUrl };
}

async function nativeParserCatalog(runtime) {
  if (!runtime.agent?.session?.catalog) return null;
  if (!nativeParserCatalogPromise) {
    nativeParserCatalogPromise = runtime.agent.session.catalog().catch((err) => ({ error: err }));
  }
  return nativeParserCatalogPromise;
}

async function isNativeParserEligible(runtime, toolName) {
  const catalog = await nativeParserCatalog(runtime);
  if (!catalog) return { eligible: false, reason: "当前 Anna 运行时未提供 agent.session.catalog" };
  if (catalog.error) return { eligible: false, reason: `agent.session.catalog 不可用：${errorMessage(catalog.error)}` };
  const tool = (catalog.platform_tools || []).find((item) => item.name === toolName);
  if (!tool) return { eligible: false, reason: `平台工具 ${toolName} 不在 catalog 中` };
  if (!tool.eligible) {
    const blocked = Array.isArray(tool.blocked_by) ? tool.blocked_by.join("/") : tool.blocked_by || "unknown";
    return { eligible: false, reason: `平台工具 ${toolName} 不可用：${blocked}` };
  }
  return { eligible: true, reason: "" };
}

async function nativeParserAttachment(runtime, file, source) {
  if (source?.storagePath && !localFileStore.get(source.storagePath)?.transient) {
    const link = await runtime.files.download_url({ path: source.storagePath });
    const url = link.get_url || link.url || link.download_url;
    if (!url) throw new Error(`files.download_url 未返回附件链接，返回字段：${Object.keys(link || {}).join(", ")}`);
    return { type: source.contentType || guessMime(file.name), url, filename: file.name };
  }
  const size = Number(file.size || localFileStore.get(source?.storagePath)?.size || 0);
  if (size > NATIVE_ATTACHMENT_INLINE_CAP_BYTES) {
    throw new Error(`原生解析需要可下载 URL；当前本地内联附件超过 ${formatBytes(NATIVE_ATTACHMENT_INLINE_CAP_BYTES)}`);
  }
  const buffer = await readSourceArrayBuffer(runtime, file, source);
  const blob = new Blob([buffer], { type: source.contentType || guessMime(file.name) });
  const b64 = await readBlobAsBase64(blob);
  return {
    type: source.contentType || guessMime(file.name),
    data: `data:${source.contentType || guessMime(file.name)};base64,${b64}`,
    filename: file.name,
  };
}

function nativeParserPrompt(file, toolName, processPageLimit) {
  const pageLimitLine = toolName === NATIVE_DOC_READ_TOOL && fileExt(file.name) === "pdf"
    ? `PDF 页数上限：优先读取前 ${processPageLimit} 页；如果工具不能限制页数，请仍然返回可读取的正文并标明实际覆盖范围。`
    : "";
  return compactText(`请使用本轮允许的平台工具 ${toolName} 读取附件内容，并只输出可用于后续等保审查的纯文本。

文件名：${file.name}
${pageLimitLine}

输出要求：
- 不要做合规审查，不要给整改建议，只提取/整理附件正文。
- PDF/PPTX/DOCX 需尽量保留页码、幻灯片编号或段落定位；表格文件需保留工作表名、行列或 A1 范围。
- 用 Markdown 文本输出，页面建议用 “--- 第 N 页 ---”，工作表建议用 “### 工作表：SheetName”。
- 如果附件是扫描件、图片型 PDF、无法解析或没有可分析正文，只输出一行：SCANNED_OR_EMPTY: <原因>。`, 3000);
}

function nativeParserTextLooksEmpty(text) {
  const value = String(text || "").trim();
  if (!value) return true;
  if (/^SCANNED_OR_EMPTY\s*:/i.test(value)) return true;
  if (/扫描件|图片型\s*PDF|无法读取|无法解析|不能读取|没有正文|未识别|no text|empty document|unable to extract|cannot extract/i.test(value) && value.length < 800) return true;
  return false;
}

async function runNativeParser(runtime, file, source, toolName, processPageLimit) {
  if (!runtime.agent?.session) throw new Error("当前 Anna 运行时未提供 agent.session");
  const eligibility = await isNativeParserEligible(runtime, toolName);
  if (!eligibility.eligible) throw new Error(eligibility.reason);

  setProgress(`正在使用 Anna 原生 ${toolName} 解析 ${file.name}`, null);
  const session = await runtime.agent.session({
    submode: "auto",
    system_prompt: "你是附件读取器。你只能读取用户提供的附件并输出可追溯的纯文本，不做业务分析。",
    quotaCaps: { inherit_host_tools: false, allowed_tools: [toolName] },
  });
  const attachment = await nativeParserAttachment(runtime, file, source);
  const stream = session.run({
    content: nativeParserPrompt(file, toolName, processPageLimit),
    attachments: [attachment],
    allowed_tools: [toolName],
  });
  let text = "";
  for await (const frame of stream) {
    if (frame.event === "error") throw new Error(frame.message || "agent session error");
    if (frame.event === "run_meta" && Array.isArray(frame.granted_tools) && !frame.granted_tools.includes(toolName)) {
      throw new Error(`本轮 Agent Session 未授予 ${toolName}`);
    }
    const delta = extractAgentFrameText(frame);
    if (delta) {
      text += delta;
      if (text.length % 1200 < delta.length) setProgress(`Anna 原生 ${toolName} 正在返回解析文本：${text.length.toLocaleString("zh-CN")} 字`, null);
    }
  }
  text = String(text || "").trim();
  if (nativeParserTextLooksEmpty(text)) throw new Error(text || `${toolName} 未返回可分析文本`);
  const truncated = text.length > MAX_EXTRACT_CHARS;
  if (truncated) text = text.slice(0, MAX_EXTRACT_CHARS);
  finishProgress(`Anna 原生 ${toolName} 解析完成`);
  return {
    kind: fileExt(file.name) || toolName,
    filename: file.name,
    mime_type: source.contentType,
    size_bytes: file.size || null,
    text,
    char_count: text.length,
    page_count: null,
    processed_page_count: null,
    truncated,
    warnings: [`Anna 原生 ${toolName} 解析完成`],
  };
}

async function tryNativeDocumentExtraction(runtime, file, source, processPageLimit) {
  const toolName = nativeParserToolForFile(file.name);
  if (!toolName) return null;
  try {
    return await runNativeParser(runtime, file, source, toolName, processPageLimit);
  } catch (err) {
    setProgress(`Anna 原生 ${toolName} 不可用，正在改用 Executa 兜底`, null);
    return { fallbackReason: errorMessage(err), toolName };
  }
}

async function importLocalArchiveToExtractorCache(runtime, file) {
  const uploadId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let offset = 0;
  let lastReply = null;
  let chunkBytes = ARCHIVE_IMPORT_CHUNK_BYTES;
  while (offset < file.size) {
    let success = false;
    let attemptChunkBytes = chunkBytes;
    let lastErr = null;
    while (!success) {
      const end = Math.min(file.size, offset + attemptChunkBytes);
      const chunk = file.slice(offset, end);
      const chunkB64 = await readBlobAsBase64(chunk);
      const done = end >= file.size;
      setProgress(
        `正在导入本地压缩包缓存 ${formatBytes(end)} / ${formatBytes(file.size)}（块 ${formatBytes(attemptChunkBytes)}）`,
        file.size ? (end / file.size) * 100 : null,
      );
      try {
        lastReply = await invokeExtractor(runtime, {
          filename: file.name,
          upload_id: uploadId,
          chunk_b64: chunkB64,
          offset,
          total_size: file.size,
          done,
        }, EXECUTA_IMPORT_ARCHIVE_CHUNK_METHOD);
        offset = end;
        chunkBytes = Math.min(ARCHIVE_IMPORT_CHUNK_BYTES, Math.max(attemptChunkBytes, ARCHIVE_IMPORT_MIN_CHUNK_BYTES));
        success = true;
      } catch (err) {
        lastErr = err;
        if (!/Failed to fetch|transport/i.test(errorMessage(err)) || attemptChunkBytes <= ARCHIVE_IMPORT_MIN_CHUNK_BYTES) {
          throw err;
        }
        attemptChunkBytes = Math.max(ARCHIVE_IMPORT_MIN_CHUNK_BYTES, Math.floor(attemptChunkBytes / 4));
        setProgress(`导入块失败，正在缩小到 ${formatBytes(attemptChunkBytes)} 重试`, file.size ? (offset / file.size) * 100 : null);
        await wait(200);
      }
    }
  }
  const archiveCacheId = lastReply?.archive_cache_id;
  if (!archiveCacheId) {
    throw new Error(`本地压缩包导入未返回 archive_cache_id，返回字段：${Object.keys(lastReply || {}).join(", ")}`);
  }
  return { archive_cache_id: archiveCacheId };
}

async function archiveSourceArgs(runtime, file, source) {
  if (source?.storagePath && localFileStore.has(source.storagePath)) {
    const item = localFileStore.get(source.storagePath);
    if (item?.transient || file.size > INLINE_CAP_BYTES) {
      if (item?.uploadError) {
        setReportPlain(`R2 源文件归档失败，已进入本地临时抽取模式。\n\n原始上传错误：${item.uploadError}`);
      }
      const localPath = localDevDownloadsPath(file);
      if (localPath) return { local_path: localPath };
      return importLocalArchiveToExtractorCache(runtime, file);
    }
  }
  return sourceArgs(runtime, source);
}

async function extractDocumentInTextChunks(runtime, file, source, baseArgs = {}, options = {}) {
  const displayName = options.displayName || file.name;
  const maxCharsBudget = Math.max(1000, Number(options.maxCharsBudget || MAX_EXTRACT_CHARS));
  const chunks = [];
  const warnings = [];
  let offset = 0;
  let totalChars = 0;
  let resultMeta = null;
  let part = 1;
  let hasMoreText = false;

  while (totalChars < maxCharsBudget) {
    const limit = Math.min(TOOL_RESPONSE_TEXT_CHARS, maxCharsBudget - totalChars);
    setProgress(`${displayName} 正在分块抽取文本 ${part}`, null);
    const sourcePayload = options.sourceArgs || await sourceArgs(runtime, source);
    const result = await invokeExtractor(runtime, {
      filename: file.name,
      mime_type: source.contentType,
      ...sourcePayload,
      ...baseArgs,
      max_chars: limit,
      text_offset: offset,
    }, EXECUTA_METHOD);
    resultMeta = resultMeta || result;
    const text = result.text || "";
    if (text) {
      chunks.push(text);
      totalChars += text.length;
    }
    if (Array.isArray(result.warnings)) warnings.push(...result.warnings);
    const nextOffset = Number(result.next_text_offset || 0);
    const hasMore = Boolean(result.has_more_text || nextOffset > offset + text.length);
    hasMoreText = hasMore;
    if (!text || !hasMore || !nextOffset || nextOffset <= offset) break;
    offset = nextOffset;
    part += 1;
  }

  const text = chunks.join("\n\n");
  const truncated = Boolean(hasMoreText || totalChars >= maxCharsBudget);
  return {
    ...(resultMeta || {}),
    filename: options.resultFilename || resultMeta?.filename || displayName,
    text,
    char_count: text.length,
    truncated,
    warnings: Array.from(new Set(warnings)),
  };
}

function storedSource(contentType, storagePath, filename = "") {
  return { contentType, storagePath, filename };
}

async function inlineSource(file, contentType) {
  return {
    contentType,
    filename: file.name,
    args: { bytes_b64: await readBlobAsBase64(file) },
  };
}

async function extractStoredDocument(runtime, file, source, processPageLimit = selectedProcessPages()) {
  if (isArchiveName(file.name)) {
    return extractArchiveInEntries(runtime, file, source, processPageLimit);
  }
  if (isDirectTextName(file.name)) {
    return extractDirectTextDocument(runtime, file, source);
  }
  const nativeResult = await tryNativeDocumentExtraction(runtime, file, source, processPageLimit);
  if (nativeResult && !nativeResult.fallbackReason) return nativeResult;
  const fallbackWarning = nativeResult?.fallbackReason
    ? [`Anna 原生 ${nativeResult.toolName} 解析未完成，已改用 Executa 兜底：${nativeResult.fallbackReason}`]
    : [];
  if (fileExt(file.name) === "pdf") {
    const result = await extractPdfInBatches(runtime, file, source, processPageLimit);
    result.warnings = [...fallbackWarning, ...(result.warnings || [])];
    return result;
  }
  setProgress(`正在抽取 ${fileExt(file.name).toUpperCase()} 文本`, null);
  const result = await extractDocumentInTextChunks(runtime, file, source);
  result.warnings = [...fallbackWarning, ...(result.warnings || [])];
  return result;
}

async function extractArchiveInEntries(runtime, file, source, processPageLimit) {
  setProgress("正在扫描压缩包", null);
  setReportPlain("正在扫描压缩包内的可审查文件。");
  let archiveArgs = await archiveSourceArgs(runtime, file, source);
  let listing;
  try {
    listing = await invokeExtractor(runtime, {
      filename: file.name,
      mime_type: source.contentType,
      ...archiveArgs,
      max_files: MAX_ARCHIVE_FILES,
      max_depth: MAX_ARCHIVE_DEPTH,
      max_uncompressed_bytes: MAX_ARCHIVE_UNCOMPRESSED_BYTES,
    }, EXECUTA_LIST_ARCHIVE_METHOD);
  } catch (err) {
    if (!archiveArgs.local_path) throw err;
    setProgress("本地路径读取失败，正在改用分块导入压缩包", null);
    archiveArgs = await importLocalArchiveToExtractorCache(runtime, file);
    listing = await invokeExtractor(runtime, {
      filename: file.name,
      mime_type: source.contentType,
      ...archiveArgs,
      max_files: MAX_ARCHIVE_FILES,
      max_depth: MAX_ARCHIVE_DEPTH,
      max_uncompressed_bytes: MAX_ARCHIVE_UNCOMPRESSED_BYTES,
    }, EXECUTA_LIST_ARCHIVE_METHOD);
  }

  const entries = Array.isArray(listing.entries) ? listing.entries : [];
  const skipped = Array.isArray(listing.skipped) ? listing.skipped : [];
  const warnings = Array.isArray(listing.warnings) ? [...listing.warnings] : [];
  setProgress(`压缩包扫描完成：${entries.length} 个可抽取文件，跳过 ${listing.skipped_count || skipped.length || 0} 个`, null);
  setReportPlain(archiveScanSummary(listing));
  const chunks = [];
  const extractedEntries = [];
  const archiveCacheId = listing.archive_cache_id || "";
  // Staging may run each tools.invoke in a fresh Executa process, so the
  // cache id returned by list_archive is not guaranteed to exist for the
  // following entry extraction calls. Prefer a durable source reference.
  const hasDurableArchiveSource = Boolean(
    archiveArgs.download_url ||
    archiveArgs.bytes_b64 ||
    archiveArgs.local_path,
  );
  const archiveEntryArgs = hasDurableArchiveSource
    ? archiveArgs
    : archiveCacheId
      ? { archive_cache_id: archiveCacheId }
      : archiveArgs;
  let totalChars = 0;
  let processedFiles = 0;
  let totalPages = 0;
  let processedPages = 0;
  let ocrUsed = false;
  let ocrPageCount = 0;
  let ocrLang = "";
  let truncated = Boolean(listing.truncated);

  if (!entries.length) {
    warnings.push("压缩包内没有找到可抽取的 PDF/DOCX/XLSX/CSV/TXT/MD 文件");
  }

  for (let index = 0; index < entries.length && totalChars < MAX_EXTRACT_CHARS; index += 1) {
    const entry = entries[index];
    const entryLabel = entry.path || entry.filename || `文件 ${index + 1}`;
    const percent = entries.length ? (index / entries.length) * 100 : null;
    setProgress(`正在抽取第 ${index + 1}/${entries.length} 个文件：${entryLabel}`, percent);
    setReportPlain(`正在抽取压缩包文件：${entryLabel}`);

    const remainingChars = Math.max(1000, MAX_EXTRACT_CHARS - totalChars);
    let result;
    try {
      if (entry.kind === "pdf") {
        result = await extractPdfInBatches(
          runtime,
          file,
          source,
          processPageLimit,
          EXECUTA_METHOD,
          { entry_id: entry.entry_id, ...archiveEntryArgs },
          {
            displayName: entryLabel,
            progressPrefix: `正在抽取第 ${index + 1}/${entries.length} 个文件：`,
            deferFinish: true,
            maxCharsBudget: remainingChars,
          },
        );
      } else {
        result = await extractDocumentInTextChunks(
          runtime,
          file,
          source,
          { entry_id: entry.entry_id },
          {
            displayName: entryLabel,
            resultFilename: entryLabel,
            maxCharsBudget: remainingChars,
            sourceArgs: archiveEntryArgs,
          },
        );
      }
    } catch (err) {
      warnings.push(`${entryLabel} 抽取失败，已跳过：${errorMessage(err)}`);
      continue;
    }

    processedFiles += 1;
    const text = result.text || "";
    const section = text ? `### 文件：${entryLabel}\n\n${text}` : "";
    if (section) {
      chunks.push(section);
      totalChars += section.length;
    }
    if (Array.isArray(result.warnings)) {
      warnings.push(...result.warnings.map((warning) => `${entryLabel}：${warning}`));
    }
    totalPages += Number(result.page_count || 0);
    processedPages += Number(result.processed_page_count || 0);
    ocrUsed = ocrUsed || Boolean(result.ocr_used);
    ocrPageCount += Number(result.ocr_page_count || 0);
    ocrLang = result.ocr_lang || ocrLang;
    truncated = truncated || Boolean(result.truncated);
    extractedEntries.push({
      path: entryLabel,
      kind: result.kind || entry.kind,
      size_bytes: entry.size_bytes || result.size_bytes || null,
      char_count: text.length,
      page_count: result.page_count || null,
      processed_page_count: result.processed_page_count || null,
    });

    setProgress(`已抽取 ${processedFiles} / ${entries.length} 个文件`, ((index + 1) / entries.length) * 100);
  }

  if (totalChars >= MAX_EXTRACT_CHARS) {
    warnings.push(`抽取文本已达到 ${MAX_EXTRACT_CHARS} 字符上限，压缩包剩余文件未继续抽取`);
    truncated = true;
  }
  const skippedTotal = listing.skipped_count || skipped.length;
  if (skippedTotal) {
    const preview = skipped
      .slice(0, 30)
      .map((item) => `${item.path || "-"}（${item.reason || "已跳过"}）`)
      .join("；");
    warnings.push(`压缩包内 ${skippedTotal} 个文件未参与抽取：${preview}${skippedTotal > 30 ? "；..." : ""}`);
  }

  finishProgress(`压缩包抽取完成：${processedFiles} / ${entries.length} 个文件`);
  const text = chunks.join("\n\n");
  return {
    kind: "archive",
    archive_kind: listing.archive_kind || archiveKind(file.name),
    filename: file.name,
    mime_type: source.contentType,
    size_bytes: file.size,
    text,
    char_count: text.length,
    file_count: entries.length,
    processed_file_count: processedFiles,
    entries: extractedEntries,
    skipped,
    page_count: totalPages || null,
    processed_page_count: processedPages || processedFiles,
    truncated,
    ocr_used: ocrUsed,
    ocr_page_count: ocrPageCount,
    ocr_lang: ocrLang,
    warnings,
  };
}

async function extractPdfInBatches(runtime, file, source, processPageLimit, method = EXECUTA_METHOD, extraArgs = {}, options = {}) {
  const requestedPages = Math.min(Math.max(1, Number(processPageLimit) || 100), MAX_PROCESS_PAGES);
  const initialBatchSize = activeWorkstream === "interpret" ? INTERPRET_PAGES_PER_TOOL_CALL : PAGES_PER_TOOL_CALL;
  const displayName = options.displayName || file.name;
  const maxCharsBudget = Math.max(1000, Number(options.maxCharsBudget || MAX_EXTRACT_CHARS));
  const chunks = [];
  const warnings = [];
  const warningSet = new Set();
  let totalPages = null;
  let nextPage = 1;
  let processedPages = 0;
  let totalChars = 0;
  let ocrUsed = false;
  let ocrPageCount = 0;
  let ocrLang = "";
  let sizeBytes = file.size;
  let truncated = false;
  let currentBatchSize = initialBatchSize;
  const addWarning = (warning) => {
    if (!warningSet.has(warning)) {
      warningSet.add(warning);
      warnings.push(warning);
    }
  };

  while (nextPage && processedPages < requestedPages && totalChars < maxCharsBudget) {
    const effectiveTotal = Math.min(requestedPages, totalPages || requestedPages);
    const batchPages = Math.min(currentBatchSize, effectiveTotal - processedPages);
    if (batchPages <= 0) break;

    const endLabel = nextPage + batchPages - 1;
    const beforePercent = totalPages
      ? ((nextPage - 1) / Math.min(requestedPages, totalPages)) * 100
      : null;
    setProgress(
      options.progressPrefix
        ? `${options.progressPrefix}${displayName} 第 ${nextPage}-${endLabel} 页`
        : `正在抽取第 ${nextPage}-${endLabel} 页`,
      beforePercent,
    );
    setReportPlain(`正在抽取文档文本：${displayName} 第 ${nextPage}-${endLabel} 页。`);

    let result;
    try {
      let textOffset = 0;
      let batchText = "";
      const batchWarnings = [];
      while (totalChars + batchText.length < maxCharsBudget) {
        const part = await invokeExtractor(runtime, {
          filename: file.name,
          mime_type: source.contentType,
          ...(await sourceArgs(runtime, source)),
          ...extraArgs,
          max_chars: Math.min(TOOL_RESPONSE_TEXT_CHARS, Math.max(1000, maxCharsBudget - totalChars - batchText.length)),
          text_offset: textOffset,
          max_ocr_pages: batchPages,
          ocr_dpi: OCR_DPI,
          page_start: nextPage,
          page_count: batchPages,
        }, method);
        result = result || part;
        if (part.text) batchText += `${batchText ? "\n\n" : ""}${part.text}`;
        if (Array.isArray(part.warnings)) batchWarnings.push(...part.warnings);
        if (!part.has_more_text || !part.next_text_offset || part.next_text_offset <= textOffset || !part.text) break;
        textOffset = part.next_text_offset;
        setProgress(`${displayName} 第 ${nextPage}-${endLabel} 页正在分块返回文本：${batchText.length.toLocaleString("zh-CN")} 字`, beforePercent);
      }
      result = {
        ...(result || {}),
        text: batchText,
        char_count: batchText.length,
        warnings: Array.from(new Set(batchWarnings)),
      };
    } catch (err) {
      if (isRecoverableExtractorError(err) && batchPages > MIN_PAGES_PER_TOOL_CALL) {
        currentBatchSize = Math.max(MIN_PAGES_PER_TOOL_CALL, Math.floor(batchPages / 2));
        addWarning(`第 ${nextPage}-${endLabel} 页批次失败，已自动缩小到每批 ${currentBatchSize} 页重试：${errorMessage(err)}`);
        setProgress(`批次失败，正在缩小范围重试第 ${nextPage} 页起`, null);
        await wait(1200);
        continue;
      }
      if (isRecoverableExtractorError(err) && batchPages === MIN_PAGES_PER_TOOL_CALL) {
        addWarning(`第 ${nextPage} 页抽取失败，已跳过该页：${errorMessage(err)}`);
        processedPages = Math.max(processedPages, nextPage);
        nextPage += 1;
        currentBatchSize = initialBatchSize;
        const cappedTotal = Math.min(requestedPages, totalPages || requestedPages);
        setProgress(
          `已处理 ${Math.min(processedPages, cappedTotal)} / ${cappedTotal} 页`,
          (Math.min(processedPages, cappedTotal) / cappedTotal) * 100,
        );
        await wait(1200);
        continue;
      }
      throw err;
    }
    currentBatchSize = initialBatchSize;

    totalPages = Number(result.page_count || totalPages || 0) || totalPages;
    sizeBytes = Number(result.size_bytes || sizeBytes);
    ocrUsed = ocrUsed || Boolean(result.ocr_used);
    ocrPageCount += Number(result.ocr_page_count || 0);
    ocrLang = result.ocr_lang || ocrLang;
    truncated = truncated || Boolean(result.truncated);

    const text = result.text || "";
    if (text) {
      chunks.push(text);
      totalChars += text.length;
    }
    for (const warning of result.warnings || []) addWarning(warning);

    const attempted = Math.max(1, Number(result.processed_page_count || batchPages));
    processedPages = Math.max(processedPages, (Number(result.page_start || nextPage) - 1) + attempted);
    const cappedTotal = Math.min(requestedPages, totalPages || requestedPages);
    setProgress(
      options.progressPrefix
        ? `${displayName} 已处理 ${Math.min(processedPages, cappedTotal)} / ${cappedTotal} 页`
        : `已处理 ${Math.min(processedPages, cappedTotal)} / ${cappedTotal} 页`,
      (Math.min(processedPages, cappedTotal) / cappedTotal) * 100,
    );

    if (totalChars >= maxCharsBudget) {
      addWarning(`抽取文本已达到 ${maxCharsBudget} 字符上限，提前进入 LLM 分析`);
      truncated = true;
      break;
    }
    nextPage = result.next_page || processedPages + 1;
    if (totalPages && nextPage > Math.min(requestedPages, totalPages)) break;
  }

  const targetPages = Math.min(requestedPages, totalPages || requestedPages);
  if (totalPages && requestedPages < totalPages) {
    addWarning(`PDF 共 ${totalPages} 页，本次按设置处理前 ${requestedPages} 页`);
  }

  if (!options.deferFinish) {
    finishProgress(`文本抽取完成：${Math.min(processedPages, targetPages)} / ${targetPages} 页`);
  }
  return {
    kind: "pdf",
    filename: displayName,
    mime_type: source.contentType,
    size_bytes: sizeBytes,
    page_count: totalPages || processedPages,
    processed_page_count: Math.min(processedPages, targetPages),
    text: chunks.join("\n\n"),
    char_count: totalChars,
    truncated,
    ocr_used: ocrUsed,
    ocr_page_count: ocrPageCount,
    ocr_lang: ocrLang,
    warnings,
  };
}

function buildKnowledgeContext(refs) {
  if (!refs.length) return "未匹配到公司知识库内容。";
  return refs
    .map((ref, index) => {
      return `【知识 ${index + 1}】${ref.title}\n标签：${(ref.tags || []).join(", ") || "-"}\n摘要：${ref.summary || "-"}\n内容：\n${ref.snippet}`;
    })
    .join("\n\n");
}

function normalizeSourceLabel(label) {
  return String(label || "").replace(/^### 文件：\s*/, "").trim();
}

function formatPageRange(pageStart, pageEnd) {
  const start = Number(pageStart);
  const end = Number(pageEnd);
  if (!Number.isFinite(start) || start <= 0) return "";
  if (Number.isFinite(end) && end > 0 && end !== start) return ` 第 ${start}-${end} 页`;
  return ` 第 ${start} 页`;
}

function sourceRefLabel(ref) {
  const base = normalizeSourceLabel(ref?.file || ref?.label || "");
  const page = formatPageRange(ref?.pageStart, ref?.pageEnd);
  const part = Number(ref?.partCount) > 1 ? `（片段 ${ref.partIndex}/${ref.partCount}）` : "";
  return `${base || "未知来源"}${page}${part}`;
}

function mergeSourceRefs(refs) {
  const merged = [];
  for (const ref of refs || []) {
    const pageStart = Number(ref.pageStart);
    const pageEnd = Number(ref.pageEnd);
    const partIndex = Number(ref.partIndex);
    const partCount = Number(ref.partCount);
    const normalized = {
      file: normalizeSourceLabel(ref.file || ref.label || ""),
      pageStart: Number.isFinite(pageStart) && pageStart > 0 ? pageStart : null,
      pageEnd: Number.isFinite(pageEnd) && pageEnd > 0 ? pageEnd : null,
      partIndex: Number.isFinite(partIndex) && partIndex > 0 ? partIndex : 1,
      partCount: Number.isFinite(partCount) && partCount > 0 ? partCount : 1,
      kind: ref.kind || "",
    };
    const last = merged[merged.length - 1];
    const canMergePages =
      last &&
      last.file === normalized.file &&
      last.pageStart != null &&
      normalized.pageStart != null &&
      last.pageEnd != null &&
      normalized.pageEnd != null &&
      normalized.pageStart <= last.pageEnd + 1;
    const canMergeFileOnly =
      last &&
      last.file === normalized.file &&
      last.pageStart == null &&
      normalized.pageStart == null &&
      last.pageEnd == null &&
      normalized.pageEnd == null;
    if (canMergePages) {
      last.pageEnd = Math.max(last.pageEnd, normalized.pageEnd);
      continue;
    }
    if (canMergeFileOnly) continue;
    merged.push(normalized);
  }
  return merged;
}

function summarizeSourceRefs(refs, limit = 6) {
  const merged = mergeSourceRefs(refs);
  if (!merged.length) return "未提供来源信息";
  const labels = merged.slice(0, limit).map((ref) => sourceRefLabel(ref));
  if (merged.length > limit) labels.push("...");
  return labels.join("、");
}

function splitText(text, maxChars) {
  const value = String(text || "").trim();
  if (!value) return [];
  if (value.length <= maxChars) return [value];
  const paragraphs = value.split(/\n{2,}/);
  if (paragraphs.length <= 1) {
    const chunks = [];
    let offset = 0;
    while (offset < value.length) {
      let end = Math.min(value.length, offset + maxChars);
      if (end < value.length) {
        const newline = value.lastIndexOf("\n", end);
        const sentence = Math.max(
          value.lastIndexOf("。", end),
          value.lastIndexOf("；", end),
          value.lastIndexOf(";", end),
        );
        const boundary = Math.max(newline, sentence);
        if (boundary > offset + maxChars * 0.55) end = boundary + 1;
      }
      const piece = value.slice(offset, end).trim();
      if (piece) chunks.push(piece);
      offset = end;
    }
    return chunks.filter(Boolean);
  }
  const chunks = [];
  let current = "";
  for (const paragraph of paragraphs) {
    const piece = paragraph.trim();
    if (!piece) continue;
    const candidate = current ? `${current}\n\n${piece}` : piece;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = piece;
      continue;
    }
    if (candidate.length > maxChars) {
      chunks.push(...splitText(piece, maxChars));
      current = "";
      continue;
    }
    current = candidate;
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

function splitSectionByPageMarkers(sectionText, fileLabel) {
  const lines = String(sectionText || "").replace(/\r\n?/g, "\n").split("\n");
  const pageBlocks = [];
  let currentPage = null;
  let currentLines = [];
  let sawPageMarker = false;
  const flush = () => {
    const text = currentLines.join("\n").trim();
    if (!text) return;
    pageBlocks.push({
      text,
      sourceRefs: [
        {
          file: fileLabel,
          pageStart: currentPage,
          pageEnd: currentPage,
          kind: currentPage != null ? "page" : "file",
        },
      ],
    });
    currentLines = [];
  };
  for (const line of lines) {
    const match = line.match(/^--- 第\s*(\d+)\s*页(?:（OCR）|\(OCR\))?---$/);
    if (match) {
      sawPageMarker = true;
      if (currentLines.length && currentPage == null) currentPage = Number(match[1]);
      flush();
      currentPage = Number(match[1]);
      continue;
    }
    currentLines.push(line);
  }
  flush();
  if (!sawPageMarker) {
    const text = String(sectionText || "").trim();
    return text ? [{ text, sourceRefs: [{ file: fileLabel, pageStart: null, pageEnd: null, kind: "file" }] }] : [];
  }
  return pageBlocks;
}

function splitReviewTextIntoStructuredBlocks(extraction) {
  const text = String(extraction?.text || "").replace(/\r\n?/g, "\n").trim();
  if (!text) return [];
  const fallbackLabel = normalizeSourceLabel(extraction?.filename || selectedFile?.name || "文档");
  const lines = text.split("\n");
  const fileSections = [];
  let currentLabel = fallbackLabel;
  let currentLines = [];
  let sawFileMarker = false;
  const flush = () => {
    const body = currentLines.join("\n").trim();
    if (!body) return;
    fileSections.push({ label: currentLabel, text: body });
    currentLines = [];
  };
  for (const line of lines) {
    const match = line.match(/^### 文件：\s*(.+)$/);
    if (match) {
      sawFileMarker = true;
      flush();
      currentLabel = normalizeSourceLabel(match[1]) || fallbackLabel;
      continue;
    }
    currentLines.push(line);
  }
  flush();
  const normalizedSections = sawFileMarker ? fileSections : [{ label: fallbackLabel, text }];
  return normalizedSections.flatMap((section) => splitSectionByPageMarkers(section.text, section.label));
}

function packStructuredReviewChunks(blocks, maxChars = MAX_LLM_CHARS) {
  const chunks = [];
  let currentText = "";
  let currentSourceRefs = [];
  const flush = () => {
    const text = currentText.trim();
    if (!text) return;
    chunks.push({
      text,
      sourceRefs: mergeSourceRefs(currentSourceRefs),
    });
    currentText = "";
    currentSourceRefs = [];
  };
  for (const block of blocks) {
    const pieces = splitText(block.text, maxChars);
    const blockRefs = Array.isArray(block.sourceRefs) ? block.sourceRefs : [];
    for (const [index, piece] of pieces.entries()) {
      const partIndex = pieces.length > 1 ? index + 1 : 1;
      const partCount = pieces.length || 1;
      const pieceRefs = blockRefs.map((ref) => ({
        ...ref,
        partIndex,
        partCount,
      }));
      const candidate = currentText ? `${currentText}\n\n${piece}` : piece;
      if (currentText && candidate.length > maxChars) {
        flush();
      }
      currentText = currentText ? `${currentText}\n\n${piece}` : piece;
      currentSourceRefs.push(...pieceRefs);
      if (currentText.length >= maxChars) flush();
    }
  }
  flush();
  return chunks;
}

function splitReviewTextIntoStructuredChunks(extraction) {
  const blocks = splitReviewTextIntoStructuredBlocks(extraction);
  if (!blocks.length) return [];
  return packStructuredReviewChunks(blocks, MAX_LLM_CHARS);
}

function buildPrompt(extraction, knowledgeRefs, textOverride = "", scope = "全文", sourceRefs = []) {
  const text = textOverride || extraction.text || "";
  const knowledgeContext = buildKnowledgeContext(knowledgeRefs);
  const truncated =
    text.length > MAX_LLM_CHARS
      ? `${text.slice(0, MAX_LLM_CHARS)}\n\n[文本已截断：原始 ${text.length} 字符，仅分析前 ${MAX_LLM_CHARS} 字符]`
      : text;
  const project = currentProject();
  const sourceContext = summarizeSourceRefs(sourceRefs);
  const reviewContext = reviewPromptContext();
  return `请依据 GB/T 28448-2019《信息安全技术 网络安全等级保护测评要求》与 GB/T 28449-2018《信息安全技术 网络安全等级保护测评过程指南》，审查以下等保资料是否充分、是否存在不符合项或证据缺口。

公司：${currentCompany()?.name || "-"}
项目：${project?.name || "-"}
系统名称：${project?.systemName || "-"}
保护等级：${project?.level || els.level.value}
文档类型：${reviewContext.docKind}
文件名：${reviewContext.filename}
分析范围：${scope}
本段来源清单：${sourceContext}

请使用中文输出 Markdown，必须包含以下部分：
1. 总体结论：符合 / 部分符合 / 不符合 / 证据不足。
2. 风险等级：高 / 中 / 低，并说明判定依据。
3. 按控制域逐项检查，至少覆盖：安全物理环境、安全通信网络、安全区域边界、安全计算环境、安全管理中心、安全管理制度、安全管理机构、安全管理人员、安全建设管理、安全运维管理。
4. 用表格列出本段发现：控制域、问题/缺口、风险等级、来源文件、页码或片段、证据摘要、整改建议、需补充材料。
5. 明确区分三类依据：上传审查资料、公司知识库补充材料、模型推断；如无明确证据，一律写“证据不足”。
6. 对不符合或证据不足的条目，给出可直接落地的修改建议，尽量写成制度条款、流程动作、配置要求或补充材料清单。
7. 若上传资料与公司知识库存在冲突，单独列出冲突项。

限制：
- 不要声称这是正式测评结论。
- 不要把“未发现证据”解释为“已满足”。
- 不要遗漏来源文件名和页码/片段范围。

公司知识库补充材料：
${knowledgeContext}

上传审查文档正文：
${truncated}`;
}

function systemPrompt() {
  return "你是网络安全等级保护测评文档审查顾问。请依据 GB/T 28448-2019《信息安全技术 网络安全等级保护测评要求》和 GB/T 28449-2018《信息安全技术 网络安全等级保护测评过程指南》进行资料充分性审查。你必须区分上传审查文档证据、公司知识库补充材料和模型推断；缺失证据时只能判定为证据不足，不能写成已满足。";
}

async function analyzeWithLlm(extraction, knowledgeRefs, textOverride = "", scope = "全文", sourceRefs = [], maxTokens = 2400) {
  const runtime = await annaReady;
  return runtime.llm.complete({
    systemPrompt: systemPrompt(),
    messages: [
      { role: "user", content: { type: "text", text: buildPrompt(extraction, knowledgeRefs, textOverride, scope, sourceRefs) } },
    ],
    maxTokens,
    temperature: 0.2,
  });
}

async function summarizeReviewSegmentFindings(report, scope, record) {
  const runtime = await annaReady;
  const reply = await completeLlmWithRetry(
    () => runtime.llm.complete({
      systemPrompt: systemPrompt(),
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `请把下面这一段审查结果压缩为结构化问题清单，保留来源文件、页码/片段、控制域、风险等级、证据摘要、整改建议和需补充材料。不要新增事实。

范围：${scope}

分段审查结果：
${compactText(report, 18000, "分段审查结果已截断")}`,
          },
        },
      ],
      maxTokens: 1000,
      temperature: 0.1,
    }),
    "分段问题清单压缩",
    record,
    "summarize",
  );
  return extractContent(reply);
}

function reviewBasePath(record) {
  if (record?.reportPath) return record.reportPath.replace(/\/report\.md$/, "");
  if (record?.reportDraftPath) return record.reportDraftPath.replace(/\/report-draft\.md$/, "");
  return `mlps-review/companies/${record.companyId}/projects/${record.projectId}/reviews/${record.id}`;
}

async function saveReviewAnalysisCheckpoint(runtime, record, partialReports, findingsDigest) {
  if (!record) return;
  const basePath = reviewBasePath(record);
  const partialReportsPath = `${basePath}/partials.md`;
  const findingsDigestPath = `${basePath}/findings.md`;
  await Promise.all([
    writeTextFile(runtime, partialReportsPath, partialReports.join("\n\n")),
    writeTextFile(runtime, findingsDigestPath, findingsDigest.join("\n\n")),
  ]);
  await updateReviewRecord(record, {
    partialReportsPath,
    findingsDigestPath,
    analysisCheckpointAvailable: true,
    lastCheckpoint: "partials",
  });
}

async function loadReviewAnalysisCheckpoint(runtime, record) {
  if (!record?.analysisCheckpointAvailable || !record?.partialReportsPath || !record?.findingsDigestPath) {
    return null;
  }
  try {
    const [partialText, findingsText] = await Promise.all([
      readTextFile(runtime, record.partialReportsPath),
      readTextFile(runtime, record.findingsDigestPath),
    ]);
    return {
      partialReports: partialText ? [partialText] : [],
      findingsDigest: findingsText ? [findingsText] : [],
    };
  } catch {
    return null;
  }
}

function buildFinalReviewPrompt(extraction, knowledgeRefs, findingsDigest, partialReports, chunkMap) {
  const project = currentProject();
  const reviewContext = reviewPromptContext();
  const coverage = coverageNotice(extraction) || "无覆盖范围限制。";
  return `请把以下等保文档审查问题清单合并为一份最终报告。

要求：
1. 保留总体结论、风险等级、控制域检查结果、修改建议、文档依据、建议补充材料。
2. 合并重复问题，按风险高/中/低排序。
3. 明确哪些结论来自上传审查文档，哪些来自公司知识库补充材料，哪些属于证据不足。
4. 不要声称这是正式测评结论。
5. 保留并汇总每个问题的来源文件名、页码范围或片段范围；如为多文件综合判断，单独标记。
6. 必须在最后一行原样输出结束标记：${REVIEW_REPORT_END_MARKER}

公司：${currentCompany()?.name || "-"}
项目：${project?.name || "-"}
系统名称：${project?.systemName || "-"}
保护等级：${project?.level || els.level.value}
文档类型：${reviewContext.docKind}
文件名：${reviewContext.filename}
处理页数：${extraction.processed_page_count || extraction.page_count || "-"} / ${extraction.page_count || "-"}
覆盖范围限制：${coverage}
使用知识库：${knowledgeRefs.map((k) => k.title).join("；") || "未使用公司知识库"}

结构化问题清单：
${compactText(findingsDigest.join("\n\n"), REVIEW_FINDINGS_CONTEXT_CHARS, "结构化问题清单已截断")}

分段来源映射：
${compactText(chunkMap, 12000, "分段来源映射已截断")}

必要时参考的分段审查原文节选：
${compactText(partialReports.join("\n\n"), REVIEW_FINAL_CONTEXT_CHARS - REVIEW_FINDINGS_CONTEXT_CHARS, "分段审查原文已截断")}`;
}

async function completeReviewReportWithValidation(extraction, knowledgeRefs, partialReports, findingsDigest, chunkMap, record) {
  const runtime = await annaReady;
  let reply = await completeLlmWithRetry(
    () => runtime.llm.complete({
      systemPrompt: systemPrompt(),
      messages: [
        {
          role: "user",
          content: { type: "text", text: buildFinalReviewPrompt(extraction, knowledgeRefs, findingsDigest, partialReports, chunkMap) },
        },
      ],
      maxTokens: 5200,
      temperature: 0.2,
    }),
    "最终报告汇总",
    record,
    "finalize",
  );
  let report = extractContent(reply);
  let validation = isReviewReportComplete(report, reply);

  for (let attempt = 1; !validation.ok && attempt <= REVIEW_MAX_RETRIES; attempt += 1) {
    await updateReviewRecord(record, {
      status: "重试中",
      completionState: "retrying",
      retryCount: attempt,
      maxRetries: REVIEW_MAX_RETRIES,
      failureStage: "finalize",
      failureReason: validation.reason,
      llmFinishReason: validation.finishReason,
    });
    setProgress(`报告可能不完整，正在自动续写 ${attempt}/${REVIEW_MAX_RETRIES}：${validation.reason}`, null);
    const continuation = await completeLlmWithRetry(
      () => runtime.llm.complete({
        systemPrompt: systemPrompt(),
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `上一轮最终报告没有完整结束。请从断点继续补全，不要重写已完成内容；如果已经完整，请只输出缺失的结尾部分。最后一行必须原样输出：${REVIEW_REPORT_END_MARKER}

当前报告末尾：
${report.slice(-8000)}`,
            },
          },
        ],
        maxTokens: 2400,
        temperature: 0.1,
      }),
      "最终报告续写",
      record,
      "finalize",
    );
    reply = continuation;
    report = `${stripReportEndMarker(report)}\n\n${extractContent(continuation)}`.trim();
    validation = isReviewReportComplete(report, continuation);
  }

  if (!validation.ok) {
    throw makeIncompleteReportError(validation, report, reply);
  }

  return {
    content: prependCoverageNotice(report, extraction),
    model: reply?.model,
    finishReason: validation.finishReason,
    reviewMeta: {
      reportComplete: true,
      llmFinishReason: validation.finishReason,
      retryCount: record?.retryCount || 0,
    },
  };
}

async function analyzeDocumentWithLlm(extraction, knowledgeRefs, record = null) {
  const runtime = await annaReady;
  const chunks = splitReviewTextIntoStructuredChunks(extraction);
  if (!chunks.length) throw new Error("没有可分析的审查文本分段。");
  const chunkMap = chunks
    .map((chunk, index) => {
      const scope = `第 ${index + 1} / ${chunks.length} 段；来源：${summarizeSourceRefs(chunk.sourceRefs)}`;
      return `- ${scope}`;
    })
    .join("\n");

  const checkpoint = await loadReviewAnalysisCheckpoint(runtime, record);
  let partialReports = checkpoint?.partialReports || [];
  let findingsDigest = checkpoint?.findingsDigest || [];

  if (!partialReports.length || !findingsDigest.length) {
    partialReports = [];
    findingsDigest = [];
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const scope = `第 ${index + 1} / ${chunks.length} 段；来源：${summarizeSourceRefs(chunk.sourceRefs)}`;
      setProgress(`LLM 分段分析 ${index + 1} / ${chunks.length}；${summarizeSourceRefs(chunk.sourceRefs)}`, null);
      setReportPlain(`正在请求 LLM 分析：${scope}。`);
      const reply = await completeLlmWithRetry(
        () => analyzeWithLlm(
          extraction,
          knowledgeRefs,
          chunk.text,
          chunks.length <= 1 ? "全文" : scope,
          chunk.sourceRefs,
          chunks.length <= 1 ? 2800 : 2200,
        ),
        `分段审查 ${index + 1}/${chunks.length}`,
        record,
        "analyze",
      );
      const report = `--- 分段审查 ${index + 1} / ${chunks.length} ---\n范围：${scope}\n${extractContent(reply)}`;
      partialReports.push(report);
      findingsDigest.push(await summarizeReviewSegmentFindings(report, scope, record));
    }
    await saveReviewAnalysisCheckpoint(runtime, record, partialReports, findingsDigest);
  } else {
    setProgress("已读取分段审查检查点，正在重新汇总最终报告", null);
  }

  setProgress("LLM 正在汇总分段结论", null);
  return completeReviewReportWithValidation(extraction, knowledgeRefs, partialReports, findingsDigest, chunkMap, record);
}

function tokenize(text) {
  const tokens = new Set();
  for (const term of CONTROL_TERMS) {
    if (text.includes(term)) tokens.add(term);
  }
  for (const match of text.matchAll(/[\u4e00-\u9fa5A-Za-z0-9]{2,12}/g)) {
    tokens.add(match[0].toLowerCase());
    if (tokens.size > 220) break;
  }
  return tokens;
}

async function matchKnowledge(runtime, extraction, seedExtras = []) {
  const items = knowledgeForCurrentCompany();
  if (!items.length) return [];
  const project = currentProject();
  const seed = [
    extraction.text.slice(0, 80000),
    project?.name || "",
    project?.systemName || "",
    project?.level || "",
    reviewPromptContext().docKind,
    ...seedExtras,
  ].join("\n");
  const query = tokenize(seed);
  const scored = items.map((item) => {
    const haystack = [
      item.title,
      item.summary,
      (item.tags || []).join(" "),
      item.docKind,
    ].join("\n").toLowerCase();
    let score = 0;
    for (const token of query) {
      if (haystack.includes(token)) score += CONTROL_TERMS.includes(token) ? 5 : 1;
    }
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score || String(b.item.updatedAt).localeCompare(String(a.item.updatedAt)));

  const refs = [];
  let usedChars = 0;
  for (const { item, score } of scored.slice(0, MAX_KNOWLEDGE_ITEMS)) {
    if (score <= 0 && refs.length >= 3) continue;
    let text = "";
    try {
      text = await readTextFile(runtime, item.textPath);
    } catch {
      continue;
    }
    const budget = Math.min(6000, MAX_KNOWLEDGE_CHARS - usedChars);
    if (budget <= 0) break;
    const snippet = relevantSnippet(text, query, budget);
    usedChars += snippet.length;
    refs.push({
      id: item.id,
      title: item.title,
      tags: item.tags || [],
      summary: item.summary || "",
      score,
      snippet,
    });
  }
  return refs;
}

function relevantSnippet(text, query, budget) {
  if (text.length <= budget) return text;
  const lower = text.toLowerCase();
  let best = 0;
  let bestScore = -1;
  const step = Math.max(1000, Math.floor(budget / 2));
  for (let pos = 0; pos < text.length; pos += step) {
    const slice = lower.slice(pos, pos + budget);
    let score = 0;
    for (const token of query) {
      if (slice.includes(token)) score += CONTROL_TERMS.includes(token) ? 5 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = pos;
    }
  }
  return text.slice(best, best + budget);
}

function compactText(text, maxChars, note = "内容已截断") {
  const value = String(text || "").trim();
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n\n[${note}：原始 ${value.length} 字符，仅保留前 ${maxChars} 字符]`;
}

function digestFallback(text, maxChars = MAX_INTERPRET_DIGEST_CHARS) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "暂无可用摘要。";
  const keywordLines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /高风险|中风险|低风险|不符合|整改|身份鉴别|访问控制|安全审计|日志|证据不足/.test(line))
    .slice(0, 12)
    .join("\n");
  return compactText([keywordLines, value].filter(Boolean).join("\n"), maxChars, "摘要已压缩");
}

async function summarizeInterpretText(kind, text, maxChars = MAX_INTERPRET_DIGEST_CHARS) {
  const source = compactText(text, MAX_INTERPRET_DIGEST_SOURCE_CHARS, "摘要输入已截断");
  if (!source) return "暂无可用摘要。";
  try {
    const runtime = await annaReady;
    const reply = await runtime.llm.complete({
      systemPrompt: "你是等保测评材料压缩助手。你只提取和保留对后续整改问答有用的信息，不新增事实，不声称正式测评结论。",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `请将以下${kind}压缩为不超过 ${maxChars} 个中文字符的结构化摘要。

必须保留：
1. 总体结论和风险态势。
2. 高/中/低风险不符合项。
3. 涉及控制域、证据线索和整改方向。
4. 证据不足或需要补充确认的问题。

${kind}：
${source}`,
          },
        },
      ],
      maxTokens: 900,
      temperature: 0.1,
    });
    return compactText(extractContent(reply) || digestFallback(text, maxChars), maxChars, "摘要已压缩");
  } catch {
    return digestFallback(text, maxChars);
  }
}

function buildEvidenceIndex(analysis, extracted) {
  const chunks = [];
  const addChunks = (source, titlePrefix, text) => {
    const value = String(text || "").trim();
    if (!value) return;
    const step = Math.max(500, INTERPRET_EVIDENCE_CHUNK_CHARS - INTERPRET_EVIDENCE_OVERLAP_CHARS);
    for (let start = 0; start < value.length && chunks.length < INTERPRET_EVIDENCE_MAX_CHUNKS; start += step) {
      const end = Math.min(value.length, start + INTERPRET_EVIDENCE_CHUNK_CHARS);
      const body = value.slice(start, end).trim();
      if (!body) continue;
      const page = body.match(/第\s*(\d+)\s*页/)?.[1] || "";
      const title = page ? `${titlePrefix} 第 ${page} 页附近` : `${titlePrefix} 片段 ${chunks.length + 1}`;
      chunks.push({
        id: `ev_${chunks.length + 1}`,
        source,
        title,
        charStart: start,
        charEnd: end,
        keywords: Array.from(tokenize(body)).slice(0, 32),
        text: body,
      });
      if (end >= value.length) break;
    }
  };
  addChunks("analysis", "初始解读报告", analysis);
  addChunks("extracted", "第三方测试结果", extracted);
  return {
    version: 1,
    chunkChars: INTERPRET_EVIDENCE_CHUNK_CHARS,
    overlapChars: INTERPRET_EVIDENCE_OVERLAP_CHARS,
    createdAt: nowIso(),
    items: chunks,
  };
}

function scoreEvidenceItem(item, query) {
  const haystack = [item.title, item.source, item.text, (item.keywords || []).join(" ")].join("\n").toLowerCase();
  let score = 0;
  for (const token of query) {
    if (haystack.includes(token)) score += CONTROL_TERMS.includes(token) ? 6 : 1;
  }
  if (/高风险|严重|紧急/.test(haystack)) score += 2;
  return score;
}

function selectEvidenceItems(evidenceIndex, queryText, limit = MAX_INTERPRET_EVIDENCE_ITEMS) {
  const items = Array.isArray(evidenceIndex?.items) ? evidenceIndex.items : [];
  if (!items.length) return [];
  const query = tokenize(queryText);
  const scored = items
    .map((item) => ({ item, score: scoreEvidenceItem(item, query) }))
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
  const matched = scored.filter((entry) => entry.score > 0).slice(0, limit).map((entry) => entry.item);
  if (matched.length) return matched;
  return items.filter((item) => item.source === "analysis").slice(0, 3).concat(items.filter((item) => item.source === "extracted").slice(0, 3)).slice(0, limit);
}

async function writeJsonFile(runtime, path, value) {
  await writeTextFile(runtime, path, JSON.stringify(value, null, 2));
  return path;
}

async function readJsonFile(runtime, path, fallback = null) {
  try {
    return JSON.parse(await readTextFile(runtime, path));
  } catch {
    return fallback;
  }
}

function interpretBasePath(record) {
  if (record?.analysisPath) return record.analysisPath.replace(/\/analysis\.md$/, "");
  return `mlps-review/companies/${record.companyId}/projects/${record.projectId}/interprets/${record.id}`;
}

async function ensureInterpretCompression(record) {
  const runtime = await annaReady;
  const context = await contextForInterpretRecord(record);
  let changed = false;

  if (!record.analysisDigest) {
    record.analysisDigest = await summarizeInterpretText("初始解读报告", context.analysis, MAX_INTERPRET_DIGEST_CHARS);
    changed = true;
  }
  if (!record.extractionDigest) {
    record.extractionDigest = await summarizeInterpretText("第三方测试结果抽取文本", context.extracted, MAX_INTERPRET_DIGEST_CHARS);
    changed = true;
  }
  if (!record.evidenceIndexPath) {
    const evidenceIndex = buildEvidenceIndex(context.analysis, context.extracted);
    const evidenceIndexPath = `${interpretBasePath(record)}/evidence-index.json`;
    await writeJsonFile(runtime, evidenceIndexPath, evidenceIndex);
    record.evidenceIndexPath = evidenceIndexPath;
    record.evidenceIndex = {
      path: evidenceIndexPath,
      itemCount: evidenceIndex.items.length,
      version: evidenceIndex.version,
      updatedAt: evidenceIndex.createdAt,
    };
    record.evidenceIndexCache = evidenceIndex;
    changed = true;
  }
  if (changed) {
    record.updatedAt = nowIso();
    await saveStateSlice("interprets");
  }
  return record;
}

async function readInterpretEvidenceIndex(record) {
  const runtime = await annaReady;
  if (record.evidenceIndexCache) return record.evidenceIndexCache;
  const path = record.evidenceIndexPath || record.evidenceIndex?.path;
  if (path) {
    const index = await readJsonFile(runtime, path, null);
    if (index?.items) {
      record.evidenceIndexCache = index;
      return index;
    }
  }
  await ensureInterpretCompression(record);
  return record.evidenceIndexCache || { items: [] };
}

async function matchKnowledgeForInterpretTurn(runtime, record, queryText) {
  const items = appState.knowledge.filter((k) => k.companyId === record.companyId);
  if (!items.length) return [];
  const query = tokenize(queryText);
  const scored = items
    .map((item) => {
      const haystack = [item.title, item.summary, (item.tags || []).join(" "), item.docKind].join("\n").toLowerCase();
      let score = 0;
      for (const token of query) {
        if (haystack.includes(token)) score += CONTROL_TERMS.includes(token) ? 5 : 1;
      }
      return { item, score };
    })
    .sort((a, b) => b.score - a.score || String(b.item.updatedAt).localeCompare(String(a.item.updatedAt)));

  const refs = [];
  let usedChars = 0;
  for (const { item, score } of scored.slice(0, MAX_KNOWLEDGE_ITEMS)) {
    if (score <= 0 && refs.length >= 2) continue;
    let text = "";
    try {
      text = await readTextFile(runtime, item.textPath);
    } catch {
      continue;
    }
    const budget = Math.min(1200, 6000 - usedChars);
    if (budget <= 0) break;
    const snippet = relevantSnippet(text, query, budget);
    usedChars += snippet.length;
    refs.push({ id: item.id, title: item.title, tags: item.tags || [], score, snippet });
  }
  return refs;
}

function buildEvidenceContext(items) {
  if (!items.length) return "未检索到直接相关证据片段。";
  return items
    .map((item, index) => `【证据 ${index + 1}｜${item.source === "analysis" ? "初始解读" : "测试结果"}】${item.title}\n${compactText(item.text, 900, "证据片段已截断")}`)
    .join("\n\n");
}

function buildKnowledgeTurnContext(refs) {
  if (!refs.length) return "未使用公司知识库。";
  return refs
    .map((ref, index) => `【知识 ${index + 1}】${ref.title}\n标签：${(ref.tags || []).join(", ") || "-"}\n${compactText(ref.snippet, 900, "知识片段已截断")}`)
    .join("\n\n");
}

function buildRecentConversationContext(messages) {
  const recent = (messages || []).slice(-MAX_INTERPRET_RECENT_MESSAGES);
  if (!recent.length) return "暂无最近对话。";
  return recent
    .map((message) => `${message.role === "user" ? "用户" : "助手"}：${compactText(message.content || "", 800, "消息已截断")}`)
    .join("\n\n");
}

async function buildInterpretTurnContext(record, question) {
  const runtime = await annaReady;
  await ensureInterpretCompression(record);
  const evidenceIndex = await readInterpretEvidenceIndex(record);
  const querySeed = [
    question,
    record.analysisDigest || "",
    record.extractionDigest || "",
    record.conversationDigest || "",
    (record.knowledgeRefs || []).map((k) => k.title).join(" "),
  ].join("\n");
  const evidenceItems = selectEvidenceItems(evidenceIndex, querySeed, MAX_INTERPRET_EVIDENCE_ITEMS);
  const knowledgeRefs = await matchKnowledgeForInterpretTurn(runtime, record, querySeed);
  const content = `请基于下面的精简上下文回答用户本轮追问。

回答要求：
- 明确区分“测试结果文件依据”“公司知识库补充依据”“推断/建议”。
- 证据不足时直接说明证据不足，并说明需要补充哪些材料。
- 不要声称这是正式认证或最终测评结论。
- 输出中文 Markdown，优先给出可执行整改建议。

用户本轮问题：
${question}

初始解读摘要：
${record.analysisDigest || "暂无"}

测试结果摘要：
${record.extractionDigest || "暂无"}

历史对话摘要：
${record.conversationDigest || "暂无"}

相关证据片段：
${buildEvidenceContext(evidenceItems)}

公司知识库补充材料：
${buildKnowledgeTurnContext(knowledgeRefs)}

最近对话：
${buildRecentConversationContext(record.messages || [])}`;
  return compactText(content, MAX_INTERPRET_TURN_CONTEXT_CHARS, "本轮上下文已按预算压缩");
}

async function refreshInterpretConversationDigest(record) {
  const messages = record.messages || [];
  if (messages.length <= INTERPRET_CONVERSATION_DIGEST_TRIGGER) return;
  const older = messages.slice(0, -MAX_INTERPRET_RECENT_MESSAGES);
  if (!older.length) return;
  const recent = messages.slice(-MAX_INTERPRET_RECENT_MESSAGES);
  const transcript = older
    .map((message) => `${message.role === "user" ? "用户" : "助手"}：${message.content}`)
    .join("\n\n");
  try {
    const runtime = await annaReady;
    const reply = await runtime.llm.complete({
      systemPrompt: "你是对话摘要助手。请保留用户目标、已确认结论、整改建议、待办问题和证据依据，不新增事实。",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `请把下面历史对话与既有摘要合并为不超过 ${MAX_INTERPRET_CONVERSATION_DIGEST_CHARS} 字的滚动摘要。

既有摘要：
${record.conversationDigest || "暂无"}

待压缩历史对话：
${compactText(transcript, 18000, "历史对话已截断")}`,
          },
        },
      ],
      maxTokens: 800,
      temperature: 0.1,
    });
    record.conversationDigest = compactText(extractContent(reply), MAX_INTERPRET_CONVERSATION_DIGEST_CHARS, "对话摘要已压缩");
    record.messages = recent;
  } catch {
    record.conversationDigest = compactText(
      [record.conversationDigest, digestFallback(transcript, MAX_INTERPRET_CONVERSATION_DIGEST_CHARS)].filter(Boolean).join("\n"),
      MAX_INTERPRET_CONVERSATION_DIGEST_CHARS,
      "对话摘要已压缩",
    );
    record.messages = recent;
  }
}

function buildInterpretPrompt(extraction, knowledgeRefs) {
  const text = extraction.text || "";
  const project = currentProject();
  const truncated =
    text.length > MAX_LLM_CHARS
      ? `${text.slice(0, MAX_LLM_CHARS)}\n\n[文本已截断：原始 ${text.length} 字符，仅分析前 ${MAX_LLM_CHARS} 字符]`
      : text;
  return `请解读以下第三方网络安全等级保护测评/测试结果文件。

公司：${currentCompany()?.name || "-"}
项目：${project?.name || "-"}
系统名称：${project?.systemName || "-"}
保护等级：${project?.level || els.level.value}
文件名：${selectedInterpretFile?.name || extraction.filename || "-"}

请使用中文输出 Markdown，结构必须包含：
1. 测评结果概览：说明整体状态、主要结论和需要管理层关注的事项。
2. 不符合项清单：按风险高/中/低归类，列出问题、影响、涉及控制域、证据来源。
3. 整改建议：每个不符合项给出可执行整改动作、责任方向、优先级和建议佐证材料。
4. 证据与疑点：明确哪些来自第三方测试结果文件，哪些来自公司知识库补充材料，哪些是基于专业经验的推断。
5. 后续追问建议：列出 3-5 个值得继续追问的问题。

限制：不要声称这是正式认证或最终测评结论；若文件中证据不足，必须标注“证据不足”。

公司知识库补充材料：
${buildKnowledgeContext(knowledgeRefs)}

第三方测试结果文件正文：
${truncated}`;
}

function buildCompactInterpretSystemPrompt(record = null) {
  const project = currentProject();
  const knowledgeTitles = (record?.knowledgeRefs || []).map((k) => k.title).join("；") || "未使用公司知识库";
  return compactText(`你是等保测评结果解读与整改顾问。你正在围绕一份第三方等保测评/测试结果文件进行多轮答疑。

基本信息：
公司：${currentCompany()?.name || "-"}
项目：${project?.name || "-"}
系统名称：${project?.systemName || "-"}
保护等级：${project?.level || els.level.value}
文件名：${record?.sourceFilename || "-"}
使用知识库：${knowledgeTitles}

回答要求：
- 只能基于每轮用户消息中提供的测试结果摘要、初始解读摘要、证据片段、公司知识库补充材料和用户后续补充回答。
- 必须区分“测试结果文件依据”“公司知识库补充依据”“推断/建议”。
- 对证据不足的地方直接说明证据不足，并给出需要补充的材料。
- 不要声称这是正式认证或最终测评结论。
- 输出中文 Markdown，尽量给出可落地整改建议。`, MAX_INTERPRET_SYSTEM_PROMPT_CHARS, "系统提示已压缩");
}

async function analyzeInterpretationWithLlm(extraction, knowledgeRefs) {
  const runtime = await annaReady;
  return runtime.llm.complete({
    systemPrompt: "你是资深网络安全等级保护（等保 2.0）测评结果解读顾问。你擅长从第三方测评报告、测试结果和整改清单中识别不符合项、风险等级、整改路径和证据缺口。你必须区分文件依据、公司知识库补充材料和推断建议。",
    messages: [
      { role: "user", content: { type: "text", text: buildInterpretPrompt(extraction, knowledgeRefs) } },
    ],
    maxTokens: 3200,
    temperature: 0.2,
  });
}

function extractAgentFrameText(frame) {
  if (!frame) return "";
  if (frame.event === "sse") return frame.choices?.[0]?.delta?.content || "";
  if (frame.event === "model_token" || frame.event === "delta") return frame.text || "";
  if (frame.event === "final") return frame.text || extractContent(frame);
  return "";
}

function isSessionExpiredError(err) {
  const name = err?.name || err?.error?.name || "";
  const message = errorMessage(err);
  return /APP_SESSION_EXPIRED|APP_SESSION_REVOKED|APP_SESSION_TOKEN_EXPIRED/i.test(`${name} ${message}`);
}

async function createInterpretSession(record) {
  const runtime = await annaReady;
  if (!runtime.agent?.session) {
    throw new Error("当前 Anna 运行时未提供 agent.session，请确认 manifest 权限和宿主版本。");
  }
  const session = await runtime.agent.session({
    submode: "auto",
    systemPrompt: buildCompactInterpretSystemPrompt(record),
  });
  const uuid = session.app_session_uuid || session.appSessionUuid || "";
  interpretSessions.set(record.id, session);
  record.appSessionUuid = uuid;
  record.updatedAt = nowIso();
  await saveStateSlice("interprets");
  els.interpretStatSession.textContent = uuid ? "已创建" : "已创建（无 uuid）";
  return session;
}

async function ensureInterpretSession(record) {
  if (!record) throw new Error("请先打开或创建一条解读记录。");
  const cached = interpretSessions.get(record.id);
  if (cached) return cached;
  if (record.appSessionUuid && anna?.agent?.session?.attach) {
    try {
      const attached = anna.agent.session.attach(record.appSessionUuid);
      interpretSessions.set(record.id, attached);
      return attached;
    } catch {
      // A stale local handle can be recreated with persisted context below.
    }
  }
  return createInterpretSession(record);
}

async function contextForInterpretRecord(record) {
  const runtime = await annaReady;
  const [analysis, extracted] = await Promise.all([
    record.analysisPath ? readTextFile(runtime, record.analysisPath).catch(() => record.analysis || "") : Promise.resolve(record.analysis || ""),
    record.extractedTextPath ? readTextFile(runtime, record.extractedTextPath).catch(() => "") : Promise.resolve(""),
  ]);
  record.analysis = analysis;
  return { analysis, extracted };
}

async function runInterpretChatTurn(record, content, retry = true) {
  const turnContent = await buildInterpretTurnContext(record, content);
  let session = await ensureInterpretSession(record);
  let answer = "";
  try {
    const stream = session.run({ content: turnContent });
    for await (const frame of stream) {
      if (frame.run_id) interpretRunId = frame.run_id;
      if (frame.event === "error") throw new Error(frame.message || "agent session error");
      const delta = extractAgentFrameText(frame);
      if (delta) {
        answer += delta;
        renderInterpretMessages([...(record.messages || []), { role: "assistant", content: answer }]);
      }
    }
    if (stream.runId) interpretRunId = stream.runId;
    return answer.trim() || "已完成，但本轮没有返回可展示文本。";
  } catch (err) {
    if (retry && isSessionExpiredError(err)) {
      interpretSessions.delete(record.id);
      session = await createInterpretSession(record);
      return runInterpretChatTurn(record, content, false);
    }
    throw err;
  }
}

function reviewRecordPatchFromExtraction(extraction) {
  return {
    processedPages: extraction.kind === "archive"
      ? extraction.processed_file_count || null
      : extraction.processed_page_count || extraction.page_count || null,
    pageCount: extraction.kind === "archive" ? extraction.file_count || null : extraction.page_count || null,
    extractionTruncated: Boolean(extraction.truncated),
    sourceArchive: extraction.kind === "archive"
      ? {
          kind: extraction.archive_kind || archiveKind(extraction.filename),
          fileCount: extraction.file_count || 0,
          processedFileCount: extraction.processed_file_count || 0,
          entries: extraction.entries || [],
          skipped: extraction.skipped || [],
        }
      : null,
    extractionMeta: {
      kind: extraction.kind || "",
      filename: extraction.filename || "",
      mime_type: extraction.mime_type || "",
      page_count: extraction.page_count || null,
      processed_page_count: extraction.processed_page_count || null,
      file_count: extraction.file_count || null,
      processed_file_count: extraction.processed_file_count || null,
      paragraph_count: extraction.paragraph_count || null,
      line_count: extraction.line_count || null,
      truncated: Boolean(extraction.truncated),
      ocr_used: Boolean(extraction.ocr_used),
      ocr_page_count: extraction.ocr_page_count || 0,
      ocr_lang: extraction.ocr_lang || "",
      warnings: extraction.warnings || [],
      entries: extraction.entries || [],
      skipped: extraction.skipped || [],
    },
  };
}

function extractionFromRecord(record, text) {
  const meta = record.extractionMeta || {};
  return {
    ...meta,
    kind: meta.kind || (record.sourceArchive ? "archive" : fileExt(record.sourceFilename || "")),
    filename: meta.filename || record.sourceFilename || basename(record.sourceFilePath) || "source-document",
    mime_type: meta.mime_type || record.sourceMimeType || "",
    text,
    warnings: meta.warnings || record.extractionWarnings || [],
    entries: meta.entries || record.sourceArchive?.entries || [],
    skipped: meta.skipped || record.sourceArchive?.skipped || [],
  };
}

async function updateReviewRecord(record, patch) {
  if (!record) return null;
  Object.assign(record, patch, { updatedAt: nowIso() });
  await saveStateSlice("reviews");
  renderRecordList();
  if (modalState.type === "record-view" && modalState.payload?.record?.id === record.id) {
    modalState.payload.record = record;
    renderModal();
  }
  return record;
}

function makeReviewRecord({ id, company, project, filename, contentType, size, sourceFilePath, basePath, params, status = "运行中" }) {
  const now = nowIso();
  return {
    id,
    companyId: company.id,
    projectId: project.id,
    title: `${filename} · ${formatDate(now)}`,
    sourceFilePath,
    sourceFilename: filename,
    sourceMimeType: contentType,
    sourceSizeBytes: size || 0,
    extractedTextPath: `${basePath}/extracted.txt`,
    reportPath: `${basePath}/report.md`,
    reportDraftPath: `${basePath}/report-draft.md`,
    partialReportsPath: `${basePath}/partials.md`,
    findingsDigestPath: `${basePath}/findings.md`,
    analysisCheckpointAvailable: false,
    status,
    completionState: "running",
    processedPages: null,
    pageCount: null,
    knowledgeRefs: [],
    params,
    retryCount: 0,
    maxRetries: REVIEW_MAX_RETRIES,
    reportComplete: false,
    reportDraftAvailable: false,
    extractionTruncated: false,
    llmFinishReason: "",
    failureStage: "",
    failureReason: "",
    lastCheckpoint: "created",
    createdAt: now,
    updatedAt: now,
  };
}

function sourceForRecord(record) {
  if (!record?.sourceFilePath) throw new Error("审查记录缺少源文件路径，无法重新审查。");
  const fileLike = {
    name: record.sourceFilename || basename(record.sourceFilePath) || "source-document",
    size: record.sourceSizeBytes || localFileStore.get(record.sourceFilePath)?.size || 0,
  };
  return {
    fileLike,
    source: storedSource(record.sourceMimeType || guessMime(fileLike.name), record.sourceFilePath, fileLike.name),
  };
}

async function runAnalysis() {
  const runtime = await annaReady;
  const project = currentProject();
  const company = currentCompany();
  if (!selectedFile || !project || !company) return;
  const recordId = newId("review");
  const safeName = sanitizeFilename(selectedFile.name);
  const basePath = `mlps-review/companies/${company.id}/projects/${project.id}/reviews/${recordId}`;
  const contentType = selectedFile.type || guessMime(selectedFile.name);
  const sourceFilePath = `${basePath}/source/${safeName}`;
  const params = {
    level: project.level,
    docKind: els.docKind.value,
    maxPages: selectedProcessPages(),
    ocrDpi: OCR_DPI,
  };
  const record = makeReviewRecord({
    id: recordId,
    company,
    project,
    filename: selectedFile.name,
    contentType,
    size: selectedFile.size,
    sourceFilePath,
    basePath,
    params,
  });
  appState.reviews.unshift(record);
  selectedRecordId = recordId;
  await saveStateSlice("reviews");
  renderRecordList();

  await runReviewWorkflow({
    runtime,
    record,
    file: selectedFile,
    sourceFilePath,
    contentType,
    uploadSource: true,
    params,
  });
}

async function runReviewWorkflow({ runtime, record, file, sourceFilePath, contentType, uploadSource = false, params = {}, reuseCheckpoints = false }) {
  const project = currentProject();
  const company = currentCompany();
  if (!record || !project || !company) return;
  setBusy(true);
  activeWorkstream = "review";
  activeReviewParams = {
    docKind: params.docKind || record.params?.docKind || els.docKind.value,
    filename: file?.name || record.sourceFilename || basename(record.sourceFilePath) || "-",
    maxPages: params.maxPages || record.params?.maxPages || selectedProcessPages(),
  };
  resetSteps();
  resetProgress();
  setReportPlain("正在读取文档。");
  els.text.textContent = "";
  els.statModel.textContent = "等待";
  els.statName.textContent = activeReviewParams.filename;
  if (els.statTesseract) els.statTesseract.textContent = "检测中";
  await updateReviewRecord(record, {
    status: "运行中",
    completionState: "running",
    retryCount: 0,
    maxRetries: REVIEW_MAX_RETRIES,
    reportComplete: false,
    failureStage: "",
    failureReason: "",
    llmFinishReason: "",
    analysisCheckpointAvailable: Boolean(reuseCheckpoints && record.analysisCheckpointAvailable),
  });

  try {
    markStep("extract", "active");
    await refreshTesseractStat(runtime);
    let source;
    let fileLike = file;
    if (reuseCheckpoints && record.extractedTextPath && record.extractionMeta) {
      setProgress("正在读取上次抽取检查点", null);
      const checkpointText = await readTextFile(runtime, record.extractedTextPath);
      const extraction = extractionFromRecord(record, checkpointText);
      latestExtraction = extraction;
      markStep("extract", "done");
      await continueReviewAfterExtraction(runtime, record, extraction, params);
      return;
    }
    if (uploadSource) {
      setProgress("正在上传审查源文件", null);
      await uploadFileToPath(runtime, file, sourceFilePath, contentType);
      source =
        file.size <= INLINE_CAP_BYTES
          ? await inlineSource(file, contentType)
          : storedSource(contentType, sourceFilePath, file.name);
      await updateReviewRecord(record, { sourceFilePath, lastCheckpoint: "source" });
    } else {
      const fromRecord = sourceForRecord(record);
      fileLike = fromRecord.fileLike;
      source = fromRecord.source;
      setProgress("正在读取归档源文件", null);
    }
    const extraction = await extractStoredDocument(runtime, fileLike, source, activeReviewParams.maxPages);
    latestExtraction = extraction;
    markStep("extract", "done");
    await continueReviewAfterExtraction(runtime, record, extraction, params);
  } catch (err) {
    const active = document.querySelector("#steps li.active");
    if (active) active.classList.add("error");
    const failureReason = await errorWithExtractionDiagnostics(runtime, err, active);
    const draftPath = err.partialReport
      ? await writeTextFile(runtime, record.reportDraftPath, err.partialReport).catch(() => record.reportDraftPath)
      : record.reportDraftPath;
    await updateReviewRecord(record, {
      status: "失败",
      completionState: "failed",
      reportComplete: false,
      reportDraftPath: err.partialReport ? draftPath : record.reportDraftPath,
      reportDraftAvailable: Boolean(err.partialReport),
      failureStage: err.failureStage || active?.dataset?.step || "analysis",
      failureReason,
      llmFinishReason: err.llmFinishReason || "",
      maxRetries: REVIEW_MAX_RETRIES,
    });
    setReportPlain(`[analysis] error: ${failureReason}`);
    setProgress("审查失败，已保留记录，可手动重新审查", null);
    selectedRecordId = record.id;
    renderRecordList();
  } finally {
    setBusy(false);
    activeReviewParams = null;
  }
}

async function continueReviewAfterExtraction(runtime, record, extraction, params = {}) {
  const text = extraction.text || "";
  const warnings = Array.isArray(extraction.warnings) ? [...extraction.warnings] : [];
  els.statText.textContent = `${text.length.toLocaleString("zh-CN")} 字`;

  if (!text.trim()) {
    const err = new Error(emptyExtractionMessage(extraction));
    err.failureStage = "extract";
    throw err;
  }

  setProgress("正在保存抽取文本检查点", null);
  await writeTextFile(runtime, record.extractedTextPath, text);
  await updateReviewRecord(record, {
    ...reviewRecordPatchFromExtraction(extraction),
    lastCheckpoint: "extracted",
  });

  markStep("knowledge", "active");
  setProgress("正在匹配公司知识库", null);
  const knowledgeRefs = await matchKnowledge(runtime, extraction);
  latestKnowledgeRefs = knowledgeRefs;
  els.statKnowledge.textContent = knowledgeRefs.length ? `${knowledgeRefs.length} 条` : "未使用";
  await updateReviewRecord(record, {
    knowledgeRefs: knowledgeRefs.map((k) => ({ id: k.id, title: k.title, score: k.score })),
    lastCheckpoint: "knowledge",
  });
  markStep("knowledge", "done");

  els.text.textContent = [
    `文件：${extraction.filename || record.sourceFilename}`,
    `类型：${extraction.kind || fileExt(record.sourceFilename || "")}`,
    extraction.kind === "archive" ? `压缩包文件：已抽取 ${extraction.processed_file_count || 0} / ${extraction.file_count || 0} 个` : "",
    `页数/段落：${extraction.page_count ?? extraction.paragraph_count ?? extraction.line_count ?? "-"}`,
    extraction.ocr_used ? `OCR：已启用，识别 ${extraction.ocr_page_count || 0} 页，语言 ${extraction.ocr_lang || "-"}` : "",
    extraction.entries?.length ? `参与文件：${extraction.entries.map((entry) => entry.path).join("；")}` : "",
    knowledgeRefs.length ? `知识库：${knowledgeRefs.map((k) => k.title).join("；")}` : "知识库：未使用公司知识库",
    warnings.length ? `提示：${warnings.join("；")}` : "",
    "",
    text,
  ].filter(Boolean).join("\n");

  setProgress("正在请求 LLM 合规分析", null);
  setReportPlain("正在请求 LLM 分析。");
  markStep("analyze", "active");
  const reply = await analyzeDocumentWithLlm(extraction, knowledgeRefs, record);
  markStep("analyze", "done");

  latestReport = extractContent(reply);
  setReportMarkdown(latestReport);
  els.statModel.textContent = reply?.model || "已完成";

  markStep("save", "active");
  await writeTextFile(runtime, record.reportPath, latestReport);
  await updateReviewRecord(record, {
    status: "已完成",
    completionState: "complete",
    reportComplete: true,
    reportDraftAvailable: false,
    failureStage: "",
    failureReason: "",
    llmFinishReason: reply?.finishReason || reply?.reviewMeta?.llmFinishReason || "",
    retryCount: record.retryCount || 0,
    maxRetries: REVIEW_MAX_RETRIES,
    lastCheckpoint: "report",
    params: {
      level: currentProject()?.level,
      docKind: activeReviewParams?.docKind || params.docKind || els.docKind.value,
      maxPages: activeReviewParams?.maxPages || params.maxPages || selectedProcessPages(),
      ocrDpi: OCR_DPI,
    },
  });
  markStep("save", "done");
  markStep("done", "done");
  finishProgress("审查完成并已归档");

  selectedRecordId = record.id;
  renderRecordList();
  showResultTab("report");
}

async function runInterpretation() {
  const runtime = await annaReady;
  const project = currentProject();
  const company = currentCompany();
  const file = selectedInterpretFile;
  if (!file || !project || !company) return;
  activeWorkstream = "interpret";
  setBusy(true);
  resetSteps("interpret");
  resetProgress("interpret");
  els.interpretReport.textContent = "正在读取第三方测试结果文件。";
  renderInterpretMessages([]);
  els.interpretStatSession.textContent = "等待";

  const recordId = newId("interpret");
  const safeName = sanitizeFilename(file.name);
  const basePath = `mlps-review/companies/${company.id}/projects/${project.id}/interprets/${recordId}`;
  const contentType = file.type || guessMime(file.name);

  try {
    markStep("extract", "active", "interpret");
    setProgress("正在上传第三方测试结果源文件", null);
    const sourceFilePath = await uploadFileToPath(runtime, file, `${basePath}/source/${safeName}`, contentType);
    const source =
      file.size <= INLINE_CAP_BYTES
        ? await inlineSource(file, contentType)
        : storedSource(contentType, sourceFilePath, file.name);
    const extraction = await extractStoredDocument(runtime, file, source, selectedInterpretPages());
    markStep("extract", "done", "interpret");

    const text = extraction.text || "";
    const warnings = Array.isArray(extraction.warnings) ? [...extraction.warnings] : [];
    els.interpretStatText.textContent = `${text.length.toLocaleString("zh-CN")} 字`;
    if (!text.trim()) {
      throw new Error(emptyExtractionMessage(extraction));
    }

    markStep("knowledge", "active", "interpret");
    setProgress("正在匹配公司知识库", null);
    const knowledgeRefs = els.interpretUseKnowledge.checked
      ? await matchKnowledge(runtime, extraction, ["第三方测评结果", "测试结果", "不符合项", "整改建议", "风险等级"])
      : [];
    els.interpretStatKnowledge.textContent = knowledgeRefs.length ? `${knowledgeRefs.length} 条` : "未使用";
    markStep("knowledge", "done", "interpret");

    setProgress("正在请求 LLM 解读测试结果", null);
    els.interpretReport.textContent = "正在生成第三方测试结果解读报告。";
    markStep("analyze", "active", "interpret");
    const reply = await analyzeInterpretationWithLlm(extraction, knowledgeRefs);
    const analysis = extractContent(reply);
    els.interpretReport.innerHTML = renderMarkdown(analysis);
    markStep("analyze", "done", "interpret");

    markStep("save", "active", "interpret");
    const extractedTextPath = `${basePath}/extracted.txt`;
    const analysisPath = `${basePath}/analysis.md`;
    const evidenceIndexPath = `${basePath}/evidence-index.json`;
    await writeTextFile(runtime, extractedTextPath, text);
    await writeTextFile(runtime, analysisPath, analysis);
    setProgress("正在压缩解读上下文", null);
    const [analysisDigest, extractionDigest] = await Promise.all([
      summarizeInterpretText("初始解读报告", analysis, MAX_INTERPRET_DIGEST_CHARS),
      summarizeInterpretText("第三方测试结果抽取文本", text, MAX_INTERPRET_DIGEST_CHARS),
    ]);
    const evidenceIndex = buildEvidenceIndex(analysis, text);
    await writeJsonFile(runtime, evidenceIndexPath, evidenceIndex);
    const now = nowIso();
    const record = {
      id: recordId,
      companyId: company.id,
      projectId: project.id,
      title: `${file.name} · ${formatDate(now)}`,
      sourceFilePath,
      sourceFilename: file.name,
      sourceMimeType: contentType,
      sourceSizeBytes: file.size,
      extractedTextPath,
      analysisPath,
      analysis,
      analysisDigest,
      extractionDigest,
      conversationDigest: "",
      evidenceIndexPath,
      evidenceIndex: {
        path: evidenceIndexPath,
        itemCount: evidenceIndex.items.length,
        version: evidenceIndex.version,
        updatedAt: evidenceIndex.createdAt,
      },
      evidenceIndexCache: evidenceIndex,
      status: "已完成",
      processedPages: extraction.kind === "archive"
        ? extraction.processed_file_count || null
        : extraction.processed_page_count || extraction.page_count || null,
      pageCount: extraction.kind === "archive" ? extraction.file_count || null : extraction.page_count || null,
      sourceArchive: extraction.kind === "archive"
        ? {
            kind: extraction.archive_kind || archiveKind(file.name),
            fileCount: extraction.file_count || 0,
            processedFileCount: extraction.processed_file_count || 0,
            entries: extraction.entries || [],
            skipped: extraction.skipped || [],
          }
        : null,
      charCount: text.length,
      knowledgeRefs: knowledgeRefs.map((k) => ({ id: k.id, title: k.title, score: k.score })),
      appSessionUuid: "",
      messages: [],
      summary: summarizeText(analysis),
      params: {
        maxPages: selectedInterpretPages(),
        ocrDpi: OCR_DPI,
        useKnowledge: els.interpretUseKnowledge.checked,
      },
      createdAt: now,
      updatedAt: now,
    };
    appState.interprets.unshift(record);
    selectedInterpretId = recordId;
    await saveStateSlice("interprets");
    try {
      await createInterpretSession(record);
    } catch (sessionErr) {
      record.messages = [
        {
          role: "assistant",
          content: `初始解读已完成并归档，但多轮会话暂未创建：${formatError("agent.session", sessionErr)}。稍后继续追问时会自动重试创建会话。`,
          createdAt: nowIso(),
        },
      ];
      record.updatedAt = nowIso();
      els.interpretStatSession.textContent = "待重试";
      await saveStateSlice("interprets");
    }
    markStep("save", "done", "interpret");
    markStep("done", "done", "interpret");
    finishProgress("解读完成并已归档");

    selectedInterpretFile = null;
    els.interpretFileInput.value = "";
    els.interpretFileMeta.textContent = REVIEW_SOURCE_LABEL;
    renderInterpretList();
    renderInterpretWorkspace();
  } catch (err) {
    const active = document.querySelector("#interpret-steps li.active");
    if (active) active.classList.add("error");
    const failureReason = await errorWithExtractionDiagnostics(runtime, err, active);
    els.interpretReport.textContent = `[interpret] error: ${failureReason}`;
  } finally {
    activeWorkstream = "review";
    setBusy(false);
  }
}

async function uploadKnowledge() {
  const runtime = await annaReady;
  const company = currentCompany();
  const file = selectedKnowledgeFile;
  if (!company || !file) return;
  const uploadBtn = $("knowledge-upload-btn");
  if (uploadBtn) uploadBtn.disabled = true;
  const id = newId("knowledge");
  const safeName = sanitizeFilename(file.name);
  const contentType = file.type || guessMime(file.name);
  const basePath = `mlps-review/companies/${company.id}/knowledge/${id}`;
  try {
    setProgress("正在上传知识库文档", null);
    const sourceFilePath = await uploadFileToPath(runtime, file, `${basePath}/source/${safeName}`, contentType);
    const source =
      file.size <= INLINE_CAP_BYTES
        ? await inlineSource(file, contentType)
        : storedSource(contentType, sourceFilePath, file.name);
    const extraction = await extractStoredDocument(runtime, file, source, MAX_PROCESS_PAGES);
    const text = extraction.text || "";
    if (!text.trim()) throw new Error("知识库文档未抽取到文本。");
    const title = $("knowledge-title")?.value.trim() || file.name;
    const tags = parseTags($("knowledge-tags")?.value || "");
    const summary = summarizeText(text);
    const textPath = `${basePath}/text.txt`;
    await writeTextFile(runtime, textPath, text);
    const now = nowIso();
    appState.knowledge.unshift({
      id,
      companyId: company.id,
      title,
      sourceFilePath,
      textPath,
      summary,
      tags,
      docKind: extraction.kind || fileExt(file.name),
      charCount: text.length,
      createdAt: now,
      updatedAt: now,
    });
    await saveStateSlice("knowledge");
    selectedKnowledgeFile = null;
    selectedKnowledgeId = id;
    renderKnowledgeList();
    finishProgress("知识库文档已保存");
    closeModal();
    await viewKnowledge(id);
  } catch (err) {
    const failureReason = await errorWithExtractionDiagnostics(runtime, err, { dataset: { step: "extract" } });
    alert(`[knowledge] error: ${failureReason}`);
  } finally {
    updateActionState();
  }
}

async function viewKnowledge(id) {
  const runtime = await annaReady;
  selectedKnowledgeId = id;
  const item = appState.knowledge.find((k) => k.id === id);
  renderKnowledgeList();
  if (!item) return;
  openModal("knowledge-view", { item, loading: true });
  try {
    const text = await readTextFile(runtime, item.textPath);
    openModal("knowledge-view", { item, text, summary: item.summary || "", loading: false });
  } catch (err) {
    openModal("knowledge-view", { item, error: formatError("knowledge.read", err), loading: false });
  }
}

async function editKnowledge(id) {
  const runtime = await annaReady;
  selectedKnowledgeId = id;
  const item = appState.knowledge.find((k) => k.id === id);
  renderKnowledgeList();
  if (!item) return;
  openModal("knowledge-edit", { item, loading: true });
  try {
    const text = await readTextFile(runtime, item.textPath);
    openModal("knowledge-edit", { item, text, summary: item.summary || "", loading: false });
  } catch (err) {
    openModal("knowledge-edit", { item, text: formatError("knowledge.read", err), summary: item.summary || "", loading: false });
  }
}

async function saveKnowledgeEdit() {
  const runtime = await annaReady;
  const item = appState.knowledge.find((k) => k.id === selectedKnowledgeId);
  if (!item) return;
  const text = $("knowledge-text")?.value || "";
  item.title = $("knowledge-edit-title")?.value.trim() || item.title;
  item.tags = parseTags($("knowledge-edit-tags")?.value || "");
  item.summary = $("knowledge-summary")?.value.trim() || "";
  item.charCount = text.length;
  item.updatedAt = nowIso();
  await writeTextFile(runtime, item.textPath, text);
  await saveStateSlice("knowledge");
  renderKnowledgeList();
  closeModal();
  await viewKnowledge(item.id);
}

async function deleteKnowledge(id = selectedKnowledgeId) {
  const runtime = await annaReady;
  const item = appState.knowledge.find((k) => k.id === id);
  if (!item || !confirm(`删除知识条目「${item.title}」？`)) return;
  appState.knowledge = appState.knowledge.filter((k) => k.id !== item.id);
  selectedKnowledgeId = null;
  await saveStateSlice("knowledge");
  await Promise.all([deleteFileQuietly(runtime, item.sourceFilePath), deleteFileQuietly(runtime, item.textPath)]);
  renderKnowledgeList();
  closeModal();
}

async function viewRecord(id) {
  const runtime = await annaReady;
  selectedRecordId = id;
  const record = appState.reviews.find((r) => r.id === id);
  renderRecordList();
  if (!record) return;
  openModal("record-view", { record, loading: true });
  try {
    const [report, extracted] = await Promise.all([
      reviewReportPath(record) ? readTextFile(runtime, reviewReportPath(record)) : Promise.resolve(""),
      readTextFile(runtime, record.extractedTextPath).catch(() => ""),
    ]);
    openModal("record-view", { record, report, extracted, loading: false });
  } catch (err) {
    openModal("record-view", { record, error: formatError("record.read", err), loading: false });
  }
}

async function deleteRecord(id = selectedRecordId) {
  const runtime = await annaReady;
  const record = appState.reviews.find((r) => r.id === id);
  if (!record || !confirm(`删除审查记录「${record.title}」？`)) return;
  appState.reviews = appState.reviews.filter((r) => r.id !== record.id);
  selectedRecordId = null;
  await saveStateSlice("reviews");
  await Promise.all([
    isReviewSourcePathStillReferenced(record.sourceFilePath) ? Promise.resolve() : deleteFileQuietly(runtime, record.sourceFilePath),
    deleteFileQuietly(runtime, record.extractedTextPath),
    deleteFileQuietly(runtime, record.reportPath),
    deleteFileQuietly(runtime, record.reportDraftPath),
    deleteFileQuietly(runtime, record.partialReportsPath),
    deleteFileQuietly(runtime, record.findingsDigestPath),
  ]);
  renderRecordList();
  closeModal();
}

function isReviewSourcePathStillReferenced(path) {
  return Boolean(path && appState.reviews.some((r) => r.sourceFilePath === path));
}

async function downloadRecord(id = selectedRecordId) {
  const runtime = await annaReady;
  const record = appState.reviews.find((r) => r.id === id);
  const path = reviewReportPath(record);
  if (!path) return;
  if (localFileStore.has(path)) {
    await downloadLocalFile(path, `${sanitizeFilename(record.title)}${record.reportComplete === false ? ".partial" : ""}.md`);
    return;
  }
  await runtime.files.download({
    path,
    filename: `${sanitizeFilename(record.title)}${record.reportComplete === false ? ".partial" : ""}.md`,
  });
}

async function downloadSourceFile(id = selectedRecordId) {
  const runtime = await annaReady;
  const record = appState.reviews.find((r) => r.id === id);
  if (!record?.sourceFilePath) return;
  if (localFileStore.has(record.sourceFilePath)) {
    await downloadLocalFile(record.sourceFilePath, sanitizeFilename(record.sourceFilename || basename(record.sourceFilePath) || record.title || "source-document"));
    return;
  }
  await runtime.files.download({
    path: record.sourceFilePath,
    filename: sanitizeFilename(record.sourceFilename || basename(record.sourceFilePath) || record.title || "source-document"),
  });
}

async function rerunRecord(id = selectedRecordId) {
  const runtime = await annaReady;
  const original = appState.reviews.find((r) => r.id === id);
  const project = currentProject();
  const company = currentCompany();
  if (!original || !project || !company || reviewIsRunning(original)) return;
  closeModal();
  showMainTab("review");
  showResultTab("report");
  const contentType = original.sourceMimeType || guessMime(original.sourceFilename || original.sourceFilePath || "");
  const params = {
    level: project.level,
    docKind: original.params?.docKind || els.docKind.value,
    maxPages: original.params?.maxPages || selectedProcessPages(),
    ocrDpi: original.params?.ocrDpi || OCR_DPI,
  };

  let record = original;
  let reuseCheckpoints = true;
  if (reviewIsComplete(original)) {
    const recordId = newId("review");
    const basePath = `mlps-review/companies/${company.id}/projects/${project.id}/reviews/${recordId}`;
    record = makeReviewRecord({
      id: recordId,
      company,
      project,
      filename: original.sourceFilename || basename(original.sourceFilePath) || original.title || "source-document",
      contentType,
      size: original.sourceSizeBytes || 0,
      sourceFilePath: original.sourceFilePath,
      basePath,
      params,
    });
    appState.reviews.unshift(record);
    await saveStateSlice("reviews");
    reuseCheckpoints = false;
  } else {
    await deleteFileQuietly(runtime, original.reportDraftPath);
    await updateReviewRecord(record, {
      reportComplete: false,
      reportDraftAvailable: false,
      status: "运行中",
      completionState: "running",
      failureStage: "",
      failureReason: "",
      retryCount: 0,
      llmFinishReason: "",
    });
  }

  selectedRecordId = record.id;
  setReportPlain(reviewIsComplete(original) ? "正在基于原源文件生成新的审查记录。" : "正在从上次失败点重新审查。");
  await runReviewWorkflow({
    runtime,
    record,
    file: null,
    sourceFilePath: record.sourceFilePath,
    contentType,
    uploadSource: false,
    params,
    reuseCheckpoints,
  });
}

async function openInterpretRecord(id) {
  const runtime = await annaReady;
  selectedInterpretId = id;
  selectedInterpretFile = null;
  const record = appState.interprets.find((r) => r.id === id);
  renderInterpretList();
  if (!record) return;
  els.interpretReport.textContent = "正在读取解读归档。";
  try {
    const analysis = await readTextFile(runtime, record.analysisPath);
    record.analysis = analysis;
    els.interpretReport.innerHTML = renderMarkdown(analysis || "暂无解读报告。");
  } catch (err) {
    els.interpretReport.textContent = formatError("interpret.read", err);
  }
  renderInterpretWorkspace();
  showMainTab("interpret");
}

async function deleteInterpretRecord(id = selectedInterpretId) {
  const runtime = await annaReady;
  const record = appState.interprets.find((r) => r.id === id);
  if (!record || !confirm(`删除解读记录「${record.title}」？`)) return;
  await deleteInterpretSessionQuietly(record);
  appState.interprets = appState.interprets.filter((r) => r.id !== record.id);
  if (selectedInterpretId === record.id) selectedInterpretId = null;
  await saveStateSlice("interprets");
  await Promise.all([
    deleteFileQuietly(runtime, record.sourceFilePath),
    deleteFileQuietly(runtime, record.extractedTextPath),
    deleteFileQuietly(runtime, record.analysisPath),
    deleteFileQuietly(runtime, record.evidenceIndexPath || record.evidenceIndex?.path),
  ]);
  renderInterpretList();
  renderInterpretWorkspace();
}

async function downloadInterpretReport(id = selectedInterpretId) {
  const runtime = await annaReady;
  const record = appState.interprets.find((r) => r.id === id);
  if (!record?.analysisPath) return;
  if (localFileStore.has(record.analysisPath)) {
    await downloadLocalFile(record.analysisPath, `${sanitizeFilename(record.title)}.md`);
    return;
  }
  await runtime.files.download({
    path: record.analysisPath,
    filename: `${sanitizeFilename(record.title)}.md`,
  });
}

async function downloadInterpretSourceFile(id = selectedInterpretId) {
  const runtime = await annaReady;
  const record = appState.interprets.find((r) => r.id === id);
  if (!record?.sourceFilePath) return;
  if (localFileStore.has(record.sourceFilePath)) {
    await downloadLocalFile(record.sourceFilePath, sanitizeFilename(record.sourceFilename || basename(record.sourceFilePath) || record.title || "interpret-source"));
    return;
  }
  await runtime.files.download({
    path: record.sourceFilePath,
    filename: sanitizeFilename(record.sourceFilename || basename(record.sourceFilePath) || record.title || "interpret-source"),
  });
}

async function deleteInterpretSessionQuietly(record) {
  try {
    const session =
      interpretSessions.get(record.id) ||
      (record.appSessionUuid && anna?.agent?.session?.attach
        ? anna.agent.session.attach(record.appSessionUuid)
        : null);
    if (session?.delete) await session.delete();
  } catch {
    // Session cleanup is best-effort; persisted records remain usable.
  }
  interpretSessions.delete(record.id);
}

async function sendInterpretMessage() {
  const record = currentInterpret();
  const content = (els.interpretChatInput.value || "").trim();
  if (!record || !content || isSendingInterpretMessage) return;
  els.interpretChatInput.value = "";
  isSendingInterpretMessage = true;
  els.interpretChatSend.disabled = true;
  els.interpretChatSend.classList.add("busy");
  els.interpretChatSend.textContent = "发送中";
  els.interpretChatInput.disabled = true;
  record.messages = [...(record.messages || []), { role: "user", content, createdAt: nowIso() }];
  renderInterpretMessages(record.messages, "正在整理上下文并生成回答...");
  try {
    const answer = await runInterpretChatTurn(record, content);
    record.messages.push({ role: "assistant", content: answer, createdAt: nowIso() });
    await refreshInterpretConversationDigest(record);
    record.updatedAt = nowIso();
    await saveStateSlice("interprets");
    renderInterpretMessages(record.messages);
    renderInterpretList();
    renderInterpretWorkspace();
  } catch (err) {
    const errorText = formatError("interpret.chat", err);
    record.messages.push({ role: "assistant", content: errorText, createdAt: nowIso() });
    record.updatedAt = nowIso();
    await saveStateSlice("interprets");
    renderInterpretMessages(record.messages);
  } finally {
    isSendingInterpretMessage = false;
    updateActionState();
  }
}

async function clearInterpretChat() {
  const record = currentInterpret();
  if (!record || !confirm(`清空「${record.title}」的当前对话？`)) return;
  await deleteInterpretSessionQuietly(record);
  record.messages = [];
  record.conversationDigest = "";
  record.appSessionUuid = "";
  record.updatedAt = nowIso();
  await saveStateSlice("interprets");
  renderInterpretWorkspace();
  renderInterpretList();
}

async function shareReportToChat(reportText) {
  const content = reportText || latestReport;
  if (!content) return;
  try {
    const runtime = await annaReady;
    await runtime.chat.write_message({
      role: "user",
      content: `请基于刚才的等保文档审查结果继续协助我整改：\n\n${content}`,
    });
  } catch (err) {
    if (modalState.type === "record-view") {
      modalState.payload = {
        ...modalState.payload,
        report: `${content}\n\n${formatError("chat.write_message", err)}`,
      };
      renderModal();
    } else {
      setReportPlain(`${content}\n\n${formatError("chat.write_message", err)}`);
    }
  }
}

async function createCompany() {
  showMainTab("companies");
  openModal("company-form", { mode: "create" });
}

async function createProject() {
  if (!currentCompany()) {
    showMainTab("companies");
    return;
  }
  showMainTab("projects");
  openModal("project-form", { mode: "create" });
}

async function editCompany(id) {
  const company = appState.companies.find((c) => c.id === id);
  if (!company) return;
  openModal("company-form", { mode: "edit", company });
}

async function editProject(id) {
  const project = appState.projects.find((p) => p.id === id && p.companyId === appState.index.selectedCompanyId);
  if (!project) return;
  openModal("project-form", { mode: "edit", project });
}

async function saveCompanyForm() {
  const mode = modalState.type === "company-form" ? modalState.payload?.mode : "edit";
  const editingId = modalState.payload?.company?.id;
  const name = $("company-name")?.value.trim() || "";
  if (!name) return;
  if (mode === "create") {
    const now = nowIso();
    const company = {
      id: newId("company"),
      name,
      description: $("company-desc")?.value.trim() || "",
      createdAt: now,
      updatedAt: now,
    };
    appState.companies.unshift(company);
    appState.index.selectedCompanyId = company.id;
    appState.index.selectedProjectId = null;
    await Promise.all([saveStateSlice("companies"), saveIndex()]);
  } else {
    const company = appState.companies.find((c) => c.id === editingId) || currentCompany();
    if (!company) return;
    company.name = name;
    company.description = $("company-desc")?.value.trim() || "";
    company.updatedAt = nowIso();
    await saveStateSlice("companies");
  }
  closeModal();
  renderAll();
}

async function saveProjectForm() {
  const mode = modalState.type === "project-form" ? modalState.payload?.mode : "edit";
  const editingId = modalState.payload?.project?.id;
  const company = currentCompany();
  const name = $("project-name")?.value.trim() || "";
  if (!company || !name) return;
  if (mode === "create") {
    const now = nowIso();
    const project = {
      id: newId("project"),
      companyId: company.id,
      name,
      systemName: $("project-system")?.value.trim() || "",
      level: $("project-level")?.value || "三级",
      description: $("project-desc")?.value.trim() || "",
      createdAt: now,
      updatedAt: now,
    };
    appState.projects.unshift(project);
    appState.index.selectedProjectId = project.id;
    await Promise.all([saveStateSlice("projects"), saveIndex()]);
  } else {
    const project = appState.projects.find((p) => p.id === editingId && p.companyId === company.id) || currentProject();
    if (!project) return;
    project.name = name;
    project.systemName = $("project-system")?.value.trim() || "";
    project.level = $("project-level")?.value || "三级";
    project.description = $("project-desc")?.value.trim() || "";
    project.updatedAt = nowIso();
    await saveStateSlice("projects");
  }
  closeModal();
  renderAll();
}

async function selectCompany(id) {
  if (!appState.companies.some((c) => c.id === id)) return;
  appState.index.selectedCompanyId = id;
  appState.index.selectedProjectId = projectsForCurrentCompany()[0]?.id || null;
  selectedKnowledgeId = null;
  selectedRecordId = null;
  selectedInterpretId = null;
  await saveIndex();
  renderAll();
}

async function selectProject(id) {
  if (!appState.projects.some((p) => p.id === id && p.companyId === appState.index.selectedCompanyId)) return;
  appState.index.selectedProjectId = id;
  selectedRecordId = null;
  selectedInterpretId = null;
  await saveIndex();
  renderAll();
}

async function deleteCompany(id = modalState.payload?.company?.id || appState.index.selectedCompanyId) {
  const runtime = await annaReady;
  const company = appState.companies.find((c) => c.id === id);
  if (!company || !confirm(`删除公司「${company.name}」及其项目、记录索引和知识库？`)) return;
  const companyProjects = appState.projects.filter((p) => p.companyId === company.id);
  const projectIds = new Set(companyProjects.map((p) => p.id));
  const knowledge = appState.knowledge.filter((k) => k.companyId === company.id);
  const reviews = appState.reviews.filter((r) => r.companyId === company.id || projectIds.has(r.projectId));
  const interprets = appState.interprets.filter((r) => r.companyId === company.id || projectIds.has(r.projectId));
  appState.companies = appState.companies.filter((c) => c.id !== company.id);
  appState.projects = appState.projects.filter((p) => p.companyId !== company.id);
  appState.knowledge = appState.knowledge.filter((k) => k.companyId !== company.id);
  appState.reviews = appState.reviews.filter((r) => r.companyId !== company.id && !projectIds.has(r.projectId));
  appState.interprets = appState.interprets.filter((r) => r.companyId !== company.id && !projectIds.has(r.projectId));
  selectedInterpretId = null;
  ensureValidSelection();
  await Promise.all([
    saveStateSlice("companies"),
    saveStateSlice("projects"),
    saveStateSlice("knowledge"),
    saveStateSlice("reviews"),
    saveStateSlice("interprets"),
    saveIndex(),
  ]);
  await Promise.all(interprets.map((r) => deleteInterpretSessionQuietly(r)));
  await Promise.all([
    ...knowledge.flatMap((k) => [deleteFileQuietly(runtime, k.sourceFilePath), deleteFileQuietly(runtime, k.textPath)]),
    ...reviews.flatMap((r) => [
      deleteFileQuietly(runtime, r.sourceFilePath),
      deleteFileQuietly(runtime, r.extractedTextPath),
      deleteFileQuietly(runtime, r.reportPath),
      deleteFileQuietly(runtime, r.reportDraftPath),
      deleteFileQuietly(runtime, r.partialReportsPath),
      deleteFileQuietly(runtime, r.findingsDigestPath),
    ]),
    ...interprets.flatMap((r) => [
      deleteFileQuietly(runtime, r.sourceFilePath),
      deleteFileQuietly(runtime, r.extractedTextPath),
      deleteFileQuietly(runtime, r.analysisPath),
      deleteFileQuietly(runtime, r.evidenceIndexPath || r.evidenceIndex?.path),
    ]),
  ]);
  closeModal();
  renderAll();
}

async function deleteProject(id = modalState.payload?.project?.id || appState.index.selectedProjectId) {
  const runtime = await annaReady;
  const project = appState.projects.find((p) => p.id === id && p.companyId === appState.index.selectedCompanyId);
  if (!project || !confirm(`删除项目「${project.name}」及其审查记录和解读记录？`)) return;
  const reviews = appState.reviews.filter((r) => r.projectId === project.id);
  const interprets = appState.interprets.filter((r) => r.projectId === project.id);
  appState.projects = appState.projects.filter((p) => p.id !== project.id);
  appState.reviews = appState.reviews.filter((r) => r.projectId !== project.id);
  appState.interprets = appState.interprets.filter((r) => r.projectId !== project.id);
  selectedInterpretId = null;
  appState.index.selectedProjectId = projectsForCurrentCompany()[0]?.id || null;
  await Promise.all([saveStateSlice("projects"), saveStateSlice("reviews"), saveStateSlice("interprets"), saveIndex()]);
  await Promise.all(interprets.map((r) => deleteInterpretSessionQuietly(r)));
  await Promise.all([
    ...reviews.flatMap((r) => [
      deleteFileQuietly(runtime, r.sourceFilePath),
      deleteFileQuietly(runtime, r.extractedTextPath),
      deleteFileQuietly(runtime, r.reportPath),
      deleteFileQuietly(runtime, r.reportDraftPath),
      deleteFileQuietly(runtime, r.partialReportsPath),
      deleteFileQuietly(runtime, r.findingsDigestPath),
    ]),
    ...interprets.flatMap((r) => [
      deleteFileQuietly(runtime, r.sourceFilePath),
      deleteFileQuietly(runtime, r.extractedTextPath),
      deleteFileQuietly(runtime, r.analysisPath),
      deleteFileQuietly(runtime, r.evidenceIndexPath || r.evidenceIndex?.path),
    ]),
  ]);
  closeModal();
  renderAll();
}

function parseTags(value) {
  return value
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function summarizeText(text) {
  return text.replace(/\s+/g, " ").slice(0, 240);
}

function selectedProcessPages() {
  const value = Number(els.processPages?.value || 100);
  return Number.isFinite(value) ? Math.min(Math.max(1, value), MAX_PROCESS_PAGES) : 100;
}

function selectedInterpretPages() {
  const value = Number(els.interpretProcessPages?.value || 100);
  return Number.isFinite(value) ? Math.min(Math.max(1, value), MAX_PROCESS_PAGES) : 100;
}

function errorMessage(err) {
  return err?.message || err?.error?.message || String(err);
}

function isNotImplementedError(err) {
  return /not_implemented|endpoint not yet available/i.test(errorMessage(err));
}

function isLocalDevOrigin() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function isRecoverableExtractorError(err) {
  return /executa process exited|tool_timeout|failed to fetch|stream has ended|eof/i.test(errorMessage(err));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFilename(name) {
  return (name || "document")
    .replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_")
    .slice(0, 120);
}

function guessMime(name) {
  const ext = fileExt(name);
  if (archiveKind(name) === "zip") return "application/zip";
  if (archiveKind(name) === "tar.gz") return "application/gzip";
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (ext === "xls") return "application/vnd.ms-excel";
  if (ext === "csv") return "text/csv; charset=utf-8";
  if (ext === "md" || ext === "markdown") return "text/markdown; charset=utf-8";
  if (ext === "txt") return TEXT_UPLOAD_TYPE;
  return "application/octet-stream";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showMainTab(name) {
  activeTab = name;
  renderNavigation();
  for (const panel of $$(".tab-panel")) {
    panel.classList.toggle("active", panel.id === `tab-${name}`);
  }
}

function showResultTab(name) {
  const report = name === "report";
  els.tabReportBtn.classList.toggle("active", report);
  els.tabTextBtn.classList.toggle("active", !report);
  els.report.classList.toggle("active", report);
  els.text.classList.toggle("active", !report);
}

function bindDropZone(zone, input, onFile) {
  input.addEventListener("change", () => onFile(input.files?.[0] || null));
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("dragging");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragging"));
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("dragging");
    const file = event.dataTransfer?.files?.[0] || null;
    if (file) {
      input.files = event.dataTransfer.files;
      onFile(file);
    }
  });
}

bindDropZone(els.dropZone, els.fileInput, selectFile);
bindDropZone(els.interpretDropZone, els.interpretFileInput, selectInterpretFile);

for (const btn of els.navLinks) {
  btn.addEventListener("click", () => showMainTab(btn.dataset.tab));
}
els.companySelect.addEventListener("change", async () => {
  appState.index.selectedCompanyId = els.companySelect.value || null;
  appState.index.selectedProjectId = projectsForCurrentCompany()[0]?.id || null;
  selectedKnowledgeId = null;
  selectedRecordId = null;
  selectedInterpretId = null;
  await saveIndex();
  renderAll();
});
els.projectSelect.addEventListener("change", async () => {
  appState.index.selectedProjectId = els.projectSelect.value || null;
  selectedRecordId = null;
  selectedInterpretId = null;
  await saveIndex();
  renderAll();
});
els.tabReportBtn.addEventListener("click", () => showResultTab("report"));
els.tabTextBtn.addEventListener("click", () => showResultTab("text"));
els.companyCreate.addEventListener("click", createCompany);
els.projectCreate.addEventListener("click", createProject);
els.knowledgeOpenUpload.addEventListener("click", () => {
  selectedKnowledgeFile = null;
  openModal("knowledge-upload");
  updateActionState();
});
els.emptyCompany.addEventListener("click", createCompany);
els.emptyProject.addEventListener("click", createProject);
els.interpretEmptyCompany.addEventListener("click", createCompany);
els.interpretEmptyProject.addEventListener("click", createProject);
els.analyze.addEventListener("click", runAnalysis);
els.interpretAnalyze.addEventListener("click", runInterpretation);
els.interpretChatSend.addEventListener("click", sendInterpretMessage);
els.interpretChatInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    sendInterpretMessage();
  }
});
els.interpretDownloadSource.addEventListener("click", () => downloadInterpretSourceFile(selectedInterpretId));
els.interpretDownloadReport.addEventListener("click", () => downloadInterpretReport(selectedInterpretId));
els.interpretClearChat.addEventListener("click", clearInterpretChat);

for (const table of [els.recordList, els.interpretList, els.knowledgeList, els.companyList, els.projectList]) {
  table.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === "view-record") await viewRecord(id);
    if (action === "rerun-record") await rerunRecord(id);
    if (action === "download-source") await downloadSourceFile(id);
    if (action === "download-record") await downloadRecord(id);
    if (action === "delete-record") await deleteRecord(id);
    if (action === "open-interpret") await openInterpretRecord(id);
    if (action === "download-interpret-source") await downloadInterpretSourceFile(id);
    if (action === "download-interpret-report") await downloadInterpretReport(id);
    if (action === "delete-interpret") await deleteInterpretRecord(id);
    if (action === "view-knowledge") await viewKnowledge(id);
    if (action === "edit-knowledge") await editKnowledge(id);
    if (action === "delete-knowledge") await deleteKnowledge(id);
    if (action === "select-company") await selectCompany(id);
    if (action === "edit-company") await editCompany(id);
    if (action === "delete-company") await deleteCompany(id);
    if (action === "select-project") await selectProject(id);
    if (action === "edit-project") await editProject(id);
    if (action === "delete-project") await deleteProject(id);
  });
}

els.modalBackdrop.addEventListener("click", async (event) => {
  if (event.target === els.modalBackdrop) {
    closeModal();
    return;
  }
  const btn = event.target.closest("[data-modal-action]");
  if (!btn) return;
  const action = btn.dataset.modalAction;
  if (action === "close-modal") closeModal();
  if (action === "upload-knowledge") await uploadKnowledge();
  if (action === "save-knowledge") await saveKnowledgeEdit();
  if (action === "delete-knowledge") await deleteKnowledge();
  if (action === "edit-knowledge") await editKnowledge(selectedKnowledgeId);
  if (action === "save-company") await saveCompanyForm();
  if (action === "delete-company") await deleteCompany();
  if (action === "save-project") await saveProjectForm();
  if (action === "delete-project") await deleteProject();
  if (action === "download-source") await downloadSourceFile(selectedRecordId);
  if (action === "download-record") await downloadRecord(selectedRecordId);
  if (action === "rerun-record") await rerunRecord(selectedRecordId);
  if (action === "share-report") {
    await shareReportToChat(modalState.payload?.report || latestReport);
  }
});
els.modalClose.addEventListener("click", closeModal);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.modalBackdrop.hidden) closeModal();
});

selectFile(null);
