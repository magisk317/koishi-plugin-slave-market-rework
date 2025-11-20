function registerModels(ctx) {
  ctx.model.extend("player_market_users", {
    userId: "string",
    plainUserId: "string",
    scopeId: "string",
    nickname: "string",
    balance: "unsigned",
    deposit: "unsigned",
    creditLevel: "unsigned",
    loanCreditLevel: "unsigned",
    depositLimit: "unsigned",
    depositPenaltyLevel: "unsigned",
    depositOverdraftPenaltyLevel: "unsigned",
    interest: "unsigned",
    lastInterestTime: "unsigned",
    price: "unsigned",
    loanBalance: "integer",
    lastLoanInterestTime: "unsigned",
    employer: "string",
    lastWorkTime: "unsigned",
    lastRobTime: "unsigned",
    lastHireTime: "unsigned",
    lastTransferTime: "unsigned",
    lastFarmTime: "unsigned",
    currentCrop: "string",
    cropStartTime: "unsigned",
    employeeCount: "unsigned",
    inventory: { type: "json", initial: {} },
    shopBoostEndTime: "unsigned",
    shopTaxFreeCharges: "unsigned",
    bodyguardEndTime: "unsigned",
    bodyguardLevel: "unsigned",
    equipped: { type: "json", initial: { 衣服: null, 配饰: null, 发型: null, 妆容: null } },
    ownedAppearances: { type: "json", initial: [] },
    vipEndTime: "unsigned",
    autoTasks: { type: "json", initial: { work: false, harvest: false, deposit: false } },
    lastAutoDepositTime: "unsigned",
    priceMultiplier: "float",
    priceMultiplierEndTime: "unsigned",
    welfareLevel: "unsigned",
    lastWelfareTime: "unsigned",
    welfareIncome: "unsigned",
    trainingLevel: "unsigned",
    lastTrainingTime: "unsigned",
    trainingCost: "unsigned",
    trainingDailyCount: "unsigned",
    trainingDailyDate: "unsigned",
    abuseCount: "unsigned",
    lastAbuseTime: "unsigned",
    isInJail: "boolean",
    jailStartTime: "unsigned",
    jailReason: "string",
    jailWorkIncome: "unsigned",
    jailWorkCount: "unsigned",
    lastJailWorkTime: "unsigned",
    lastJailVictimId: "string",
    isInPrison: "boolean",
    prisonEndTime: "unsigned",
    lastAppearanceSwitchTime: "unsigned",
    registerTime: "unsigned",
    registerChannelId: "string",
    registerGuildId: "string",
    lastChannelId: "string",
    lastGuildId: "string",
    lastActiveTime: "unsigned",
    autoRegistered: "boolean",
    registrationBonus: "unsigned",
    forceTradeStreak: "unsigned",
    forceTradeExpiresAt: "unsigned"
  }, {
    primary: "userId"
  });
  ctx.model.extend("game_statistics", {
    id: "unsigned",
    totalTransactions: "unsigned",
    totalWorkIncome: "unsigned",
    totalRobAmount: "unsigned",
    activePlayers: "unsigned",
    gameStartTime: "unsigned",
    gameStatus: "string",
    winner: "string",
    endTime: "unsigned"
  }, {
    autoInc: true
  });
  ctx.model.extend("slave_market_system", {
    id: "unsigned",
    balance: "unsigned",
    isFinancialCrisis: "boolean",
    isDisabled: "boolean"
  }, {
    autoInc: true
  });
  ctx.model.extend("vip_cards", {
    id: "string",
    type: "string",
    durationHours: "unsigned",
    durationLabel: "string",
    isUsed: "boolean",
    usedBy: "string",
    usedTime: "unsigned",
    expireTime: "unsigned",
    createdBy: "string",
    createdAt: "unsigned"
  }, {
    primary: "id"
  });
  ctx.model.extend("player_market_red_packets", {
    id: "string",
    scopeId: "string",
    channelId: "string",
    guildId: "string",
    senderId: "string",
    senderNickname: "string",
    totalAmount: "unsigned",
    remainingAmount: "unsigned",
    totalShares: "unsigned",
    remainingShares: "unsigned",
    fee: "unsigned",
    createdAt: "unsigned",
    expiresAt: "unsigned",
    claims: { type: "json", initial: [] },
    isAdminPacket: "boolean"
  }, {
    primary: "id"
  });
  ctx.model.extend("player_market_transactions", {
    id: "unsigned",
    userId: "string",
    scopeId: "string",
    direction: "string",
    category: "string",
    amount: "unsigned",
    balanceAfter: "unsigned",
    description: "string",
    relatedUserId: "string",
    metadata: { type: "json", initial: {} },
    isFee: "boolean",
    createdAt: "unsigned"
  }, {
    autoInc: true
  });
  ctx.model.extend("player_market_tax_pool", {
    id: "unsigned",
    scopeId: "string",
    platform: "string",
    channelId: "string",
    guildId: "string",
    amount: "unsigned",
    dateKey: "unsigned",
    distributed: "boolean",
    createdAt: "unsigned",
    updatedAt: "unsigned"
  }, {
    autoInc: true
  });
  ctx.model.extend("player_market_shop_purchases", {
    id: "unsigned",
    userId: "string",
    itemId: "string",
    dateKey: "unsigned",
    count: "unsigned",
    createdAt: "unsigned",
    updatedAt: "unsigned"
  }, {
    autoInc: true
  });
  ctx.model.extend("player_market_lottery_orders", {
    id: "unsigned",
    userId: "string",
    optionId: "string",
    optionName: "string",
    price: "unsigned",
    tax: "unsigned",
    totalCost: "unsigned",
    reward: "unsigned",
    isWin: "boolean",
    createdAt: "unsigned",
    dateKey: "unsigned"
  }, {
    autoInc: true
  });
}

module.exports = { registerModels };
