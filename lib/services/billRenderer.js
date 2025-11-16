const { h } = require("koishi");

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAmount(value) {
  return `${Number(value).toLocaleString("zh-CN")} 金币`;
}

function buildDetailRows(entries = []) {
  if (!entries.length) {
    return `<tr class="empty"><td colspan="4">暂无账单记录</td></tr>`;
  }
  return entries
    .map((entry) => {
      const directionLabel = entry.direction === "income" ? "收入" : "支出";
      const amountClass = entry.direction === "income" ? "income" : "expense";
      const description = entry.description?.trim() || entry.categoryLabel;
      return `<tr>
        <td class="dir ${amountClass}">${directionLabel}</td>
        <td class="cat">${escapeHtml(entry.categoryLabel)}</td>
        <td class="desc">${escapeHtml(description)}</td>
        <td class="amt ${amountClass}">${escapeHtml(formatAmount(entry.amount))}</td>
      </tr>
      <tr class="time-row">
        <td colspan="4">${escapeHtml(entry.timeLabel)}</td>
      </tr>`;
    })
    .join("");
}

function buildSummaryList(summary = []) {
  if (!summary.length) {
    return `<div class="summary-empty">暂无分类数据</div>`;
  }
  return summary
    .map(
      (item) => `<div class="summary-item">
    <span class="dot" style="background:${item.color}"></span>
    <div class="info">
      <strong>${escapeHtml(item.label)}</strong>
      <p>${escapeHtml(item.tip)}</p>
    </div>
  </div>`
    )
    .join("");
}

function buildHtml(data) {
  const detailJson = escapeHtml(JSON.stringify(data.entries ?? []));
  const summaryJson = escapeHtml(JSON.stringify(data.summary ?? []));
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "PingFang SC","Segoe UI",Arial,sans-serif;
      background: transparent;
      color: #e9ecef;
    }
    .bill-card {
      width: 900px;
      margin: 24px auto;
      padding: 28px 32px 36px;
      border-radius: 28px;
      background: radial-gradient(circle at top, rgba(68,119,255,0.18), rgba(3,5,20,0.95)),
        linear-gradient(135deg,#0f1424,#05070f 80%);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 35px 60px rgba(0,0,0,0.55);
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    header h1 {
      font-size: 28px;
      margin: 0;
    }
    header p {
      margin: 4px 0 0;
      color: #adb5bd;
      font-size: 14px;
    }
    .filters {
      color: #91a7ff;
      font-size: 14px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.3fr 0.7fr;
      gap: 20px;
    }
    .panel {
      border-radius: 20px;
      background: rgba(10,13,28,0.8);
      border: 1px solid rgba(255,255,255,0.05);
      padding: 20px;
    }
    .panel h2 {
      margin: 0 0 16px;
      font-size: 18px;
      color: #74c0fc;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      font-size: 14px;
      color: #ced4da;
    }
    tr:last-child td { border-bottom: none; }
    tr.time-row td {
      padding-top: 0;
      font-size: 12px;
      color: #5c677d;
      border-bottom: none;
    }
    tr.empty td {
      text-align: center;
      color: #5c677d;
      padding: 40px 0;
    }
    .dir { width: 70px; font-weight: 600; }
    .cat { width: 120px; color: #dee2e6; }
    .desc { width: 330px; color: #f8f9fa; }
    .amt { width: 160px; text-align: right; font-weight: 600; }
    .income { color: #8ce99a; }
    .expense { color: #ffa8a8; }
    .summary-board {
      margin-top: 16px;
    }
    .summary-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px dashed rgba(255,255,255,0.05);
    }
    .summary-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }
    .summary-item strong {
      font-size: 15px;
      color: #fff;
    }
    .summary-item p {
      margin: 2px 0 0;
      font-size: 13px;
      color: #adb5bd;
    }
    .summary-empty {
      color: #5c677d;
      font-size: 14px;
      text-align: center;
      padding: 40px 0 20px;
    }
    canvas {
      max-width: 100%;
      height: 320px;
    }
    .totals {
      display: flex;
      gap: 24px;
      font-size: 14px;
      color: #adb5bd;
      margin-top: 12px;
    }
    .totals strong {
      display: block;
      font-size: 18px;
      margin-bottom: 4px;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="bill-card">
    <header>
      <div>
        <h1>${escapeHtml(data.title)}</h1>
        <p>${escapeHtml(data.subtitle)}</p>
      </div>
      <div class="filters">${escapeHtml(data.filterText || "")}</div>
    </header>
    <div class="grid">
      <section class="panel">
        <h2>账单明细</h2>
        <table>${buildDetailRows(data.entries)}</table>
      </section>
      <section class="panel">
        <h2>分类统计</h2>
        <div class="totals">
          <div>
            <span>累计收入</span>
            <strong class="income">${escapeHtml(formatAmount(data.totalIncome || 0))}</strong>
          </div>
          <div>
            <span>累计支出</span>
            <strong class="expense">${escapeHtml(formatAmount(data.totalExpense || 0))}</strong>
          </div>
        </div>
        <canvas id="bill-chart"></canvas>
        <div class="summary-board">
          ${buildSummaryList(data.summary)}
        </div>
      </section>
    </div>
  </div>
  <script id="bill-data" type="application/json">${detailJson}</script>
  <script id="bill-summary" type="application/json">${summaryJson}</script>
  <script>
    const detailEntries = JSON.parse(document.getElementById("bill-data").textContent || "[]");
    const summaryEntries = JSON.parse(document.getElementById("bill-summary").textContent || "[]");
    const palette = ["#f783ac","#4dabf7","#ffd43b","#63e6be","#b197fc","#ffa94d","#ff8787","#69db7c","#a5d8ff","#ffe066"];
    const ctx = document.getElementById("bill-chart").getContext("2d");
    const values = summaryEntries.map((entry, index) => ({
      value: entry.value,
      label: entry.label,
      color: entry.color || palette[index % palette.length]
    }));
    const chartData = values.length ? values : [{ value: 1, label: "暂无数据", color: "#495057" }];
    const chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: chartData.map((item) => item.label),
        datasets: [{
          data: chartData.map((item) => item.value),
          backgroundColor: chartData.map((item) => item.color),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        cutout: "60%",
        animation: {
          duration: 600,
          onComplete() {
            window.__billChartReady = true;
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
    if (!summaryEntries.length) {
      window.__billChartReady = true;
    }
  </script>
</body>
</html>`;
}

function createBillRenderer() {
  async function renderBillCard(ctx, data) {
    const html = buildHtml(data);
    const page = await ctx.puppeteer.page();
    await page.setViewport({ width: 940, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.waitForFunction("window.__billChartReady === true", { timeout: 3e3 }).catch(() => {});
    const container = await page.$(".bill-card");
    const screenshot = await container.screenshot({ omitBackground: false });
    await page.close();
    return h.image(screenshot, "image/png");
  }

  return { renderBillCard };
}

module.exports = { createBillRenderer };
