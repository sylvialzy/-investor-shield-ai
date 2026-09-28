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

let runToken = 0;
let progressTimer = null;

const REPORTS = {
  "贵州茅台": {
    direction: 0.18,
    intensity: 0.36,
    heat: 128,
    rating: "谨慎观察",
    reason: "公开资讯呈现温和修复信号，但消费复苏、渠道库存和估值压力仍需同时观察，不宜只看单日情绪变化。",
    summary: "本次演示样本中，贵州茅台相关资讯整体偏中性略积极。正向信息主要来自品牌韧性、节庆消费和公司经营预期；负向信息则集中在需求恢复节奏、批价波动和行业竞争。情绪方向没有形成单边趋势，更适合把新闻作为风险排查和观察清单，而不是直接交易信号。",
    strategy: "短线先观察新闻情绪是否连续两日改善，以及平台之间是否出现明显分歧；长线仍应回到收入增速、渠道库存、现金流和估值水平。若只出现单条利好而没有基本面数据配合，建议降低追涨权重。",
    pros: [
      { title: "品牌与经营韧性仍被反复提及", detail: "多平台正向叙事集中于品牌力和现金流预期。" },
      { title: "节庆消费可能带来阶段性关注度", detail: "消费节点附近资讯热度通常会上升，但需要区分热度与真实销量。" },
      { title: "研究样本中的同期情绪为正", detail: "历史样本显示同期情绪相关性为正，但不代表必然上涨。" },
    ],
    cons: [
      { title: "需求恢复仍存在不确定性", detail: "宏观消费与高端白酒动销节奏可能出现错位。" },
      { title: "渠道价格变化会放大情绪波动", detail: "批价和库存等高频信息容易造成短期噪声。" },
      { title: "新闻情绪不能替代估值判断", detail: "情绪改善如果没有盈利预期支撑，持续性有限。" },
    ],
    counts: { "东方财富": 55, "新浪财经": 42, "证券时报": 31 },
    evidence: [
      { source: "东方财富", date: "今日", sentiment: 0.42, title: "消费节点与品牌经营预期相关资讯", reason: "演示数据：归入温和积极信号。" },
      { source: "新浪财经", date: "昨日", sentiment: -0.28, title: "渠道价格与需求恢复节奏相关资讯", reason: "演示数据：归入风险观察。" },
      { source: "证券时报", date: "昨日", sentiment: 0.16, title: "行业政策与资本市场预期相关资讯", reason: "演示数据：归入中性偏积极信号。" },
    ],
  },
  "比亚迪": {
    direction: 0.32,
    intensity: 0.48,
    heat: 154,
    rating: "偏向积极",
    reason: "产品、出海和智能化相关信息形成较强正向叙事，但价格竞争和海外政策变化仍是主要反制因素。",
    summary: "比亚迪的演示样本呈现偏积极情绪，正向信息主要围绕新品、技术能力、海外市场和产业链协同展开。与此同时，价格竞争、行业供给扩张和海外市场政策变化构成主要风险。整体更像是“高热度+高分歧”状态，适合继续追踪信息是否转化为销量与利润。",
    strategy: "短线可以重点观察新品发布、销量数据和海外市场新闻是否连续出现；长线需要把新闻情绪与毛利率、现金流、海外收入占比放在一起判断。对于单条极度乐观的标题，建议先核验原文和数据口径。",
    pros: [
      { title: "新品与技术叙事集中出现", detail: "智能化、平台化和产品迭代带来较高关注度。" },
      { title: "海外业务拓展提供增量想象", detail: "出海相关资讯提升了市场对成长性的讨论。" },
      { title: "研究样本同期相关性较高", detail: "历史样本中情绪变化与股价同期波动关联较明显。" },
    ],
    cons: [
      { title: "价格竞争压缩利润空间", detail: "销量增长与盈利质量并不总是同步。" },
      { title: "海外政策和贸易环境存在变量", detail: "海外扩张需要持续核验政策和交付数据。" },
      { title: "高热度也意味着高波动", detail: "热门叙事容易在预期变化时快速反转。" },
    ],
    counts: { "东方财富": 69, "新浪财经": 47, "证券时报": 38 },
    evidence: [
      { source: "东方财富", date: "今日", sentiment: 0.63, title: "新品与智能化业务相关资讯", reason: "演示数据：归入积极信号。" },
      { source: "新浪财经", date: "今日", sentiment: 0.51, title: "海外市场拓展相关资讯", reason: "演示数据：归入积极信号。" },
      { source: "证券时报", date: "昨日", sentiment: -0.35, title: "行业价格竞争相关资讯", reason: "演示数据：归入风险观察。" },
    ],
  },
  "小米": {
    direction: 0.41,
    intensity: 0.55,
    heat: 176,
    rating: "偏向积极",
    reason: "新品、汽车和生态链相关讨论热度较高，正向叙事占优，但预期较满，需防范兑现落差。",
    summary: "小米的演示报告显示出较强的正向新闻情绪。市场关注点集中于新品发布、汽车业务、智能生态与品牌年轻化。由于热点密度高，信息传播速度快，情绪指标可能比基本面变化更敏感，因此本结果适合作为“新闻风险雷达”，不应被理解为自动买卖信号。",
    strategy: "短线关注新品发布后的真实销量、交付量和用户反馈；长线观察汽车业务投入产出、生态协同和现金流。若多个平台同时出现极度一致的乐观标题，反而建议增加对原始数据和利益相关方的核验。",
    pros: [
      { title: "新品与生态协同带动关注度", detail: "消费电子、汽车与IoT叙事互相强化。" },
      { title: "品牌讨论具有较强传播性", detail: "高传播性有利于形成市场关注，但也会放大波动。" },
      { title: "平台覆盖较完整", detail: "三个财经平台均有可用于交叉核验的演示样本。" },
    ],
    cons: [
      { title: "预期较高，兑现落差需要警惕", detail: "关注度不等于销售或利润。" },
      { title: "新业务投入可能影响短期利润", detail: "成长叙事要与现金流和费用投入一起看。" },
      { title: "热点切换速度快", detail: "单日舆情容易受到发布会和社交传播影响。" },
    ],
    counts: { "东方财富": 74, "新浪财经": 61, "证券时报": 41 },
    evidence: [
      { source: "东方财富", date: "今日", sentiment: 0.72, title: "新品与智能生态相关资讯", reason: "演示数据：归入积极信号。" },
      { source: "新浪财经", date: "今日", sentiment: 0.48, title: "汽车业务交付与市场关注相关资讯", reason: "演示数据：归入积极信号。" },
      { source: "证券时报", date: "昨日", sentiment: -0.22, title: "新业务投入与竞争环境相关资讯", reason: "演示数据：归入风险观察。" },
    ],
  },
  "宁德时代": {
    direction: 0.25,
    intensity: 0.43,
    heat: 142,
    rating: "中性偏积极",
    reason: "产业链和储能需求带来正面支持，但行业价格压力与海外扩张不确定性仍未消失。",
    summary: "宁德时代的演示样本整体偏积极，但利好与风险并存。正向信息来自储能、新技术和产业链地位；风险则来自电池行业竞争、原材料价格与海外业务环境。综合情绪适合解释为“基本面关注度较高”，而不是单向趋势判断。",
    strategy: "优先观察出货量、储能订单、海外产能与毛利率等可验证指标。短线若出现情绪快速上升，应避免把行业新闻直接等同于公司盈利改善；长线判断则需结合技术迭代和客户结构。",
    pros: [
      { title: "储能需求提供第二增长曲线", detail: "储能相关资讯改善了市场对需求结构的预期。" },
      { title: "技术与产业链地位稳定", detail: "公司在产业链中的影响力仍是重要正向叙事。" },
      { title: "同期情绪与股价存在正向关系", detail: "历史样本可用于观察情绪同步变化。" },
    ],
    cons: [
      { title: "行业竞争和价格压力仍在", detail: "需求增长不一定完全转化为利润增长。" },
      { title: "原材料价格带来成本变量", detail: "成本端变化可能造成预期快速调整。" },
      { title: "海外扩张面临政策差异", detail: "跨市场经营需要持续核验落地进度。" },
    ],
    counts: { "东方财富": 62, "新浪财经": 45, "证券时报": 35 },
    evidence: [
      { source: "东方财富", date: "今日", sentiment: 0.44, title: "储能需求与订单预期相关资讯", reason: "演示数据：归入积极信号。" },
      { source: "新浪财经", date: "昨日", sentiment: 0.27, title: "电池技术与产业链地位相关资讯", reason: "演示数据：归入中性偏积极。" },
      { source: "证券时报", date: "昨日", sentiment: -0.31, title: "行业价格竞争相关资讯", reason: "演示数据：归入风险观察。" },
    ],
  },
  "药明康德": {
    direction: 0.29,
    intensity: 0.51,
    heat: 133,
    rating: "谨慎观察",
    reason: "业务修复和创新服务相关信息偏积极，但外部政策、订单能见度和估值波动需要单独核验。",
    summary: "药明康德的演示样本中，情绪波动比单纯方向更值得关注。正向资讯集中于订单、创新服务与行业需求修复；风险信息则更多来自外部政策、全球业务环境和客户结构变化。该类公司容易受到政策与事件驱动影响，新闻研判应与公告和财务数据交叉验证。",
    strategy: "短线关注政策、订单和机构观点是否出现连续同向变化；长线则重点看订单转化、客户结构、研发服务能力和现金流。任何单一来源的重大利好或利空都建议打开原文后再判断。",
    pros: [
      { title: "创新服务需求仍有讨论度", detail: "行业恢复与服务能力是主要正向叙事。" },
      { title: "事件驱动信息较丰富", detail: "丰富的资讯有利于开展风险识别。" },
      { title: "历史样本敏感度较高", detail: "研究结果显示其对舆情变化相对敏感。" },
    ],
    cons: [
      { title: "政策变化可能改变预期", detail: "外部环境需要单独追踪，不能只看公司新闻。" },
      { title: "订单与利润之间存在时滞", detail: "新闻热度可能早于财务兑现。" },
      { title: "事件驱动容易放大波动", detail: "情绪指标应和仓位纪律一起使用。" },
    ],
    counts: { "东方财富": 57, "新浪财经": 39, "证券时报": 37 },
    evidence: [
      { source: "东方财富", date: "今日", sentiment: 0.49, title: "创新服务和行业需求修复相关资讯", reason: "演示数据：归入积极信号。" },
      { source: "新浪财经", date: "昨日", sentiment: -0.4, title: "外部政策与业务环境相关资讯", reason: "演示数据：归入风险观察。" },
      { source: "证券时报", date: "昨日", sentiment: 0.12, title: "订单能见度与经营预期相关资讯", reason: "演示数据：归入中性偏积极。" },
    ],
  },
};

const DEFAULT_REPORT = {
  direction: 0.08,
  intensity: 0.31,
  heat: 96,
  rating: "中性观察",
  reason: "当前没有对应的专项样本，已用通用风险识别框架生成演示报告。实际使用时请补充真实新闻数据。",
  summary: "这是一个可直接在浏览器中体验的演示版本。输入任意股票名称后，页面会用“新闻来源—情绪方向—风险观察—策略提示”的结构展示结果。当前版本使用内置示例数据，不连接真实资讯网站，也不会自动生成投资建议。",
  strategy: "先确认公司名称和新闻原文，再区分事实、观点和情绪化标题。将新闻研判与公告、财报、估值、成交量和自身风险承受能力结合，不因为单条标题追涨杀跌。",
  pros: [
    { title: "先建立信息核验习惯", detail: "同一事件至少交叉查看两个来源。" },
    { title: "把情绪和事实分开", detail: "标题的乐观或悲观不等于经营结果。" },
    { title: "用连续变化替代单点判断", detail: "观察情绪是否持续，而不是只看一条新闻。" },
  ],
  cons: [
    { title: "当前为内置演示数据", detail: "结果用于展示交互，不代表实时行情。" },
    { title: "没有接入个人账户或交易接口", detail: "页面不会替用户下单。" },
    { title: "不要把相关性当成因果关系", detail: "历史统计关系不能保证未来收益。" },
  ],
  counts: { "东方财富": 38, "新浪财经": 32, "证券时报": 26 },
  evidence: [
    { source: "东方财富", date: "演示", sentiment: 0.24, title: "公司经营与行业趋势示例资讯", reason: "内置样本：用于展示依据卡片。" },
    { source: "新浪财经", date: "演示", sentiment: -0.18, title: "市场风险与估值变化示例资讯", reason: "内置样本：用于展示风险提示。" },
    { source: "证券时报", date: "演示", sentiment: 0.05, title: "政策环境与资本市场示例资讯", reason: "内置样本：用于展示交叉核验。" },
  ],
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showView(name) {
  elements.searchView.classList.toggle("is-hidden", name !== "search");
  elements.progressView.classList.toggle("is-hidden", name !== "progress");
  elements.reportView.classList.toggle("is-hidden", name !== "report");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderSources(sourceStatus = {}) {
  elements.sourceList.innerHTML = SOURCE_NAMES.map((name) => {
    const status = sourceStatus[name] || {};
    return `<div class="source-row"><span class="source-name"><i class="${escapeHtml(status.state || "waiting")}"></i>${name}</span><span class="source-detail">${escapeHtml(status.message || "等待中")}</span></div>`;
  }).join("");
}

function renderWarnings(warnings = []) {
  elements.warningList.innerHTML = warnings.map((warning) => `<div class="warning-item">提示：${escapeHtml(warning)}</div>`).join("");
}

function renderInsightList(target, items = [], risk = false) {
  $(target).innerHTML = items.map((item, index) => `<div class="insight-row"><div class="insight-index ${risk ? "risk" : ""}">${index + 1}</div><div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.detail)}</p></div></div>`).join("");
}

function renderDistribution(counts = {}) {
  const total = Math.max(1, Object.values(counts).reduce((sum, count) => sum + Number(count || 0), 0));
  $("#platformDistribution").innerHTML = SOURCE_NAMES.map((name) => {
    const count = Number(counts[name] || 0);
    const percent = Math.round((count / total) * 100);
    return `<div class="distribution-row"><div class="distribution-head"><span>${name}</span><strong>${count} 条</strong></div><div class="distribution-track"><div class="distribution-fill" style="width:${percent}%"></div></div></div>`;
  }).join("");
}

function renderEvidence(items = []) {
  $("#evidenceList").innerHTML = items.map((item) => `<article class="evidence-item"><div class="evidence-head"><span>${escapeHtml(item.source)} · ${escapeHtml(item.date)}</span><strong>${Number(item.sentiment) > 0 ? "+" : ""}${Number(item.sentiment).toFixed(2)}</strong></div><div class="evidence-title">${escapeHtml(item.title)}</div><p>${escapeHtml(item.reason)}</p></article>`).join("");
}

function renderReport(stock, data) {
  const direction = Number(data.direction || 0);
  const directionLabel = direction > 0.2 ? "偏向积极" : direction < -0.2 ? "偏向消极" : "中性观察";
  $("#reportStock").textContent = stock;
  $("#reportMeta").textContent = `内置演示样本 · ${data.heat} 条资讯 · 3 个平台`;
  $("#directionValue").textContent = `${direction > 0 ? "+" : ""}${direction.toFixed(2)}`;
  $("#directionLabel").textContent = directionLabel;
  $("#scalePin").style.left = `${Math.max(2, Math.min(98, (direction + 1) * 50))}%`;
  $("#intensityValue").textContent = Number(data.intensity).toFixed(2);
  $("#heatValue").textContent = data.heat;
  $("#coverageValue").textContent = "3 / 3";
  $("#decisionRating").textContent = data.rating;
  $("#decisionReason").textContent = data.reason;
  $("#summaryText").textContent = data.summary;
  $("#strategyText").textContent = data.strategy;
  $("#legalNote").textContent = "本页面是课程研究成果的网页版演示。当前使用内置示例数据，不构成投资建议，也不连接交易账户。";
  renderInsightList("#prosList", data.pros);
  renderInsightList("#consList", data.cons, true);
  renderDistribution(data.counts);
  renderEvidence(data.evidence);
  $("#modelInfo").innerHTML = `<p>分析框架：三平台资讯聚合、标题情绪判断、平台分布观察与风险提示。</p><p>方向分：${direction.toFixed(2)}；情绪强度：${Number(data.intensity).toFixed(2)}。</p><p>当前为无需后端的单页演示版，真实部署时可将本地数据源或 API 接入同一界面。</p>`;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function startAnalysis(stock) {
  const cleaned = stock.trim();
  if (!cleaned) return;
  runToken += 1;
  const token = runToken;
  elements.formError.textContent = "";
  elements.submitButton.disabled = true;
  elements.progressStock.textContent = cleaned;
  elements.progressNumber.textContent = "0";
  elements.progressFill.style.width = "0%";
  renderSources(Object.fromEntries(SOURCE_NAMES.map((name) => [name, { state: "waiting", message: "等待中" }])));
  renderWarnings(["当前是网页版演示模式，使用内置研究样本。"]);
  showView("progress");

  const stages = [
    ["东方财富", "正在整理标题与日期", 22],
    ["新浪财经", "正在交叉核验资讯", 47],
    ["证券时报", "正在计算平台情绪", 68],
  ];
  for (const [source, message, progress] of stages) {
    if (token !== runToken) return;
    const status = Object.fromEntries(SOURCE_NAMES.map((name) => [name, { state: name === source ? "running" : name === SOURCE_NAMES[SOURCE_NAMES.indexOf(source) - 1] ? "completed" : "waiting", message: name === source ? message : name === SOURCE_NAMES[SOURCE_NAMES.indexOf(source) - 1] ? "已完成" : "等待中" }]));
    renderSources(status);
    elements.progressMessage.textContent = message;
    elements.progressNumber.textContent = progress;
    elements.progressFill.style.width = `${progress}%`;
    await wait(520);
  }
  if (token !== runToken) return;
  elements.progressMessage.textContent = "正在生成风险提示与研判报告";
  elements.progressNumber.textContent = "92";
  elements.progressFill.style.width = "92%";
  renderSources(Object.fromEntries(SOURCE_NAMES.map((name) => [name, { state: "completed", message: "已完成" }])));
  await wait(650);
  if (token !== runToken) return;
  elements.progressNumber.textContent = "100";
  elements.progressFill.style.width = "100%";
  await wait(240);
  renderReport(cleaned, REPORTS[cleaned] || DEFAULT_REPORT);
  showView("report");
  elements.submitButton.disabled = false;
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
  runToken += 1;
  elements.submitButton.disabled = false;
  showView("search");
});

$("#newAnalysisButton").addEventListener("click", () => {
  elements.stockInput.value = "";
  elements.submitButton.disabled = false;
  showView("search");
  elements.stockInput.focus();
});

$("#metricHelpButton").addEventListener("click", (event) => {
  const help = $("#metricHelp");
  const hidden = help.classList.toggle("is-hidden");
  event.currentTarget.setAttribute("aria-expanded", String(!hidden));
});

elements.serviceState.className = "service-state online";
elements.serviceState.lastElementChild.textContent = "网页版演示可用";
renderSources();
