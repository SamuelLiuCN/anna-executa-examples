import { AnnaAppRuntime } from "/static/anna-apps/_sdk/latest/index.js";

const EXECUTA_HANDLE = "document-extractor";
const DEV_FALLBACK_TOOL_ID = "tool-intern2-document-extractor-u2n2j8x5";
const LEGACY_LOCAL_TOOL_ID = "tool-test-document-extractor-12345678";
const EXECUTA_TOOL_IDS = Array.from(new Set([
  typeof window !== "undefined" &&
    window.__ANNA_TOOL_IDS__ &&
    window.__ANNA_TOOL_IDS__[EXECUTA_HANDLE],
  `bundled:${EXECUTA_HANDLE}`,
  DEV_FALLBACK_TOOL_ID,
  LEGACY_LOCAL_TOOL_ID,
].filter(Boolean)));
const EXECUTA_METHOD = "extract_document";

const STORAGE_KEYS = {
  index: "mlps:v1:index",
  companies: "mlps:v1:companies",
  projects: "mlps:v1:projects",
  reviews: "mlps:v1:reviews",
  knowledge: "mlps:v1:knowledge",
};

const INLINE_CAP_BYTES = 8 * 1024 * 1024;
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const TOOL_HOST_TIMEOUT_MS = 180000;
const TOOL_CLIENT_TIMEOUT_MS = 190000;
const OCR_DPI = 120;
const PAGES_PER_TOOL_CALL = 20;
const MIN_PAGES_PER_TOOL_CALL = 1;
const MAX_PROCESS_PAGES = 500;
const MAX_EXTRACT_CHARS = 500000;
const MAX_LLM_CHARS = 90000;
const MAX_KNOWLEDGE_ITEMS = 8;
const MAX_KNOWLEDGE_CHARS = 40000;
const TEXT_UPLOAD_TYPE = "text/plain; charset=utf-8";

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
let selectedKnowledgeId = null;
let selectedRecordId = null;
let latestReport = "";
let latestExtraction = null;
let latestKnowledgeRefs = [];
let activeTab = "review";
let modalState = { type: null, payload: null };

const appState = {
  index: { selectedCompanyId: null, selectedProjectId: null },
  companies: [],
  projects: [],
  reviews: [],
  knowledge: [],
};

const annaReady = (async () => {
  try {
    const runtime = await AnnaAppRuntime.connect();
    anna = runtime;
    els.connection.textContent = "已连接";
    markStep("connect", "done");
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
    els.report.textContent = formatError("runtime.connect", err);
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

function markStep(name, state) {
  for (const li of document.querySelectorAll("#steps li")) {
    if (li.dataset.step === name) {
      li.classList.toggle("active", state === "active");
      li.classList.toggle("done", state === "done");
      li.classList.toggle("error", state === "error");
    } else if (state === "active") {
      li.classList.remove("active");
    }
  }
}

function resetSteps() {
  for (const li of document.querySelectorAll("#steps li")) {
    li.classList.remove("active", "done", "error");
  }
  markStep("connect", anna ? "done" : "active");
}

function setProgress(label, percent = null) {
  if (!els.progressWrap) return;
  els.progressWrap.hidden = false;
  els.progressText.textContent = label;
  if (Number.isFinite(percent)) {
    const bounded = Math.max(0, Math.min(100, percent));
    els.progressWrap.classList.remove("indeterminate");
    els.progressBar.style.width = `${bounded.toFixed(1)}%`;
    els.progressPercent.textContent = `${Math.round(bounded)}%`;
  } else {
    els.progressWrap.classList.add("indeterminate");
    els.progressBar.style.width = "";
    els.progressPercent.textContent = "处理中";
  }
}

function resetProgress() {
  if (!els.progressWrap) return;
  els.progressWrap.hidden = true;
  els.progressWrap.classList.remove("indeterminate");
  els.progressText.textContent = "等待";
  els.progressPercent.textContent = "0%";
  els.progressBar.style.width = "0";
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

function isSupported(file) {
  return ["pdf", "docx", "txt", "md", "markdown"].includes(fileExt(file.name));
}

function formatError(label, err) {
  const code = err?.code || err?.error?.code || "error";
  const message = err?.message || err?.error?.message || String(err);
  return `[${label}] ${code}: ${message}`;
}

function setBusy(isBusy) {
  els.analyze.disabled = isBusy || !selectedFile || !currentProject();
  els.analyze.classList.toggle("busy", isBusy);
  els.analyze.textContent = isBusy ? "分析中" : "开始分析";
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

async function saveStateSlice(name) {
  await anna.storage.set({
    key: STORAGE_KEYS[name],
    value: JSON.stringify(appState[name]),
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

function renderAll() {
  renderNavigation();
  renderContextSelectors();
  renderManagementLists();
  renderContext();
  renderReviewAvailability();
  renderKnowledgeList();
  renderRecordList();
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
      ["项目名称", "系统名称", "保护等级", "审查记录数", "更新时间", "操作"],
      projects
        .map((project) => {
          const active = project.id === appState.index.selectedProjectId;
          const reviewCount = appState.reviews.filter((r) => r.projectId === project.id).length;
          return `
            <tr class="${active ? "selected-row" : ""}">
              <td class="cell-strong">${escapeHtml(project.name)}</td>
              <td>${escapeHtml(project.systemName || "-")}</td>
              <td>${escapeHtml(project.level || "-")}</td>
              <td>${reviewCount}</td>
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
          <td><span class="status-chip">${escapeHtml(record.status || "-")}</span></td>
          <td>${record.processedPages || 0}/${record.pageCount || "-"}</td>
          <td>${(record.knowledgeRefs || []).length} 条</td>
          <td>${formatDate(record.createdAt)}</td>
          <td>${rowActions([
            ["view-record", record.id, "查看", "ghost"],
            ["download-record", record.id, "下载报告", "ghost"],
            ["delete-record", record.id, "删除", "danger"],
          ])}</td>
        </tr>
      `)
      .join(""),
  );
}

function updateActionState() {
  els.analyze.disabled = !selectedFile || !currentCompany() || !currentProject();
  els.knowledgeOpenUpload.disabled = !currentCompany();
  els.projectCreate.disabled = !currentCompany();
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
          ([action, id, label, kind]) =>
            `<button class="${kind || "ghost"} mini-action" type="button" data-action="${escapeHtml(action)}" data-id="${escapeHtml(id)}">${escapeHtml(label)}</button>`,
        )
        .join("")}
    </div>
  `;
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

  if (type === "record-view") {
    const record = payload.record;
    els.modalTitle.textContent = "审查报告";
    els.modalBody.innerHTML = payload.loading
      ? `<div class="empty">正在读取审查归档...</div>`
      : payload.error
        ? `<div class="empty">${escapeHtml(payload.error)}</div>`
        : viewOutput([
            `标题：${record.title}`,
            `状态：${record.status}`,
            `时间：${formatDate(record.createdAt)}`,
            `知识库引用：${(record.knowledgeRefs || []).map((k) => k.title).join("；") || "未使用公司知识库"}`,
            "",
            payload.report || "",
            payload.extracted ? `\n\n--- 抽取文本节选 ---\n${payload.extracted.slice(0, 12000)}` : "",
          ].join("\n"));
    els.modalFooter.innerHTML = `
      <button class="ghost compact-action" type="button" data-modal-action="share-report" ${payload.report ? "" : "disabled"}>发送到对话继续整改</button>
      <button class="ghost compact-action" type="button" data-modal-action="download-record" ${record?.reportPath ? "" : "disabled"}>下载报告</button>
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
    els.fileMeta.textContent = "PDF / DOCX / TXT / MD，最大 200 MB";
    els.statName.textContent = "未选择";
    els.statText.textContent = "0 字";
    els.statKnowledge.textContent = "0 条";
    els.statModel.textContent = "等待";
    els.report.textContent = currentProject() ? "等待上传文档。" : "请先创建公司和项目。";
    els.text.textContent = "尚无抽取文本。";
    updateActionState();
    return;
  }

  els.statName.textContent = selectedFile.name;
  els.fileMeta.textContent = `${selectedFile.name} · ${formatBytes(selectedFile.size)}`;
  els.statText.textContent = "等待抽取";
  els.statKnowledge.textContent = "等待";
  els.statModel.textContent = "等待";

  if (!isSupported(selectedFile)) {
    els.report.textContent = "仅支持 .pdf、.docx、.txt、.md 文件。";
    selectedFile = null;
  } else if (selectedFile.size > MAX_FILE_BYTES) {
    els.report.textContent = `文件过大：${formatBytes(selectedFile.size)}。当前限制为 ${formatBytes(MAX_FILE_BYTES)}。`;
    selectedFile = null;
  } else {
    els.report.textContent = currentProject() ? "已选择文档。" : "请先创建公司和项目。";
    els.text.textContent = "等待抽取文本。";
  }
  updateActionState();
}

function selectKnowledgeFile(file) {
  selectedKnowledgeFile = file || null;
  const meta = $("knowledge-file-meta");
  const title = $("knowledge-title");
  if (!selectedKnowledgeFile) {
    if (meta) meta.textContent = "PDF / DOCX / TXT / MD，最大 200 MB";
    updateActionState();
    return;
  }
  if (meta) meta.textContent = `${selectedKnowledgeFile.name} · ${formatBytes(selectedKnowledgeFile.size)}`;
  if (!isSupported(selectedKnowledgeFile)) {
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

async function uploadFileToPath(runtime, file, path, contentType) {
  setProgress("正在协商源文件上传地址", null);
  const init = await runtime.files.upload_init({
    path,
    content_type: contentType,
    size: file.size,
  });
  const putUrl = init.put_url || init.upload_url;
  if (!putUrl) {
    throw new Error(`files.upload_init 未返回 put_url/upload_url，返回字段：${Object.keys(init || {}).join(", ")}`);
  }
  const put = await putWithProgress(putUrl, file, normalizeHeaders(init.headers), (loaded, total) => {
    const percent = total ? (loaded / total) * 100 : null;
    setProgress(`正在上传源文件 ${formatBytes(loaded)} / ${formatBytes(total || file.size)}`, percent);
  });
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
  const init = await runtime.files.upload_init({
    path,
    content_type: TEXT_UPLOAD_TYPE,
    size: bytes.length,
  });
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
      reject(new Error("文件上传网络失败"));
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
  const link = await runtime.files.download_url({ path });
  const url = link.get_url || link.url || link.download_url;
  if (!url) throw new Error(`files.download_url 未返回可读取链接，返回字段：${Object.keys(link || {}).join(", ")}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`读取文件失败：HTTP ${resp.status}`);
  return resp.text();
}

async function deleteFileQuietly(runtime, path) {
  if (!path) return;
  try {
    await runtime.files.delete({ path });
  } catch {
    // File cleanup is best-effort; indexes remain the source of truth.
  }
}

async function invokeExtractor(runtime, args) {
  let lastError = null;
  for (const toolId of EXECUTA_TOOL_IDS) {
    try {
      const reply = await runtime.tools.invoke({
        tool_id: toolId,
        method: EXECUTA_METHOD,
        args,
        timeoutMs: TOOL_HOST_TIMEOUT_MS,
      }, { timeoutMs: TOOL_CLIENT_TIMEOUT_MS });
      if (reply?.success === false) {
        throw new Error(reply.error || "Executa returned success=false");
      }
      return reply?.data || reply;
    } catch (err) {
      lastError = err;
      if (!isToolWhitelistError(err)) throw err;
    }
  }
  throw lastError || new Error("Document extractor is not available");
}

function isToolWhitelistError(err) {
  const message = errorMessage(err);
  const code = err?.code || err?.error?.code || "";
  return code === "permission_denied" && /not whitelisted by host_api\.tools/i.test(message);
}

function emptyExtractionMessage(extraction) {
  const warnings = Array.isArray(extraction?.warnings) ? extraction.warnings.filter(Boolean) : [];
  const warningText = warnings.length ? `\n\n抽取提示：\n- ${warnings.join("\n- ")}` : "";
  const ocrHint = extraction?.ocr_used
    ? "\n\n已尝试 OCR，但未识别到可分析文本。若在 staging 运行，请确认所选 Agent 已安装 Tesseract 及中文语言包 chi_sim。"
    : "\n\n未检测到 PDF 文本层。若文档是扫描件或图片型 PDF，需要 OCR 能力。";
  return `未抽取到可分析文本，请检查文档是否为扫描件或图片型 PDF。${ocrHint}${warningText}`;
}

async function sourceArgs(runtime, source) {
  if (!source.storagePath) return source.args || {};
  const link = await runtime.files.download_url({ path: source.storagePath });
  const downloadUrl = link.get_url || link.url || link.download_url;
  if (!downloadUrl) {
    throw new Error(`files.download_url 未返回 get_url/url，返回字段：${Object.keys(link || {}).join(", ")}`);
  }
  return { download_url: downloadUrl };
}

function storedSource(contentType, storagePath) {
  return { contentType, storagePath };
}

async function inlineSource(file, contentType) {
  return {
    contentType,
    args: { bytes_b64: await readBlobAsBase64(file) },
  };
}

async function extractStoredDocument(runtime, file, source, processPageLimit = selectedProcessPages()) {
  if (fileExt(file.name) === "pdf") {
    return extractPdfInBatches(runtime, file, source, processPageLimit);
  }
  setProgress(`正在抽取 ${fileExt(file.name).toUpperCase()} 文本`, null);
  return invokeExtractor(runtime, {
    filename: file.name,
    mime_type: source.contentType,
    ...(await sourceArgs(runtime, source)),
    max_chars: MAX_EXTRACT_CHARS,
  });
}

async function extractPdfInBatches(runtime, file, source, processPageLimit) {
  const requestedPages = Math.min(Math.max(1, Number(processPageLimit) || 100), MAX_PROCESS_PAGES);
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
  let currentBatchSize = PAGES_PER_TOOL_CALL;
  const addWarning = (warning) => {
    if (!warningSet.has(warning)) {
      warningSet.add(warning);
      warnings.push(warning);
    }
  };

  while (nextPage && processedPages < requestedPages && totalChars < MAX_EXTRACT_CHARS) {
    const effectiveTotal = Math.min(requestedPages, totalPages || requestedPages);
    const batchPages = Math.min(currentBatchSize, effectiveTotal - processedPages);
    if (batchPages <= 0) break;

    const endLabel = nextPage + batchPages - 1;
    const beforePercent = totalPages
      ? ((nextPage - 1) / Math.min(requestedPages, totalPages)) * 100
      : null;
    setProgress(`正在抽取第 ${nextPage}-${endLabel} 页`, beforePercent);
    els.report.textContent = `正在抽取文档文本：第 ${nextPage}-${endLabel} 页。`;

    let result;
    try {
      result = await invokeExtractor(runtime, {
        filename: file.name,
        mime_type: source.contentType,
        ...(await sourceArgs(runtime, source)),
        max_chars: Math.max(1000, MAX_EXTRACT_CHARS - totalChars),
        max_ocr_pages: batchPages,
        ocr_dpi: OCR_DPI,
        page_start: nextPage,
        page_count: batchPages,
      });
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
        currentBatchSize = PAGES_PER_TOOL_CALL;
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
    currentBatchSize = PAGES_PER_TOOL_CALL;

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
      `已处理 ${Math.min(processedPages, cappedTotal)} / ${cappedTotal} 页`,
      (Math.min(processedPages, cappedTotal) / cappedTotal) * 100,
    );

    if (totalChars >= MAX_EXTRACT_CHARS) {
      addWarning(`抽取文本已达到 ${MAX_EXTRACT_CHARS} 字符上限，提前进入 LLM 分析`);
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

  finishProgress(`文本抽取完成：${Math.min(processedPages, targetPages)} / ${targetPages} 页`);
  return {
    kind: "pdf",
    filename: file.name,
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

function buildPrompt(extraction, knowledgeRefs, textOverride = "", scope = "全文") {
  const text = textOverride || extraction.text || "";
  const knowledgeContext = buildKnowledgeContext(knowledgeRefs);
  const truncated =
    text.length > MAX_LLM_CHARS
      ? `${text.slice(0, MAX_LLM_CHARS)}\n\n[文本已截断：原始 ${text.length} 字符，仅分析前 ${MAX_LLM_CHARS} 字符]`
      : text;
  const project = currentProject();
  return `请审查以下文档内容是否符合网络安全等级保护（等保 2.0）${project?.level || els.level.value}常见要求。

公司：${currentCompany()?.name || "-"}
项目：${project?.name || "-"}
系统名称：${project?.systemName || "-"}
文档类型：${els.docKind.value}
文件名：${selectedFile.name}
分析范围：${scope}

请使用中文输出，结构必须包含：
1. 总体结论：符合 / 部分符合 / 不符合 / 证据不足。
2. 风险等级：高 / 中 / 低，并说明理由。
3. 按控制域列出检查结果，至少覆盖：安全物理环境、安全通信网络、安全区域边界、安全计算环境、安全管理中心、安全管理制度、安全管理机构、安全管理人员、安全建设管理、安全运维管理。
4. 对不符合或证据不足的条目，给出可直接落地的修改建议。
5. 引用上传审查文档中的具体依据，并单独标明公司知识库补充依据；没有依据时写“未在文档中发现”。
6. 最后列出建议补充的佐证材料。

限制：不要声称这是正式测评结论；只基于上传审查文档和公司知识库补充材料判断。

公司知识库补充材料：
${knowledgeContext}

上传审查文档正文：
${truncated}`;
}

function systemPrompt() {
  return "你是资深网络安全等级保护（等保 2.0）文档审查顾问。依据 GB/T 22239-2019《信息安全技术 网络安全等级保护基本要求》的控制域进行文档充分性审查。你必须区分上传审查文档证据、公司知识库补充材料和推断，不能把缺失信息判定为已满足。";
}

async function analyzeWithLlm(extraction, knowledgeRefs, textOverride = "", scope = "全文", maxTokens = 2400) {
  const runtime = await annaReady;
  return runtime.llm.complete({
    systemPrompt: systemPrompt(),
    messages: [
      { role: "user", content: { type: "text", text: buildPrompt(extraction, knowledgeRefs, textOverride, scope) } },
    ],
    maxTokens,
    temperature: 0.2,
  });
}

function splitText(text, maxChars) {
  const chunks = [];
  let offset = 0;
  while (offset < text.length) {
    let end = Math.min(text.length, offset + maxChars);
    if (end < text.length) {
      const boundary = text.lastIndexOf("\n--- 第 ", end);
      if (boundary > offset + maxChars * 0.55) end = boundary;
    }
    chunks.push(text.slice(offset, end).trim());
    offset = end;
  }
  return chunks.filter(Boolean);
}

async function analyzeDocumentWithLlm(extraction, knowledgeRefs) {
  const text = extraction.text || "";
  const chunks = splitText(text, MAX_LLM_CHARS);
  if (chunks.length <= 1) {
    return analyzeWithLlm(extraction, knowledgeRefs, text, "全文", 2400);
  }

  const partialReports = [];
  for (let index = 0; index < chunks.length; index += 1) {
    setProgress(`LLM 分段分析 ${index + 1} / ${chunks.length}`, null);
    els.report.textContent = `正在请求 LLM 分析：第 ${index + 1} / ${chunks.length} 段。`;
    const reply = await analyzeWithLlm(
      extraction,
      knowledgeRefs,
      chunks[index],
      `第 ${index + 1} / ${chunks.length} 段`,
      1800,
    );
    partialReports.push(`--- 分段审查 ${index + 1} / ${chunks.length} ---\n${extractContent(reply)}`);
  }

  setProgress("LLM 正在汇总分段结论", null);
  const runtime = await annaReady;
  const project = currentProject();
  return runtime.llm.complete({
    systemPrompt: systemPrompt(),
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `请把以下分段等保文档审查结果合并为一份最终报告。

要求：
1. 保留总体结论、风险等级、控制域检查结果、修改建议、文档依据、建议补充材料。
2. 合并重复问题，按风险高低排序。
3. 明确哪些结论来自上传审查文档，哪些来自公司知识库补充材料，哪些属于证据不足。
4. 不要声称这是正式测评结论。

公司：${currentCompany()?.name || "-"}
项目：${project?.name || "-"}
系统名称：${project?.systemName || "-"}
保护等级：${project?.level || els.level.value}
文档类型：${els.docKind.value}
处理页数：${extraction.processed_page_count || extraction.page_count || "-"} / ${extraction.page_count || "-"}
使用知识库：${knowledgeRefs.map((k) => k.title).join("；") || "未使用公司知识库"}

分段审查结果：
${partialReports.join("\n\n")}`,
        },
      },
    ],
    maxTokens: 3200,
    temperature: 0.2,
  });
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

async function matchKnowledge(runtime, extraction) {
  const items = knowledgeForCurrentCompany();
  if (!items.length) return [];
  const project = currentProject();
  const seed = [
    extraction.text.slice(0, 80000),
    project?.name || "",
    project?.systemName || "",
    project?.level || "",
    els.docKind.value,
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

async function runAnalysis() {
  const runtime = await annaReady;
  const project = currentProject();
  const company = currentCompany();
  if (!selectedFile || !project || !company) return;
  setBusy(true);
  resetSteps();
  resetProgress();
  els.report.textContent = "正在读取文档。";
  els.text.textContent = "";
  els.statModel.textContent = "等待";

  const recordId = newId("review");
  const safeName = sanitizeFilename(selectedFile.name);
  const basePath = `mlps-review/companies/${company.id}/projects/${project.id}/reviews/${recordId}`;
  const contentType = selectedFile.type || guessMime(selectedFile.name);

  try {
    markStep("extract", "active");
    setProgress("正在上传审查源文件", null);
    const sourceFilePath = await uploadFileToPath(runtime, selectedFile, `${basePath}/source/${safeName}`, contentType);
    const source =
      selectedFile.size <= INLINE_CAP_BYTES
        ? await inlineSource(selectedFile, contentType)
        : storedSource(contentType, sourceFilePath);
    const extraction = await extractStoredDocument(runtime, selectedFile, source);
    latestExtraction = extraction;
    markStep("extract", "done");

    const text = extraction.text || "";
    const warnings = Array.isArray(extraction.warnings) ? [...extraction.warnings] : [];
    els.statText.textContent = `${text.length.toLocaleString("zh-CN")} 字`;

    if (!text.trim()) {
      throw new Error(emptyExtractionMessage(extraction));
    }

    markStep("knowledge", "active");
    setProgress("正在匹配公司知识库", null);
    const knowledgeRefs = await matchKnowledge(runtime, extraction);
    latestKnowledgeRefs = knowledgeRefs;
    els.statKnowledge.textContent = knowledgeRefs.length ? `${knowledgeRefs.length} 条` : "未使用";
    markStep("knowledge", "done");

    els.text.textContent = [
      `文件：${extraction.filename || selectedFile.name}`,
      `类型：${extraction.kind || fileExt(selectedFile.name)}`,
      `页数/段落：${extraction.page_count ?? extraction.paragraph_count ?? extraction.line_count ?? "-"}`,
      extraction.ocr_used ? `OCR：已启用，识别 ${extraction.ocr_page_count || 0} 页，语言 ${extraction.ocr_lang || "-"}` : "",
      knowledgeRefs.length ? `知识库：${knowledgeRefs.map((k) => k.title).join("；")}` : "知识库：未使用公司知识库",
      warnings.length ? `提示：${warnings.join("；")}` : "",
      "",
      text,
    ].filter(Boolean).join("\n");

    setProgress("正在请求 LLM 合规分析", null);
    els.report.textContent = "正在请求 LLM 分析。";
    markStep("analyze", "active");
    const reply = await analyzeDocumentWithLlm(extraction, knowledgeRefs);
    markStep("analyze", "done");

    latestReport = extractContent(reply);
    els.report.textContent = latestReport;
    els.statModel.textContent = reply?.model || "已完成";

    markStep("save", "active");
    const extractedTextPath = `${basePath}/extracted.txt`;
    const reportPath = `${basePath}/report.md`;
    await writeTextFile(runtime, extractedTextPath, text);
    await writeTextFile(runtime, reportPath, latestReport);
    const now = nowIso();
    appState.reviews.unshift({
      id: recordId,
      companyId: company.id,
      projectId: project.id,
      title: `${selectedFile.name} · ${formatDate(now)}`,
      sourceFilePath,
      extractedTextPath,
      reportPath,
      status: "已完成",
      processedPages: extraction.processed_page_count || extraction.page_count || null,
      pageCount: extraction.page_count || null,
      knowledgeRefs: knowledgeRefs.map((k) => ({ id: k.id, title: k.title, score: k.score })),
      params: {
        level: project.level,
        docKind: els.docKind.value,
        maxPages: selectedProcessPages(),
        ocrDpi: OCR_DPI,
      },
      createdAt: now,
      updatedAt: now,
    });
    await saveStateSlice("reviews");
    markStep("save", "done");
    markStep("done", "done");
    finishProgress("审查完成并已归档");

    selectedRecordId = recordId;
    renderRecordList();
    showResultTab("report");
  } catch (err) {
    const active = document.querySelector("#steps li.active");
    if (active) active.classList.add("error");
    els.report.textContent = formatError("analysis", err);
  } finally {
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
        : storedSource(contentType, sourceFilePath);
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
    alert(formatError("knowledge", err));
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
      readTextFile(runtime, record.reportPath),
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
    deleteFileQuietly(runtime, record.sourceFilePath),
    deleteFileQuietly(runtime, record.extractedTextPath),
    deleteFileQuietly(runtime, record.reportPath),
  ]);
  renderRecordList();
  closeModal();
}

async function downloadRecord(id = selectedRecordId) {
  const runtime = await annaReady;
  const record = appState.reviews.find((r) => r.id === id);
  if (!record?.reportPath) return;
  await runtime.files.download({
    path: record.reportPath,
    filename: `${sanitizeFilename(record.title)}.md`,
  });
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
      els.report.textContent = `${content}\n\n${formatError("chat.write_message", err)}`;
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
  await saveIndex();
  renderAll();
}

async function selectProject(id) {
  if (!appState.projects.some((p) => p.id === id && p.companyId === appState.index.selectedCompanyId)) return;
  appState.index.selectedProjectId = id;
  selectedRecordId = null;
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
  appState.companies = appState.companies.filter((c) => c.id !== company.id);
  appState.projects = appState.projects.filter((p) => p.companyId !== company.id);
  appState.knowledge = appState.knowledge.filter((k) => k.companyId !== company.id);
  appState.reviews = appState.reviews.filter((r) => r.companyId !== company.id && !projectIds.has(r.projectId));
  ensureValidSelection();
  await Promise.all([
    saveStateSlice("companies"),
    saveStateSlice("projects"),
    saveStateSlice("knowledge"),
    saveStateSlice("reviews"),
    saveIndex(),
  ]);
  await Promise.all([
    ...knowledge.flatMap((k) => [deleteFileQuietly(runtime, k.sourceFilePath), deleteFileQuietly(runtime, k.textPath)]),
    ...reviews.flatMap((r) => [deleteFileQuietly(runtime, r.sourceFilePath), deleteFileQuietly(runtime, r.extractedTextPath), deleteFileQuietly(runtime, r.reportPath)]),
  ]);
  closeModal();
  renderAll();
}

async function deleteProject(id = modalState.payload?.project?.id || appState.index.selectedProjectId) {
  const runtime = await annaReady;
  const project = appState.projects.find((p) => p.id === id && p.companyId === appState.index.selectedCompanyId);
  if (!project || !confirm(`删除项目「${project.name}」及其审查记录？`)) return;
  const reviews = appState.reviews.filter((r) => r.projectId === project.id);
  appState.projects = appState.projects.filter((p) => p.id !== project.id);
  appState.reviews = appState.reviews.filter((r) => r.projectId !== project.id);
  appState.index.selectedProjectId = projectsForCurrentCompany()[0]?.id || null;
  await Promise.all([saveStateSlice("projects"), saveStateSlice("reviews"), saveIndex()]);
  await Promise.all(reviews.flatMap((r) => [
    deleteFileQuietly(runtime, r.sourceFilePath),
    deleteFileQuietly(runtime, r.extractedTextPath),
    deleteFileQuietly(runtime, r.reportPath),
  ]));
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

function errorMessage(err) {
  return err?.message || err?.error?.message || String(err);
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
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
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

for (const btn of els.navLinks) {
  btn.addEventListener("click", () => showMainTab(btn.dataset.tab));
}
els.companySelect.addEventListener("change", async () => {
  appState.index.selectedCompanyId = els.companySelect.value || null;
  appState.index.selectedProjectId = projectsForCurrentCompany()[0]?.id || null;
  selectedKnowledgeId = null;
  selectedRecordId = null;
  await saveIndex();
  renderAll();
});
els.projectSelect.addEventListener("change", async () => {
  appState.index.selectedProjectId = els.projectSelect.value || null;
  selectedRecordId = null;
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
els.analyze.addEventListener("click", runAnalysis);

for (const table of [els.recordList, els.knowledgeList, els.companyList, els.projectList]) {
  table.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === "view-record") await viewRecord(id);
    if (action === "download-record") await downloadRecord(id);
    if (action === "delete-record") await deleteRecord(id);
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
  if (action === "download-record") await downloadRecord(selectedRecordId);
  if (action === "share-report") {
    await shareReportToChat(modalState.payload?.report || latestReport);
  }
});
els.modalClose.addEventListener("click", closeModal);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.modalBackdrop.hidden) closeModal();
});

selectFile(null);
