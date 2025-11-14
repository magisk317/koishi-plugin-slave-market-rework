export interface UserData {
    userId: string;
    plainUserId: string;
    scopeId: string;
    nickname: string;
    balance: number;
    deposit: number;
    creditLevel: number;
    depositLimit: number;
    interest: number;
    lastInterestTime: number;
    price: number;
    employer: string;
    lastWorkTime: number;
    lastRobTime: number;
    lastHireTime: number;
    lastTransferTime: number;
    lastFarmTime: number;
    currentCrop: string | null;
    cropStartTime: number;
    employeeCount: number;
    inventory: Record<string, number>;
    bodyguardEndTime: number;
    bodyguardLevel: number;
    equipped: {
        衣服: string | null;
        配饰: string | null;
        发型: string | null;
        妆容: string | null;
    };
    ownedAppearances: string[];
    vipEndTime: number;
    autoTasks: {
        work: boolean;
        harvest: boolean;
        deposit: boolean;
    };
    lastAutoDepositTime: number;
    priceMultiplier: number;
    priceMultiplierEndTime: number;
    welfareLevel: number;
    lastWelfareTime: number;
    welfareIncome: number;
    trainingLevel: number;
    lastTrainingTime: number;
    trainingCost: number;
    abuseCount: number;
    lastAbuseTime: number;
    isInJail: boolean;
    jailStartTime: number;
    jailReason: string;
    jailWorkIncome: number;
    jailWorkCount: number;
    isInPrison: boolean;
    prisonEndTime: number;
    lastAppearanceSwitchTime: number;
    registerTime: number;
    registerChannelId: string;
    registerGuildId: string;
    lastChannelId: string;
    lastGuildId: string;
    lastActiveTime: number;
    autoRegistered: boolean;
    registrationBonus: number;
}
export interface Item {
    id: string;
    name: string;
    description: string;
    price: number;
    effect: {
        type: 'price' | 'work' | 'rob' | 'interest' | 'price_multiplier' | 'train' | 'duel';
        value: number;
        duration?: number;
    };
    isConsumable: boolean;
    isFreeOnly: boolean;
}
export interface ShopData {
    items: Item[];
}
export interface GameStatistics {
    id: number;
    totalTransactions: number;
    totalWorkIncome: number;
    totalRobAmount: number;
    activePlayers: number;
    gameStartTime: number;
    gameStatus: string;
    winner: string;
    endTime: number;
}
export interface Bodyguard {
    id: string;
    name: string;
    level: number;
    price: number;
    duration: number;
    description: string;
    protectType: 'rob' | 'hire' | 'both';
}
export interface BodyguardMarket {
    bodyguards: Bodyguard[];
}
export interface VipCard {
    id: string;
    type: string;
    durationHours: number;
    durationLabel: string;
    isUsed: boolean;
    usedBy: string;
    usedTime: number;
    expireTime: number;
    createdBy: string;
    createdAt: number;
}
export interface RedPacketClaim {
    userId: string;
    nickname: string;
    amount: number;
    time: number;
}
export interface RedPacket {
    id: string;
    scopeId: string;
    channelId: string;
    guildId: string;
    senderId: string;
    senderNickname: string;
    totalAmount: number;
    remainingAmount: number;
    totalShares: number;
    remainingShares: number;
    fee: number;
    createdAt: number;
    expiresAt: number;
    claims: RedPacketClaim[];
    isAdminPacket: boolean;
}
