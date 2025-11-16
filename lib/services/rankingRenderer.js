const { h } = require("koishi");

function escapeHtml(content) {
  if (content == null) return "";
  return String(content)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createRankingRenderer() {
  function buildRows(entries) {
    if (!entries?.length) {
      return `<tr><td colspan="3" class="empty">暂无数据</td></tr>`;
    }
    return entries
      .map((entry, index) => {
        const rank = index + 1;
        const medalClass = rank <= 3 ? `medal medal-${rank}` : "medal";
        return `<tr>
          <td class="${medalClass}">${rank}</td>
          <td class="nickname">${escapeHtml(entry.nickname)}</td>
          <td class="value">${escapeHtml(entry.value)}</td>
        </tr>`;
      })
      .join("");
  }

  function buildHtml(data) {
    const rows = buildRows(data.entries);
    const subtitle = data.subtitle ? `<p class="subtitle">${escapeHtml(data.subtitle)}</p>` : "";
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      margin: 0;
      background: linear-gradient(135deg,#0f111a,#090b13);
      font-family: "PingFang SC","Segoe UI",Arial,sans-serif;
      color: #f8f9fa;
    }
    .rank-container {
      width: 760px;
      margin: 24px auto;
      padding: 28px 32px;
      background: rgba(8,12,20,0.9);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 25px 60px rgba(0,0,0,0.45);
    }
    h1 {
      margin: 0;
      font-size: 26px;
      letter-spacing: 1px;
    }
    .subtitle {
      margin: 6px 0 24px;
      color: #adb5bd;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 14px 12px;
      text-align: left;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      font-size: 16px;
    }
    th {
      color: #adb5bd;
      font-weight: 500;
    }
    .medal {
      width: 60px;
      text-align: center;
      font-weight: bold;
    }
    .medal-1 {
      color: #ffd43b;
    }
    .medal-2 {
      color: #a5d8ff;
    }
    .medal-3 {
      color: #ffc078;
    }
    .nickname {
      font-weight: 600;
      color: #f8f9fa;
    }
    .value {
      color: #94d82d;
      text-align: right;
    }
    .empty {
      text-align: center;
      color: #868e96;
      padding: 40px 0;
    }
  </style>
</head>
<body>
  <div class="rank-container">
    <h1>${escapeHtml(data.title)}</h1>
    ${subtitle}
    <table>
      <thead>
        <tr>
          <th style="width:60px;">排名</th>
          <th>玩家</th>
          <th style="text-align:right;">数据</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  }

  async function renderRankingBoard(ctx, data) {
    try {
      const html = buildHtml(data);
      const page = await ctx.puppeteer.page();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const container = await page.$(".rank-container");
      const screenshot = await container.screenshot();
      await page.close();
      return h.image(screenshot, "image/png");
    } catch (error) {
      ctx.logger?.warn?.(`[slave-market] ranking render failed: ${error.message}`);
      return null;
    }
  }

  return { renderRankingBoard };
}

module.exports = { createRankingRenderer };
