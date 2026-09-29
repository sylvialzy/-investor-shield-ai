const API_BASE = window.INVESTOR_SHIELD_API_BASE || "http://127.0.0.1:8000";
const SOURCE_NAMES = ["东方财富", "新浪财经", "证券时报"];

const $ = (selector) => document.querySelector(selector);
const elements = {
  searchView: $("#searchView"),
  progressView: $("#progressView"),
  reportView: $("#reportView"),
  serviceState: $("#serviceState"),
  form: $("#analysisForm"),
  stockInput: $("#stockInput"),
  submitButton: $("#submitButton"),
  formError: $("#formError"),
  progressStock: $("#progressStock"),
  progressMessage: $("#progressMessage"),
  progressNumber: $("#progressNumber"),
  progressFill: $("#progressFill"),
  sourceList: $("#sourceList"),
  warningList: $("#warningList"),
};

let pollTimer = null;
let activeJobId = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function friendlyError(message) {
  const text = String(message || "本次分析未完成");
  if (text.includes("cannot create default profile directory")) {
    return "浏览器采集服务启动失败，请稍后重试。";
  }
  if (text.includes("Could not reach host")) {
    return "暂时无法连接资讯采集服务，请检查网络后重试。";
  }
  if (text.includes("DEEPSEEK_API_KEY")) {
    return "AI 分析服务尚未配置，请先填写 DeepSeek API Key。";
  }
  return text.split(/\r?\n/)[0].slice(0, 180);
}

function showView(name) {
  elements.searchView.classList.toggle("is-hidden", name !== "search");
  elements.progressView.classList.toggle("is-hidden", name !== "progress");
  elements.reportView.classList.toggle("is-hidden", name !== "report");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.data ? JSON.stringify(options.data) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || "分析服务请求失败");
  return payload;
}

async function checkService() {
  try {
    await api("/api/health");
    elements.serviceState.className = "service-state online";
    elements.serviceState.lastElementChild.textContent = "分析服务已连接";
  } catch {
    elements.serviceState.className = "service-state offline";
    elements.serviceState.lastElementChild.textContent = "分析服务未启动";
  }
}

function renderSources(sourceStatus = {}) {
  elements.sourceList.innerHTML = SOURCE_NAMES.map((name) => {
    const status = sourceStatus[name] || {};
    const state = status.status || "waiting";
    const message = status.message || "等待中";
    return `
      <div class="source-row">
        <span class="source-name"><i class="${escapeHtml(state)}"></i>${escapeHtml(name)}</span>
        <span class="source-detail">${escapeHtml(message)}</span>
      </div>`;
  }).join("");
}

function renderWarnings(warnings = []) {
  elements.warningList.innerHTML = warnings
    .map((warning) => `<div class="warning-item">提示：${escapeHtml(warning)}</div>`)
    .join("");
}

function stopPolling() {
  if (pollTimer) window.clearInterval(pollTimer);
  pollTimer = null;
}

async function pollJob() {
  if (!activeJobId || pollJob.running) return;
  pollJob.running = true;
  try {
    const job = await api(`/api/analyses/${activeJobId}`);
    elements.progressNumber.textContent = job.progress || 0;
    elements.progressFill.style.width = `${job.progress || 0}%`;
    elements.progressMessage.textContent = job.message || "正在分析";
    renderSources(job.source_status);
    renderWarnings(job.warnings);

    if (job.status === "completed") {
      stopPolling();
      renderReport(job.result);
      showView("report");
    }
    if (job.status === "failed") {
      stopPolling();
      showView("search");
      elements.formError.textContent = friendlyError(job.error);
      elements.submitButton.disabled = false;
      elements.submitButton.querySelector("span").textContent = "重新开始分析";
    }
  } catch (error) {
    stopPolling();
    showView("search");
    elements.formError.textContent = friendlyError(error.message);
    elements.submitButton.disabled = false;
  } finally {
    pollJob.running = false;
  }
}

async function startAnalysis(stock) {
  const cleaned = stock.trim();
  if (!cleaned) return;
  stopPolling();
  elements.formError.textContent = "";
  elements.submitButton.disabled = true;
  elements.progressStock.textContent = cleaned;
  elements.progressMessage.textContent = "正在创建分析任务";
  elements.progressNumber.textContent = "0";
  elements.progressFill.style.width = "0%";
  renderSources();
  renderWarnings();
  showView("progress");

  try {
    const job = await api("/api/analyses", { method: "POST", data: { stock: cleaned } });
    activeJobId = job.id;
    await pollJob();
    pollTimer = window.setInterval(pollJob, 1800);
  } catch (error) {
    showView("search");
    elements.formError.textContent = friendlyError(error.message);
    elements.submitButton.disabled = false;
  }
}

function renderInsightList(target, items = [], risk = false) {
  $(target).innerHTML = items.map((item, index) => {
    const title = typeof item === "string" ? item : item.title;
    const detail = typeof item === "string" ? "" : item.detail;
    return `
      <div class="insight-row">
        <div class="insight-index ${risk ? "risk" : ""}">${index + 1}</div>
        <div><h4>${escapeHtml(title)}</h4><p>${escapeHtml(detail)}</p></div>
      </div>`;
  }).join("");
}

function renderDistribution(counts = {}) {
  const total = Math.max(1, Object.values(counts).reduce((sum, count) => sum + Number(count || 0), 0));
  $("#platformDistribution").innerHTML = SOURCE_NAMES.map((name) => {
    const count = Number(counts[name] || 0);
    const percent = Math.round((count / total) * 100);
    return `
      <div class="distribution-row">
        <div class="distribution-head"><span>${escapeHtml(name)}</span><strong>${count} 条</strong></div>
        <div class="distribution-track"><div class="distribution-fill" style="width:${percent}%"></div></div>
      </div>`;
  }).join("");
}

function renderEvidence(items = []) {
  $("#evidenceList").innerHTML = items.map((item) => `
    <article class="evidence-item">
      <div class="evidence-head">
        <span>${escapeHtml(item.source)} · ${escapeHtml(item.date)}</span>
        <strong>${Number(item.sentiment || 0) > 0 ? "+" : ""}${Number(item.sentiment || 0).toFixed(2)}</strong>
      </div>
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
      <p>${escapeHtml(item.reason)}</p>
    </article>
  `).join("");
}

function renderReport(result) {
  const metrics = result.metrics || {};
  const report = result.report || {};
  const model = result.model_info || {};
  const direction = Number(metrics.direction || 0);
  const signedDirection = `${direction > 0 ? "+" : ""}${direction.toFixed(2)}`;

  $("#reportStock").textContent = result.stock;
  $("#reportMeta").textContent = `基于 ${metrics.heat || 0} 条有效资讯 · 已过滤 ${metrics.filtered_count || 0} 条`;
  $("#directionValue").textContent = signedDirection;
  $("#directionLabel").textContent = metrics.direction_label || "中性";
  $("#scalePin").style.left = `${Math.max(2, Math.min(98, (direction + 1) * 50))}%`;
  $("#intensityValue").textContent = Number(metrics.intensity || 0).toFixed(2);
  $("#heatValue").textContent = metrics.heat || 0;
  $("#coverageValue").textContent = metrics.platform_coverage || 0;
  $("#decisionRating").textContent = report.decision?.rating || "谨慎观察";
  $("#decisionReason").textContent = report.decision?.reason || "暂无研判说明";
  $("#summaryText").textContent = report.summary || "暂无综述";
  $("#strategyText").textContent = report.strategy || "暂无策略观察";
  $("#legalNote").textContent = model.notice || "结果用于资讯整理和研究展示，不构成投资建议。";

  renderInsightList("#prosList", report.pros || []);
  renderInsightList("#consList", report.cons || [], true);
  renderDistribution(metrics.platform_counts || {});
  renderEvidence(result.evidence || []);
  $("#modelInfo").innerHTML = `
    <p>新闻范围：严格保留今天和昨天两个自然日；平台优先按时间排序，并对每条新闻日期再次校验。</p>
    <p>${escapeHtml(model.normalization)}</p>
    <p>时间权重：当日 0.937，前一日 0.063。</p>
    <p>平台权重：东方财富 0.5，证券时报 0.3，新浪财经 0.2。</p>
    <p>新浪财经已适配新版公开搜索页，无需登录即可获取公开结果。</p>
    <p>${escapeHtml(model.cleaning)}</p>
    <p>旧版原始总分：${escapeHtml(metrics.raw_score)}；归一化方向分：${escapeHtml(metrics.direction)}。</p>`;
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  startAnalysis(elements.stockInput.value);
});

document.querySelectorAll("[data-stock]").forEach((button) => {
  button.addEventListener("click", () => {
    elements.stockInput.value = button.dataset.stock;
    elements.stockInput.focus();
  });
});

$("#cancelButton").addEventListener("click", () => {
  stopPolling();
  activeJobId = null;
  elements.submitButton.disabled = false;
  showView("search");
});

$("#newAnalysisButton").addEventListener("click", () => {
  activeJobId = null;
  elements.stockInput.value = "";
  elements.submitButton.disabled = false;
  elements.submitButton.querySelector("span").textContent = "开始智能分析";
  showView("search");
  elements.stockInput.focus();
});

$("#metricHelpButton").addEventListener("click", (event) => {
  const help = $("#metricHelp");
  const hidden = help.classList.toggle("is-hidden");
  event.currentTarget.setAttribute("aria-expanded", String(!hidden));
});

function registerWebMcp() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  try {
    void Promise.resolve(context.registerTool({
      name: "analyze_stock_news",
      title: "分析股票新闻情绪",
      description: "输入股票名称，在当前网页中启动财经新闻抓取、情绪分析和研判报告生成。",
      inputSchema: {
        type: "object",
        properties: { stock: { type: "string", minLength: 1, maxLength: 30 } },
        required: ["stock"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input) {
        if (!input || typeof input.stock !== "string" || !input.stock.trim()) {
          throw new Error("stock 必须是非空股票名称");
        }
        elements.stockInput.value = input.stock.trim();
        await startAnalysis(input.stock);
        return { status: "started", stock: input.stock.trim() };
      },
    })).catch(() => {});
  } catch {}
}

renderSources();
checkService();
registerWebMcp();
