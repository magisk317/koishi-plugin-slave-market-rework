const { ensureSufficientBalance, calculatePurchaseTax, creditSystemAccount } = require("../utils/economy");
const { isWealthProtected, invalidateWealthCache } = require("../utils/wealthProtection");
const { h } = require("koishi");
const overrideConfirmations = new Map();
const OVERRIDE_CONFIRMATION_WINDOW = 60 * 1e3;

const crops = [
  {
    emoji: "🥬",
    name: "生菜",
    price: 200,
    growthTime: 0.5,
    harvestPrice: 360,
    description: "适合新人练手，成本低"
  },
  {
    emoji: "🥒",
    name: "黄瓜",
    price: 260,
    growthTime: 0.6,
    harvestPrice: 400,
    description: "消暑爽脆，适合稳定收益"
  },
  {
    emoji: "🍅",
    name: "番茄",
    price: 320,
    growthTime: 0.8,
    harvestPrice: 520,
    description: "常见作物，收益平稳"
  },
  {
    emoji: "🥕",
    name: "胡萝卜",
    price: 380,
    growthTime: 1,
    harvestPrice: 600,
    description: "中级作物，适合过渡"
  },
  {
    emoji: "🌶️",
    name: "辣椒",
    price: 440,
    growthTime: 1.1,
    harvestPrice: 660,
    description: "辛辣刺激，市场需求高"
  },
  {
    emoji: "🍆",
    name: "茄子",
    price: 500,
    growthTime: 1.3,
    harvestPrice: 720,
    description: "需要一点时间，但收益还行"
  },
  {
    emoji: "🥔",
    name: "土豆",
    price: 560,
    growthTime: 1.5,
    harvestPrice: 820,
    description: "稳定产出，适合长期栽培"
  },
  {
    emoji: "🌾",
    name: "小麦",
    price: 620,
    growthTime: 1.8,
    harvestPrice: 900,
    description: "粮食基石，用途广泛"
  },
  {
    emoji: "🌽",
    name: "玉米",
    price: 680,
    growthTime: 2,
    harvestPrice: 980,
    description: "产量稳定，收益不错"
  },
  {
    emoji: "🎃",
    name: "南瓜",
    price: 740,
    growthTime: 2.2,
    harvestPrice: 1100,
    description: "秋季应景，可观赏可烹饪"
  },
  {
    emoji: "🍚",
    name: "水稻",
    price: 800,
    growthTime: 2.5,
    harvestPrice: 1200,
    description: "生长较慢，收益稳定"
  },
  {
    emoji: "🍠",
    name: "红薯",
    price: 860,
    growthTime: 2.7,
    harvestPrice: 1300,
    description: "耐粗放管理，易于保鲜"
  },
  {
    emoji: "🫘",
    name: "大豆",
    price: 920,
    growthTime: 2.9,
    harvestPrice: 1400,
    description: "油料蛋白双丰收"
  },
  {
    emoji: "🍓",
    name: "草莓",
    price: 1000,
    growthTime: 3,
    harvestPrice: 1550,
    description: "口感甜美，市场热度高"
  },
  {
    emoji: "🍇",
    name: "葡萄",
    price: 1100,
    growthTime: 3.2,
    harvestPrice: 1650,
    description: "藤蔓精品，可酿酒可鲜食"
  },
  {
    emoji: "🍍",
    name: "菠萝",
    price: 1250,
    growthTime: 3.5,
    harvestPrice: 1850,
    description: "热带风味，收益渐高"
  },
  {
    emoji: "🍵",
    name: "茶叶",
    price: 1400,
    growthTime: 3.8,
    harvestPrice: 2050,
    description: "东方茗香，讲究采摘时机"
  },
  {
    emoji: "☕",
    name: "咖啡豆",
    price: 1550,
    growthTime: 4.2,
    harvestPrice: 2250,
    description: "慢慢培育，回报稳定"
  },
  {
    emoji: "🍬",
    name: "甘蔗",
    price: 1700,
    growthTime: 4.5,
    harvestPrice: 2450,
    description: "制糖要材，生长周期较长"
  },
  {
    emoji: "🍄",
    name: "黑松露",
    price: 2000,
    growthTime: 6,
    harvestPrice: 3200,
    description: "稀有作物，生长慢但收益极高"
  }
];

const cropDisasters = [
  {
    type: "气象灾害",
    name: "干旱",
    description: "长期缺水导致土壤墒情不足，作物枯萎、减产甚至绝收。"
  },
  {
    type: "气象灾害",
    name: "洪涝",
    description: "暴雨导致农田积水，作物烂根或被冲走。"
  },
  {
    type: "气象灾害",
    name: "台风/飓风",
    description: "强风摧毁作物并伴随暴雨引发次生灾害。"
  },
  {
    type: "气象灾害",
    name: "冰雹",
    description: "砸伤叶片果实，造成机械损伤或绝收。"
  },
  {
    type: "气象灾害",
    name: "霜冻与低温",
    description: "倒春寒或早霜影响作物生长与品质。"
  },
  {
    type: "气象灾害",
    name: "高温热害",
    description: "持续高温导致蒸腾过度、花粉败育。"
  },
  {
    type: "地质灾害",
    name: "泥石流/滑坡",
    description: "山区暴雨后引发，冲毁农田或灌溉设施。"
  },
  {
    type: "地质灾害",
    name: "土壤侵蚀",
    description: "强风或暴雨带走表层肥土，降低产能。"
  },
  {
    type: "生物灾害",
    name: "虫害爆发",
    description: "大规模虫群啃食作物，导致大幅减产。"
  },
  {
    type: "生物灾害",
    name: "病害蔓延",
    description: "真菌/细菌/病毒爆发，影响作物健康。"
  },
  {
    type: "生物灾害",
    name: "鼠害/鸟害",
    description: "啃食种子果实或幼苗，破坏收成。"
  },
  {
    type: "生物灾害",
    name: "入侵物种",
    description: "缺乏天敌的外来物种迅速扩散破坏农作物。"
  }
];
const DEFAULT_DISASTER_PROBABILITY = 0.25;

function formatCropLabel(crop) {
  return `${crop.emoji ?? "🌱"} ${crop.name}`.trim();
}

function padCell(text, length) {
  const str = String(text ?? "");
  const plainLength = Array.from(str).length;
  return plainLength >= length ? str : str + " ".repeat(length - plainLength);
}

function formatGrowthTime(hours) {
  const num = Number(hours) || 0;
  return `${Number.isInteger(num) ? num.toFixed(0) : num.toFixed(1)}h`;
}

function buildCropGalleryText(list = crops) {
  const table = [
    "┌────┬────────────┬──────┬──────┬──────┐",
    `│ ${padCell("序号", 4)} │ ${padCell("作物", 12)} │ ${padCell("成本", 6)} │ ${padCell("成长", 6)} │ ${padCell("产值", 6)} │`,
    "├────┼────────────┼──────┼──────┼──────┤",
    ...list.map((crop, index) => {
      const idx = String(index + 1).padStart(2, "0");
      const priceLabel = `${crop.price}`;
      const harvestLabel = `${crop.harvestPrice}`;
      return `│ ${padCell(idx, 4)} │ ${padCell(formatCropLabel(crop), 12)} │ ${padCell(priceLabel, 6)} │ ${padCell(formatGrowthTime(crop.growthTime), 6)} │ ${padCell(harvestLabel, 6)} │`;
    }),
    "└────┴────────────┴──────┴──────┴──────┘"
  ];
  const descBlock = list.map((crop, index) => `#${String(index + 1).padStart(2, "0")} ${formatCropLabel(crop)} - ${crop.description}`).join("\n");
  const tableText = `🖼️ 作物图鉴
${table.join("\n")}`;
  const descText = `📋 描述：
${descBlock}
（发送“种地 作物名”即可种植）`;
  return {
    fullText: `${tableText}
${descText}`,
    sections: [tableText, descText]
  };
}

function buildCropGalleryHtml(list = crops) {
  const cards = list.map((crop, index) => {
    const idx = String(index + 1).padStart(2, "0");
    return `<div class="card">
      <div class="card-header">
        <div class="index">#${idx}</div>
        <div class="emoji">${crop.emoji ?? "🌱"}</div>
        <div class="name">${crop.name}</div>
      </div>
      <div class="stats">
        <div><span>成本</span><strong>${crop.price}</strong></div>
        <div><span>成长</span><strong>${formatGrowthTime(crop.growthTime)}</strong></div>
        <div><span>产值</span><strong>${crop.harvestPrice}</strong></div>
      </div>
      <p class="desc">${crop.description}</p>
    </div>`;
  }).join("");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Noto Sans SC","Microsoft YaHei",sans-serif;
      margin: 0;
      padding: 16px;
      background: #f2f5f9;
      color: #1f2937;
    }
    .gallery-container {
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 16px 40px rgba(15,23,42,0.12);
      border: 1px solid rgba(99,102,241,0.2);
    }
    h1 {
      margin: 0 0 12px;
      font-size: 28px;
      color: #312e81;
    }
    .sub-title {
      margin: 0 0 24px;
      color: #6b7280;
      font-size: 14px;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .card {
      background: linear-gradient(145deg, #ffffff, #f9fafb);
      border-radius: 18px;
      padding: 16px;
      border: 1px solid rgba(59,130,246,0.2);
      box-shadow: 0 12px 20px rgba(15,23,42,0.08);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .emoji {
      font-size: 24px;
    }
    .index {
      font-weight: 700;
      color: #6366f1;
      font-size: 14px;
    }
    .name {
      font-weight: 700;
      font-size: 18px;
      color: #0f172a;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 12px;
    }
    .stats strong {
      display: block;
      font-size: 16px;
      color: #111827;
    }
    .desc {
      margin: 0;
      font-size: 13px;
      color: #4b5563;
      line-height: 1.4;
    }
    .footer {
      margin-top: 20px;
      padding: 12px 16px;
      background: #eef2ff;
      border-radius: 12px;
      color: #4338ca;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="gallery-container">
    <h1>农场作物图鉴</h1>
    <p class="sub-title">覆盖基础到稀有的 20 种作物，搭配南瓜等经典农作物。使用「种地 作物名」即可种植。</p>
    <div class="card-grid">
      ${cards}
    </div>
    <div class="footer">提示：天气与季节会影响成长时间及产值，记得查看「作物状态」。</div>
  </div>
</body>
</html>`;
}

async function renderCropGallery(ctx, session, list = crops) {
  const textInfo = buildCropGalleryText(list);
  const supportsFigure = session && ["red", "onebot"].includes(session.platform);
  let figureMessage = null;
  if (supportsFigure) {
    const nodes = textInfo.sections.map((section) =>
      h("message", { userId: session?.userId || session?.selfId || "" }, section)
    );
    figureMessage = h("figure", {}, nodes);
  }
  return { figure: figureMessage, text: textInfo.fullText };
}

function createFarmModule(deps) {
  const {
    setupMessageRecall,
    checkTaxBeforeCommand,
    isAdmin,
    formatCostTip,
    getUser,
    registrationGuide,
    transactionService,
    shopEffects
  } = deps;
  const applyIncomeBoost = shopEffects?.applyIncomeBoost
    ? shopEffects.applyIncomeBoost
    : async (ctx, user, amount) => ({ amount, active: false, multiplier: 1 });
  const applyTaxWaiverHelper = shopEffects?.applyTaxWaiver
    ? shopEffects.applyTaxWaiver
    : async (ctx, session, user, fee) => ({ amount: fee, waived: false, tip: "" });

  async function plantCrop(ctx, config, session, cropName) {
    let user = await getUser(ctx, session.userId, session);
    if (!user) return registrationGuide();
    const now = Date.now();
    if (user.currentCrop) {
      const entry = overrideConfirmations.get(user.userId);
      if (!entry || now - entry.time > OVERRIDE_CONFIRMATION_WINDOW || entry.cropName !== cropName) {
        overrideConfirmations.set(user.userId, { time: now, cropName });
        return `🌱 你的地里已经种着 ${user.currentCrop}，若要覆盖之前的作物，请再次发送「种地 ${cropName}」确认。`;
      }
      overrideConfirmations.delete(user.userId);
    } else {
      overrideConfirmations.delete(user.userId);
    }
    const weatherStatus = ctx.weatherService.getWeatherStatus();
    if (now - user.lastFarmTime < config.种地冷却) {
      const remainingTime = Math.ceil((config.种地冷却 - (now - user.lastFarmTime)) / 1e3 / 60);
      return `种地CD中,还需要等待${remainingTime}分钟`;
    }
    const crop = crops.find((c) => c.name === cropName);
    if (!crop) {
      const gallery = await renderCropGallery(ctx, session);
      return `找不到作物"${cropName}"
${gallery.text}`;
    }
    const privileged = isAdmin(ctx, config, user.userId, session);
    const wealthProtected = await isWealthProtected(ctx, session, user);
    let purchaseTax = privileged ? 0 : calculatePurchaseTax(config, crop.price, user, { wealthProtected });
    let waiverTip = "";
    if (!privileged && purchaseTax > 0) {
      const waiver = await applyTaxWaiverHelper(ctx, session, user, purchaseTax, { label: `${crop.name} 种植税金` });
      purchaseTax = waiver.amount;
      waiverTip = waiver.tip;
    }
    const totalCost = privileged ? crop.price : crop.price + purchaseTax;
    let autoWithdrawNotice = "";
    if (!privileged) {
      const cover = await ensureSufficientBalance(ctx, user, totalCost, { privileged });
      user = cover.user;
      autoWithdrawNotice = cover.notice;
    }
    if (!privileged && user.balance < totalCost) {
      const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
      return `余额不足,需要${totalCost}金币${notice}`;
    }
    const updatedBalance = privileged ? user.balance : user.balance - totalCost;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: updatedBalance,
      lastFarmTime: now,
      currentCrop: crop.name,
      cropStartTime: now
    });
    invalidateWealthCache(session);
    if (!privileged && totalCost > 0) {
      await transactionService?.logTransaction(ctx, { ...user, balance: updatedBalance }, {
        direction: "expense",
        category: transactionService?.categories.FARM_SEED,
        amount: totalCost,
        description: `购买作物：${formatCropLabel(crop)}${purchaseTax > 0 ? "（含税）" : ""}`,
        balanceAfter: updatedBalance
      });
      if (purchaseTax > 0) {
        await creditSystemAccount(ctx, purchaseTax);
        await ctx.taxService?.recordTax(session, purchaseTax);
      }
    }
    const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
    const taxTip = purchaseTax > 0 ? `\n💸 税金：${purchaseTax}金币` : "";
    overrideConfirmations.delete(user.userId);
    return `种植成功！
作物: ${formatCropLabel(crop)}
💰 花费：${formatCostTip(privileged, totalCost)}${taxTip}
当前天气: ${weatherStatus.weatherEffect.name}
当前季节: ${weatherStatus.seasonEffect.name}
温度: ${weatherStatus.temperature}°C
生长速度: ${(ctx.weatherService.getCropGrowthRate() * 100).toFixed(0)}%
生长时间: ${Math.ceil(crop.growthTime / ctx.weatherService.getCropGrowthRate())}小时
预计收获: ${crop.harvestPrice}金币
请等待作物生长完成后使用"收获"指令${notice}${waiverTip}`;
  }

  async function harvestCrop(ctx, config, session) {
    const user = await getUser(ctx, session.userId, session);
    if (!user) return registrationGuide();
    if (!user.currentCrop) {
      return "你还没有种植任何作物";
    }
    const crop = crops.find((c) => c.name === user.currentCrop);
    if (!crop) return "作物数据错误";
    const now = Date.now();
    const growthTime = (now - user.cropStartTime) / (1e3 * 60 * 60);
    if (growthTime < crop.growthTime) {
      const remainingTime = Math.ceil((crop.growthTime - growthTime) * 60);
      return `作物还未成熟,还需要等待${remainingTime}分钟`;
    }
    const weatherStatus = ctx.weatherService.getWeatherStatus();
    const weatherRate = ctx.weatherService.getCropGrowthRate();
    const weatherAdjustedHarvest = Math.floor(crop.harvestPrice * weatherRate);
    const disasterProbability = config?.天灾概率 ?? DEFAULT_DISASTER_PROBABILITY;
    const disaster = maybeTriggerDisaster(disasterProbability);
    let finalHarvest = weatherAdjustedHarvest;
    let disasterTip = "";
    if (disaster) {
      const lossRate = disaster.lossRate;
      const reductionPercent = Math.round(lossRate * 100);
      const lossAmount = Math.max(1, Math.floor(weatherAdjustedHarvest * lossRate));
      finalHarvest = Math.max(0, weatherAdjustedHarvest - lossAmount);
      disasterTip = `⚠️ 天灾来袭：${disaster.type}·${disaster.name}
${disaster.description}
减产幅度：-${reductionPercent}%
灾后收获：${finalHarvest}金币`;
    }
    const boostInfo = await applyIncomeBoost(ctx, user, finalHarvest, { source: "farm_harvest" });
    finalHarvest = boostInfo?.amount ?? finalHarvest;
    const updatedBalance = user.balance + finalHarvest;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: updatedBalance,
      currentCrop: null,
      cropStartTime: 0
    });
    if (finalHarvest > 0) {
      const harvestDesc = disaster ? `灾后收成 ${disaster.name}` : "收成收益";
      await transactionService?.logTransaction(ctx, { ...user, balance: updatedBalance }, {
        direction: "income",
        category: transactionService?.categories.FARM_HARVEST,
        amount: finalHarvest,
        description: `${harvestDesc}（${formatCropLabel(crop)}）`,
        balanceAfter: updatedBalance
      });
    }
    const boostTip = boostInfo?.active ? `\n🔥 收益翻倍卡生效：收益x${boostInfo.multiplier}` : "";
    return `收获成功！
作物: ${formatCropLabel(crop)}
当前天气: ${weatherStatus.weatherEffect.name}
当前季节: ${weatherStatus.seasonEffect.name}
温度: ${weatherStatus.temperature}°C
生长速度: ${(weatherRate * 100).toFixed(0)}%
基础收获: ${crop.harvestPrice}金币
天气修正后: ${weatherAdjustedHarvest}金币
${disasterTip || "无天灾影响，本次收成安全"}
实际入账: ${finalHarvest}金币
当前余额: ${user.balance + finalHarvest}${boostTip}`;
  }

  async function cropStatus(ctx, config, session) {
    const user = await getUser(ctx, session.userId, session);
    if (!user) return registrationGuide();
    if (!user.currentCrop) {
      return "你还没有种植任何作物";
    }
    const crop = crops.find((c) => c.name === user.currentCrop);
    if (!crop) return "作物数据错误";
    const now = Date.now();
    const growthTime = (now - user.cropStartTime) / (1e3 * 60 * 60);
    const remainingTime = Math.ceil((crop.growthTime - growthTime) * 60);
    const weatherStatus = ctx.weatherService.getWeatherStatus();
    const weatherRate = ctx.weatherService.getCropGrowthRate();
    return `=== 作物状态 ===
作物: ${formatCropLabel(crop)}
当前天气: ${weatherStatus.weatherEffect.name}
当前季节: ${weatherStatus.seasonEffect.name}
温度: ${weatherStatus.temperature}°C
生长速度: ${(weatherRate * 100).toFixed(0)}%
基础生长时间: ${crop.growthTime}小时
实际生长时间: ${(crop.growthTime / weatherRate).toFixed(1)}小时
预计收获: ${crop.harvestPrice}金币
实际收获: ${Math.floor(crop.harvestPrice * weatherRate)}金币
剩余时间: ${remainingTime}分钟`;
  }

  function registerFarmCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");
    slaveCommand.subcommand("种地 <cropName:string>", "种植指定作物").alias("种植").action(async ({ session }, cropName) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      if (!cropName) {
        const gallery = await renderCropGallery(ctx, session);
        if (gallery.figure) {
          try {
            await respond(gallery.figure);
            return;
          } catch (error) {
            ctx.logger?.warn?.(`[slave-market] crop figure send failed: ${error.message}`);
          }
        }
        return await respond(gallery.text);
      }
      const result = await plantCrop(ctx, config, session, cropName);
      if (typeof result === "object" && result?.error) {
        const gallery = result.gallery || await renderCropGallery(ctx, session);
        await respond(result.error);
        if (gallery.figure) {
          try {
            await respond(gallery.figure);
            return;
          } catch (error) {
            ctx.logger?.warn?.(`[slave-market] crop figure send failed: ${error.message}`);
          }
        }
        await respond(gallery.text);
        return;
      }
      return await respond(result);
    });
    slaveCommand.subcommand("收获", "收获已成熟的作物").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await harvestCrop(ctx, config, session));
    });
    slaveCommand.subcommand("作物状态", "查看当前种植的作物状态")
      .alias("作物信息")
      .alias("农场状态")
      .action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await cropStatus(ctx, config, session));
    });
  }

  return {
    registerFarmCommands,
    harvest: harvestCrop,
    formatCropLabel,
    crops
  };
}

function maybeTriggerDisaster(probability = DEFAULT_DISASTER_PROBABILITY) {
  if (Math.random() >= probability) return null;
  const template = cropDisasters[Math.floor(Math.random() * cropDisasters.length)];
  if (!template) return null;
  const lossRate = 0.3 + Math.random() * 0.4;
  return {
    ...template,
    lossRate
  };
}

module.exports = { createFarmModule };
