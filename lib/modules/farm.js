const { ensureSufficientBalance } = require("../utils/economy");

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

function renderCropGallery(list = crops) {
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
  return `🖼️ 作物图鉴
${table.join("\n")}
📋 描述：
${descBlock}
（发送“种地 作物名”即可种植）`;
}

function createFarmModule(deps) {
  const {
    setupMessageRecall,
    checkTaxBeforeCommand,
    isAdmin,
    formatCostTip,
    getUser,
    registrationGuide,
    transactionService
  } = deps;

  async function plantCrop(ctx, config, session, cropName) {
    let user = await getUser(ctx, session.userId, session);
    if (!user) return registrationGuide();
    if (!cropName) {
      return renderCropGallery();
    }
    const weatherStatus = ctx.weatherService.getWeatherStatus();
    const now = Date.now();
    if (now - user.lastFarmTime < config.种地冷却) {
      const remainingTime = Math.ceil((config.种地冷却 - (now - user.lastFarmTime)) / 1e3 / 60);
      return `种地CD中,还需要等待${remainingTime}分钟`;
    }
    const crop = crops.find((c) => c.name === cropName);
    if (!crop) {
      return `找不到作物"${cropName}"
${renderCropGallery()}`;
    }
    const privileged = isAdmin(ctx, config, user.userId, session);
    let autoWithdrawNotice = "";
    if (!privileged) {
      const cover = await ensureSufficientBalance(ctx, user, crop.price, { privileged });
      user = cover.user;
      autoWithdrawNotice = cover.notice;
    }
    if (!privileged && user.balance < crop.price) {
      const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
      return `余额不足,需要${crop.price}金币${notice}`;
    }
    const updatedBalance = privileged ? user.balance : user.balance - crop.price;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: updatedBalance,
      lastFarmTime: now,
      currentCrop: crop.name,
      cropStartTime: now
    });
    if (!privileged && crop.price > 0) {
      await transactionService?.logTransaction(ctx, { ...user, balance: updatedBalance }, {
        direction: "expense",
        category: transactionService?.categories.FARM_SEED,
        amount: crop.price,
        description: `购买作物：${formatCropLabel(crop)}`,
        balanceAfter: updatedBalance
      });
    }
    const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
    return `种植成功！
作物: ${formatCropLabel(crop)}
💰 花费：${formatCostTip(privileged, crop.price)}
当前天气: ${weatherStatus.weatherEffect.name}
当前季节: ${weatherStatus.seasonEffect.name}
温度: ${weatherStatus.temperature}°C
生长速度: ${(ctx.weatherService.getCropGrowthRate() * 100).toFixed(0)}%
生长时间: ${Math.ceil(crop.growthTime / ctx.weatherService.getCropGrowthRate())}小时
预计收获: ${crop.harvestPrice}金币
请等待作物生长完成后使用"收获"指令${notice}`;
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
当前余额: ${user.balance + finalHarvest}`;
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
      return await respond(await plantCrop(ctx, config, session, cropName));
    });
    slaveCommand.subcommand("收获", "收获已成熟的作物").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await harvestCrop(ctx, config, session));
    });
    slaveCommand.subcommand("作物状态", "查看当前种植的作物状态").action(async ({ session }) => {
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
