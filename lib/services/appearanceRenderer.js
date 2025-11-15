const { h } = require("koishi");

function createAppearanceRenderer() {
  const qualityMap = {
    normal: { label: "普通", color: "#adb5bd" },
    rare: { label: "稀有", color: "#74c0fc" },
    epic: { label: "史诗", color: "#ffd43b" },
    legendary: { label: "传说", color: "#ff6b6b" },
  };

  const typeLabelMap = {
    clothes: "衣服",
    accessories: "配饰",
    hairstyle: "发型",
    makeup: "妆容",
  };

  function renderItems(group) {
    if (!group.items.length) return '<div class="empty">暂无装扮</div>';
    return `<div class="item-grid">${group.items
      .map((item) => {
        const quality = qualityMap[item.quality] || qualityMap.normal;
        return `<div class="item-card">
            <div class="item-header">
              <h3>${item.name}</h3>
              <span class="tag" style="color:${quality.color};border-color:${quality.color};">${quality.label}</span>
            </div>
            <p class="desc">${item.description}</p>
            <div class="meta">
              <span>💰 ${item.price} 金币</span>
              <span>✨ 身价 +${item.priceBonus}</span>
            </div>
            <div class="status ${item.owned ? "owned" : ""}">${item.owned ? "已拥有" : "可购买"}</div>
          </div>`;
      })
      .join("")}</div>`;
  }

  function buildHtml(payload) {
    const groupsHtml = payload.groups
      .map((group) => {
        const title = typeLabelMap[group.type] || group.type;
        return `<section class="group">
          <h2>${title}</h2>
          ${renderItems(group)}
        </section>`;
      })
      .join("");

    const tipsHtml = `<ul class="tips">${payload.tips
      .map((tip) => `<li>${tip}</li>`)
      .join("")}</ul>`;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      margin: 0;
      font-family: "PingFang SC","Segoe UI",Arial,sans-serif;
      background: #070b18;
      color: #f8f9fa;
    }
    .shop-container {
      width: 860px;
      margin: 24px auto;
      padding: 30px 32px 36px;
      background: linear-gradient(135deg,#101830,#060912);
      border-radius: 28px;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 40px 80px rgba(0,0,0,0.55);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 30px;
    }
    .subtitle {
      margin: 0 0 24px;
      color: #adb5bd;
    }
    .group {
      margin-top: 20px;
      padding: 18px 20px;
      border-radius: 20px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
    }
    .group h2 {
      margin: 0 0 12px;
      font-size: 20px;
      color: #74c0fc;
    }
    .item-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill,minmax(240px,1fr));
      gap: 12px;
    }
    .item-card {
      padding: 14px 16px;
      border-radius: 16px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .item-header h3 {
      margin: 0;
      font-size: 18px;
    }
    .tag {
      font-size: 13px;
      border: 1px solid;
      border-radius: 999px;
      padding: 2px 10px;
    }
    .desc {
      margin: 0;
      color: #c5c8cf;
      min-height: 40px;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      color: #ffd43b;
      font-weight: 600;
    }
    .status {
      text-align: center;
      padding: 6px 0;
      border-radius: 12px;
      background: rgba(255,255,255,0.06);
      color: #74c0fc;
    }
    .status.owned {
      background: rgba(116,192,252,0.15);
      color: #51cf66;
    }
    .empty {
      color: #868e96;
      padding: 8px 0;
    }
    .tips {
      margin: 12px 0 0;
      padding-left: 20px;
      color: #cfd4da;
    }
    .tips li {
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  <div class="shop-container">
    <h1>装扮商店</h1>
    <p class="subtitle">装扮可提升身价、福利与外观。已购装扮会显示“已拥有”。</p>
    ${groupsHtml}
    <section class="group">
      <h2>购买提示</h2>
      ${tipsHtml}
    </section>
  </div>
</body>
</html>`;
  }

  async function renderShopCard(ctx, payload) {
    const html = buildHtml(payload);
    const page = await ctx.puppeteer.page();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const container = await page.$(".shop-container");
    const screenshot = await container.screenshot();
    await page.close();
    return h.image(screenshot, "image/png");
  }

  return { renderShopCard };
}

module.exports = { createAppearanceRenderer };
