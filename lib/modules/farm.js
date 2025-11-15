const crops = [
  {
    emoji: "🥬",
    name: "生菜",
    price: 100,
    growthTime: 0.5,
    harvestPrice: 180,
    description: "适合新人练手，成本低"
  },
  {
    emoji: "🍅",
    name: "番茄",
    price: 250,
    growthTime: 0.8,
    harvestPrice: 420,
    description: "常见作物，收益平稳"
  },
  {
    emoji: "🥕",
    name: "胡萝卜",
    price: 380,
    growthTime: 1.2,
    harvestPrice: 520,
    description: "中级作物，适合过渡"
  },
  {
    emoji: "🍆",
    name: "茄子",
    price: 450,
    growthTime: 1.5,
    harvestPrice: 650,
    description: "需要一点时间，但收益还行"
  },
  {
    emoji: "🥔",
    name: "土豆",
    price: 520,
    growthTime: 1.8,
    harvestPrice: 820,
    description: "稳定产出，适合长期栽培"
  },
  {
    emoji: "🌽",
    name: "玉米",
    price: 720,
    growthTime: 2.5,
    harvestPrice: 950,
    description: "产量稳定，收益不错"
  },
  {
    emoji: "🍚",
    name: "水稻",
    price: 600,
    growthTime: 3.8,
    harvestPrice: 1100,
    description: "高级作物，生长较慢，收益高"
  },
  {
    emoji: "🍉",
    name: "西瓜",
    price: 900,
    growthTime: 4.5,
    harvestPrice: 1700,
    description: "夏季限定，一次性收益高"
  },
  {
    emoji: "🍄",
    name: "黑松露",
    price: 1500,
    growthTime: 6,
    harvestPrice: 2800,
    description: "稀有作物，生长慢但收益极高"
  }
];

function formatCropLabel(crop) {
  return `${crop.emoji ?? "🌱"} ${crop.name}`.trim();
}

function createFarmModule(deps) {
  const {
    setupMessageRecall,
    checkTaxBeforeCommand,
    isAdmin,
    formatCostTip,
    getUser,
    registrationGuide
  } = deps;

  async function plantCrop(ctx, config, session, cropName) {
    const user = await getUser(ctx, session.userId, session);
    if (!user) return registrationGuide();
    const weatherStatus = ctx.weatherService.getWeatherStatus();
    if (weatherStatus.weather === "stormy" /* STORMY */) {
      return "暴风雨天气不适合种植，请等待天气好转";
    }
    const now = Date.now();
    if (now - user.lastFarmTime < config.种地冷却) {
      const remainingTime = Math.ceil((config.种地冷却 - (now - user.lastFarmTime)) / 1e3 / 60);
      return `种地CD中,还需要等待${remainingTime}分钟`;
    }
    const crop = crops.find((c) => c.name === cropName);
    if (!crop) {
      return `找不到作物"${cropName}"
可用作物:
${crops.map((c) => `${formatCropLabel(c)} - ${c.price}金币 (${c.description})`).join("\n")}`;
    }
    const privileged = isAdmin(ctx, config, user.userId, session);
    if (!privileged && user.balance < crop.price) {
      return `余额不足,需要${crop.price}金币`;
    }
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: privileged ? user.balance : user.balance - crop.price,
      lastFarmTime: now,
      currentCrop: crop.name,
      cropStartTime: now
    });
    return `种植成功！
作物: ${formatCropLabel(crop)}
💰 花费：${formatCostTip(privileged, crop.price)}
当前天气: ${weatherStatus.weatherEffect.name}
当前季节: ${weatherStatus.seasonEffect.name}
温度: ${weatherStatus.temperature}°C
生长速度: ${(ctx.weatherService.getCropGrowthRate() * 100).toFixed(0)}%
生长时间: ${Math.ceil(crop.growthTime / ctx.weatherService.getCropGrowthRate())}小时
预计收获: ${crop.harvestPrice}金币
请等待作物生长完成后使用"收获"指令`;
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
    const actualHarvestPrice = Math.floor(crop.harvestPrice * weatherRate);
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: user.balance + actualHarvestPrice,
      currentCrop: null,
      cropStartTime: 0
    });
    return `收获成功！
作物: ${formatCropLabel(crop)}
当前天气: ${weatherStatus.weatherEffect.name}
当前季节: ${weatherStatus.seasonEffect.name}
温度: ${weatherStatus.temperature}°C
生长速度: ${(weatherRate * 100).toFixed(0)}%
基础收获: ${crop.harvestPrice}金币
实际收获: ${actualHarvestPrice}金币
当前余额: ${user.balance + actualHarvestPrice}`;
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

module.exports = { createFarmModule };
