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

function createProfileRenderer() {
  function buildSection(label, value) {
    return `<div class="item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function buildList(items) {
    if (!items?.length) return `<div class="list empty">暂无</div>`;
    return `<div class="list">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;
  }

  function buildCooldowns(cooldowns = {}) {
    return Object.entries(cooldowns).map(([label, value]) => buildSection(label, value)).join("");
  }

  function buildHtml(profile) {
    const tipsHtml = profile.tips?.length
      ? `<ul>${profile.tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")}</ul>`
      : "";
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      margin: 0;
      font-family: "PingFang SC","Segoe UI",Arial,sans-serif;
      background: #0b1321;
      color: #f8f9fa;
    }
    .profile-container {
      width: 820px;
      margin: 24px auto;
      padding: 28px 32px 36px;
      background: linear-gradient(135deg,#13223d,#090f1c);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 30px 60px rgba(0,0,0,0.45);
    }
    h1 {
      margin: 0;
      font-size: 28px;
    }
    .subtitle {
      color: #adb5bd;
      margin: 4px 0 24px;
    }
    .section {
      margin-top: 20px;
      padding: 18px 20px;
      border-radius: 16px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
    }
    .section h2 {
      margin: 0 0 12px;
      font-size: 18px;
      color: #74c0fc;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill,minmax(220px,1fr));
      gap: 12px;
    }
    .item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
      font-size: 14px;
    }
    .item span {
      color: #adb5bd;
    }
    .item strong {
      font-size: 16px;
      color: #ffd43b;
    }
    .list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .list span {
      background: rgba(255,255,255,0.08);
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 14px;
    }
    .list.empty {
      color: #868e96;
    }
    ul {
      margin: 0;
      padding-left: 20px;
      color: #cfd4da;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="profile-container">
    <h1>${escapeHtml(profile.nickname)} 的信息</h1>
    <p class="subtitle">最后活跃：${escapeHtml(profile.lastActive || "刚刚")}</p>

    <div class="section">
      <h2>资产总览</h2>
      <div class="grid">
        ${buildSection("余额", `${profile.balance} 金币`)}
        ${buildSection("存款", `${profile.deposit}/${profile.depositLimit}`)}
        ${buildSection("当前身价", `${profile.price} 金币`)}
        ${buildSection("财富等级", profile.creditLevel)}
        ${buildSection("信用等级", profile.loanCreditLevel)}
        ${buildSection("当前贷款", `${profile.loanBalance} / ${profile.loanLimit}`)}
        ${buildSection("剩余额度", profile.availableLoan)}
        ${buildSection("牛马主", profile.masterInfo || "自由人")}
      </div>
    </div>

    <div class="section">
      <h2>资产详情</h2>
      <div class="grid">
        ${buildSection("牛马数量", profile.employeeCount || 0)}
        ${buildSection("保镖状态", profile.bodyguardInfo || "无")}
        ${buildSection("福利收益", profile.welfareIncome || 0)}
        ${buildSection("培训等级", profile.trainingLevel || 1)}
        ${buildSection("福利等级", profile.welfareLevel || 1)}
      </div>
      <h3>牛马列表</h3>
      ${buildList(profile.slaveList)}
    </div>

    <div class="section">
      <h2>冷却状态</h2>
      <div class="grid">
        ${buildCooldowns(profile.cooldowns)}
      </div>
    </div>

    <div class="section">
      <h2>作物与特殊状态</h2>
      <div class="grid">
        ${buildSection("作物状态", profile.cropInfo || "未种植")}
        ${buildSection("监狱状态", profile.prisonInfo || "自由")}
      </div>
    </div>

    <div class="section">
      <h2>提升建议</h2>
      ${tipsHtml}
    </div>
  </div>
</body>
</html>`;
  }

  async function renderProfileCard(ctx, profile) {
    const html = buildHtml(profile);
    const page = await ctx.puppeteer.page();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const container = await page.$(".profile-container");
    const screenshot = await container.screenshot();
    await page.close();
    return h.image(screenshot, "image/png");
  }

  return { renderProfileCard };
}

module.exports = { createProfileRenderer };
