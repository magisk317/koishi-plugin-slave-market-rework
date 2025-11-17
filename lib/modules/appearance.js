const { ensureSufficientBalance } = require("../utils/economy");

const APPEARANCE_SWITCH_COOLDOWN = 60 * 60 * 1e3;
const AppearanceType = Object.freeze({
  衣服: "clothes",
  配饰: "accessories",
  发型: "hairstyle",
  妆容: "makeup",
});

const appearances = [
  // 衣服
  {
    id: "simple_dress",
    name: "简约连衣裙",
    type: AppearanceType.衣服,
    quality: "normal",
    price: 500,
    priceBonus: 10,
    description: "简单大方的连衣裙，略微提升魅力",
  },
  {
    id: "luxury_suit",
    name: "奢华西装",
    type: AppearanceType.衣服,
    quality: "epic",
    price: 2000,
    priceBonus: 40,
    description: "定制奢华西装，显著提升气质",
  },
  {
    id: "royal_gown",
    name: "皇家礼服",
    type: AppearanceType.衣服,
    quality: "legendary",
    price: 4000,
    priceBonus: 80,
    description: "华丽的皇家礼服，彰显尊贵身份",
  },
  {
    id: "casual_outfit",
    name: "休闲套装",
    type: AppearanceType.衣服,
    quality: "normal",
    price: 400,
    priceBonus: 8,
    description: "舒适的休闲套装，适合日常穿着",
  },
  // 配饰
  {
    id: "pearl_necklace",
    name: "珍珠项链",
    type: AppearanceType.配饰,
    quality: "rare",
    price: 800,
    priceBonus: 15,
    description: "优雅的珍珠项链，提升高贵气质",
  },
  {
    id: "diamond_ring",
    name: "钻石戒指",
    type: AppearanceType.配饰,
    quality: "epic",
    price: 1600,
    priceBonus: 30,
    description: "闪耀的钻石戒指，彰显奢华",
  },
  {
    id: "golden_watch",
    name: "金表",
    type: AppearanceType.配饰,
    quality: "rare",
    price: 1200,
    priceBonus: 20,
    description: "精致的金表，展现品味",
  },
  {
    id: "crystal_earrings",
    name: "水晶耳环",
    type: AppearanceType.配饰,
    quality: "normal",
    price: 600,
    priceBonus: 12,
    description: "晶莹剔透的水晶耳环，增添优雅",
  },
  // 发型
  {
    id: "fashion_hair",
    name: "时尚发型",
    type: AppearanceType.发型,
    quality: "rare",
    price: 700,
    priceBonus: 14,
    description: "潮流时尚的发型设计",
  },
  {
    id: "royal_hairstyle",
    name: "皇家发型",
    type: AppearanceType.发型,
    quality: "legendary",
    price: 3000,
    priceBonus: 60,
    description: "华丽的皇家发型，尽显高贵",
  },
  {
    id: "elegant_bun",
    name: "优雅盘发",
    type: AppearanceType.发型,
    quality: "epic",
    price: 1600,
    priceBonus: 30,
    description: "精致的盘发造型，展现优雅",
  },
  {
    id: "casual_hairstyle",
    name: "休闲发型",
    type: AppearanceType.发型,
    quality: "normal",
    price: 500,
    priceBonus: 10,
    description: "轻松自然的发型选择",
  },
  // 妆容
  {
    id: "daily_makeup",
    name: "日常妆容",
    type: AppearanceType.妆容,
    quality: "normal",
    price: 350,
    priceBonus: 7,
    description: "简约自然的日常妆容",
  },
  {
    id: "luxury_makeup",
    name: "奢华妆容",
    type: AppearanceType.妆容,
    quality: "epic",
    price: 1800,
    priceBonus: 35,
    description: "精致的奢华妆容，魅力倍增",
  },
  {
    id: "evening_makeup",
    name: "晚宴妆容",
    type: AppearanceType.妆容,
    quality: "rare",
    price: 1000,
    priceBonus: 18,
    description: "适合宴会场合的精致妆容",
  },
  {
    id: "fantasy_makeup",
    name: "奇幻妆容",
    type: AppearanceType.妆容,
    quality: "legendary",
    price: 3600,
    priceBonus: 70,
    description: "梦幻般的妆容造型，令人惊艳",
  },
];

function calculatePriceBonus(equipped = {}) {
  let totalBonus = 0;
  for (const itemId of Object.values(equipped)) {
    if (!itemId) continue;
    const item = appearances.find((i) => i.id === itemId);
    if (item) totalBonus += item.priceBonus;
  }
  return totalBonus;
}

function createAppearanceModule(deps) {
  const { setupMessageRecall, checkTaxBeforeCommand, isAdmin, formatCostTip, getUser6, renderShopCard, transactionService } = deps;

  async function resolveUser(ctx, session) {
    const user = await getUser6(ctx, session.userId, session);
    if (typeof user === "string") return user;
    return user;
  }

  function getQualityName(quality) {
    const qualityMap = {
      normal: "普通",
      rare: "稀有",
      epic: "史诗",
      legendary: "传说",
    };
    return qualityMap[quality] || "普通";
  }

  async function appearanceShop(ctx, config, session) {
    const user = await resolveUser(ctx, session);
    if (typeof user === "string") return user;
    if (!renderShopCard) {
      let message = "🎭 === 装扮商店 === 🎭\n\n";
      for (const type of Object.values(AppearanceType)) {
        const items = appearances.filter((item) => item.type === type);
        if (!items.length) continue;
        message += `【${type}】\n`;
        items.forEach((item) => {
          const owned = user.ownedAppearances.includes(item.id);
          message += `${item.name} (${item.price}金币)\n`;
          message += `📝 ${item.description}\n`;
          message += `✨ 品质：${getQualityName(item.quality)}\n`;
          message += `💰 身价提升：${item.priceBonus}点\n`;
          message += `🔖 状态：${owned ? "已拥有" : "可购买"}\n\n`;
        });
      }
      message += '💡 使用"购买装扮 [装扮名称]"来购买装扮\n';
      message += '💡 使用"装扮背包"查看已购买的装扮\n';
      message += '💡 使用"装备装扮 [装扮名称]"来装备装扮\n';
      message += '💡 使用"脱下装扮 [装扮名称]"来脱下装扮';
      return message;
    }
    const groups = Object.values(AppearanceType).map((type) => ({
      type,
      items: appearances.filter((item) => item.type === type).map((item) => ({
        name: item.name,
        description: item.description,
        price: item.price,
        priceBonus: item.priceBonus,
        quality: item.quality,
        owned: user.ownedAppearances.includes(item.id)
      }))
    })).filter((group) => group.items.length);
    const tips = [
      '使用"购买装扮 [装扮名称]"来购买装扮',
      '使用"装扮背包"查看已购买的装扮',
      '使用"装备装扮 [装扮名称]"来装备装扮',
      '使用"脱下装扮 [装扮名称]"来脱下装扮'
    ];
    return await renderShopCard(ctx, { groups, tips });
  }

  async function buyAppearance(ctx, config, session, itemName) {
    let user = await resolveUser(ctx, session);
    if (typeof user === "string") return user;
    const item = appearances.find((i) => i.name === itemName);
    if (!item) return "❌ 找不到该装扮";
    if (user.ownedAppearances.includes(item.id)) {
      return "❌ 你已经拥有该装扮了";
    }
    const privileged = isAdmin(ctx, config, user.userId, session);
    let autoWithdrawNotice = "";
    if (!privileged) {
      const cover = await ensureSufficientBalance(ctx, user, item.price, { privileged });
      user = cover.user;
      autoWithdrawNotice = cover.notice;
    }
    if (!privileged && user.balance < item.price) {
      const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
      return `❌ 余额不足，需要${item.price}金币${notice}`;
    }
    const balanceAfter = privileged ? user.balance : user.balance - item.price;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      balance: balanceAfter,
      ownedAppearances: [...user.ownedAppearances, item.id],
    });
    if (!privileged) {
      await transactionService?.logTransaction(ctx, { ...user, balance: balanceAfter }, {
        direction: "expense",
        category: transactionService?.categories.APPEARANCE,
        amount: item.price,
        description: `购买装扮：${item.name}`,
        balanceAfter
      });
    }
    const notice = autoWithdrawNotice ? `\n${autoWithdrawNotice}` : "";
    return `✅ 购买成功！
获得【${item.name}】
💰 花费：${formatCostTip(privileged, item.price)}${notice}`;
  }

  async function equipAppearance(ctx, config, session, itemName) {
    const user = await resolveUser(ctx, session);
    if (typeof user === "string") return user;
    const now = Date.now();
    if (user.lastAppearanceSwitchTime && now - user.lastAppearanceSwitchTime < APPEARANCE_SWITCH_COOLDOWN) {
      const remainingTime = Math.ceil((APPEARANCE_SWITCH_COOLDOWN - (now - user.lastAppearanceSwitchTime)) / (60 * 1000));
      return `❌ 装扮切换冷却中，还需等待${remainingTime}分钟`;
    }
    const item = appearances.find((i) => i.name === itemName);
    if (!item) return "❌ 找不到该装扮";
    if (!user.ownedAppearances.includes(item.id)) {
      return "❌ 你还没有购买该装扮";
    }
    const equipped = { ...user.equipped, [item.type]: item.id };
    const priceBonus = calculatePriceBonus(equipped);
    const currentBonus = calculatePriceBonus(user.equipped);
    const basePrice = user.price - currentBonus;
    const newPrice = basePrice + priceBonus;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      equipped,
      price: newPrice,
      lastAppearanceSwitchTime: now,
    });
    return `✅ 成功装备【${itemName}】
当前身价加成：${priceBonus}点
当前身价：${newPrice}`;
  }

  async function unequipAppearance(ctx, config, session, itemName) {
    const user = await resolveUser(ctx, session);
    if (typeof user === "string") return user;
    const now = Date.now();
    if (user.lastAppearanceSwitchTime && now - user.lastAppearanceSwitchTime < APPEARANCE_SWITCH_COOLDOWN) {
      const remainingTime = Math.ceil((APPEARANCE_SWITCH_COOLDOWN - (now - user.lastAppearanceSwitchTime)) / (60 * 1000));
      return `❌ 装扮切换冷却中，还需等待${remainingTime}分钟`;
    }
    const item = appearances.find((i) => i.name === itemName);
    if (!item) return "❌ 找不到该装扮";
    if (!user.ownedAppearances.includes(item.id)) {
      return "❌ 你还没有购买该装扮";
    }
    const equipped = { ...user.equipped, [item.type]: null };
    const priceBonus = calculatePriceBonus(equipped);
    const currentBonus = calculatePriceBonus(user.equipped);
    const basePrice = user.price - currentBonus;
    const newPrice = basePrice + priceBonus;
    await ctx.database.set("player_market_users", { userId: user.userId }, {
      equipped,
      price: newPrice,
      lastAppearanceSwitchTime: now,
    });
    return `✅ 成功脱下【${itemName}】
当前身价加成：${priceBonus}点
当前身价：${newPrice}`;
  }

  async function checkAppearance(ctx, config, session) {
    const user = await resolveUser(ctx, session);
    if (typeof user === "string") return user;
    const equipped = user.equipped || { 衣服: null, 配饰: null, 发型: null, 妆容: null };
    const totalBonus = calculatePriceBonus(equipped);
    const getEquippedName = (type) => {
      const itemId = equipped[type];
      if (!itemId) return "未装备";
      const item = appearances.find((i) => i.id === itemId);
      return item ? item.name : "未装备";
    };
    return `=== ${user.nickname}的装扮状态 ===
衣服：${getEquippedName("衣服")}
配饰：${getEquippedName("配饰")}
发型：${getEquippedName("发型")}
妆容：${getEquippedName("妆容")}
当前身价加成：${totalBonus}点
当前身价：${user.price}`;
  }

  async function checkAppearanceInventory(ctx, config, session) {
    const user = await resolveUser(ctx, session);
    if (typeof user === "string") return user;
    const equipped = user.equipped || { 衣服: null, 配饰: null, 发型: null, 妆容: null };
    let message = "🎒 === 装扮背包 === 🎒\n\n";
    for (const type of Object.values(AppearanceType)) {
      const items = appearances.filter((item) => item.type === type && user.ownedAppearances.includes(item.id));
      if (!items.length) continue;
      message += `【${type}】\n`;
      items.forEach((item) => {
        const isEquipped = equipped[item.type] === item.id;
        message += `${item.name}\n`;
        message += `📝 ${item.description}\n`;
        message += `✨ 品质：${getQualityName(item.quality)}\n`;
        message += `💰 身价提升：${item.priceBonus}点\n`;
        message += `🔖 状态：${isEquipped ? "已装备" : "未装备"}\n\n`;
      });
    }
    if (!user.ownedAppearances.length) {
      message = '🎒 装扮背包是空的\n💡 使用"装扮商店"查看可购买的装扮';
    }
    return message;
  }

  function registerAppearanceCommands(ctx, config) {
    const slaveCommand = ctx.command("大牛马时代");
    slaveCommand.subcommand("装扮商店", "查看可购买的装扮列表").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await appearanceShop(ctx, config, session));
    });
    slaveCommand.subcommand("装扮背包", "查看已购买的装扮").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await checkAppearanceInventory(ctx, config, session));
    });
    slaveCommand.subcommand("购买装扮 <itemName:string>", "购买指定装扮").action(async ({ session }, itemName) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await buyAppearance(ctx, config, session, itemName));
    });
    slaveCommand.subcommand("装备装扮 <itemName:string>", "装备指定装扮").action(async ({ session }, itemName) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await equipAppearance(ctx, config, session, itemName));
    });
    slaveCommand.subcommand("脱下装扮 <itemName:string>", "脱下指定装扮").action(async ({ session }, itemName) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await unequipAppearance(ctx, config, session, itemName));
    });
    slaveCommand.subcommand("我的装扮", "查看当前装扮状态").action(async ({ session }) => {
      const respond = setupMessageRecall(session, ctx, config, "general");
      const taxCheck = await checkTaxBeforeCommand(ctx, config, session);
      if (taxCheck) return await respond(taxCheck);
      return await respond(await checkAppearance(ctx, config, session));
    });
  }

  return {
    registerAppearanceCommands,
  };
}

module.exports = {
  createAppearanceModule,
  AppearanceType,
  appearances,
  calculatePriceBonus,
};
