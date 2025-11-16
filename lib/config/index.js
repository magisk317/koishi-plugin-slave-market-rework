const { Schema } = require("koishi");

const WeatherConfig = Schema.object({
  季节持续天数: Schema.number().default(7),
  天气更新间隔: Schema.number().default(4 * 60 * 60 * 1e3),
  // 4小时
  开始时间: Schema.number().default(Date.now())
});

const Config = Schema.object({
  // 基础配置
  初始余额: Schema.number().default(1e3),
  初始身价: Schema.number().default(200),
  初始存款上限: Schema.number().default(1e3),
  初始信用等级: Schema.number().default(1),
  自动注册: Schema.boolean().default(true).description("群内发言自动建立玩家档案"),
  强制买卖: Schema.object({
    启用: Schema.boolean().default(true).description("是否启用强制买卖与翻倍逻辑"),
    初始倍率: Schema.number().default(1).description("基础倍率，通常保持为1"),
    翻倍倍率: Schema.number().default(2).description("每次强制交易后倍率的翻倍系数"),
    重置策略: Schema.union([
      Schema.const("time").description("在指定时间内未发生强制交易则重置倍率"),
      Schema.const("count").description("达到指定次数后自动重置倍率")
    ]).default("time").description("倍率归零策略"),
    重置时间: Schema.number().default(6 * 60 * 60 * 1e3).description("策略为time时，多久没有强制交易会重置（毫秒）"),
    重置次数: Schema.number().default(10).description("策略为count时，达到多少次强制交易后重置"),
    最大翻倍次数: Schema.number().default(10).description("倍率最多累积的翻倍次数，用于防止无限膨胀"),
    忽略保镖: Schema.boolean().default(false).description("是否在抢牛马时无视保镖保护"),
    赎身共享倍率: Schema.boolean().default(true).description("赎身费用是否按照翻倍后的身价计算"),
    提示命令: Schema.string().default("抢牛马").description("提示玩家使用的强制买卖指令名")
  }).default({
    启用: true,
    初始倍率: 1,
    翻倍倍率: 2,
    重置策略: "time",
    重置时间: 6 * 60 * 60 * 1e3,
    重置次数: 10,
    最大翻倍次数: 10,
    忽略保镖: false,
    赎身共享倍率: true,
    提示命令: "抢牛马"
  }).description("强制买卖与翻倍策略配置"),
  // 赎身配置
  赎身倍率: Schema.number().default(2),
  中介费: Schema.number().default(0.1),
  赎身提升: Schema.number().default(1.1),
  // 打工配置
  打工基础收入: Schema.number().default(0.1),
  牛马主加成: Schema.number().default(0.1),
  // 冷却时间(毫秒)
  购买冷却: Schema.number().default(5 * 60 * 1e3),
  打工冷却: Schema.number().default(2 * 60 * 1e3),
  抢劫冷却: Schema.number().default(1 * 60 * 1e3),
  转账冷却: Schema.number().default(2 * 60 * 1e3),
  种地冷却: Schema.number().default(30 * 60 * 1e3),
  // 概率配置
  抢劫成功率: Schema.number().default(0.3),
  抢劫策略: Schema.array(Schema.object({
    名称: Schema.string().default("低风险"),
    描述: Schema.string().default("胜率较高，收益较少"),
    成功率: Schema.number().default(0.7),
    抢夺比例: Schema.number().default(0.15),
    惩罚比例: Schema.number().default(0.05)
  })).default([
    {
      名称: "低风险",
      描述: "胜率高但收益较少",
      成功率: 0.75,
      抢夺比例: 0.15,
      惩罚比例: 0.05
    },
    {
      名称: "高风险",
      描述: "收益爆炸但失败代价大",
      成功率: 0.35,
      抢夺比例: 0.45,
      惩罚比例: 0.25
    }
  ]).description("抢劫等级配置，决定不同难度的胜率与收益"),
  决斗成功率: Schema.number().default(0.5),
  // 银行配置
  存款利率: Schema.number().default(0.01),
  利息最大时间: Schema.number().default(24),
  信用升级费用: Schema.number().default(0.1),
  转账手续费: Schema.number().default(0.05),
  // 决斗配置
  决斗提升: Schema.number().default(0.2),
  决斗降低: Schema.number().default(0.1),
  // 保镖配置
  保镖价格: Schema.array(Schema.number()).default([1e3, 2e3, 5e3, 1e4]),
  保镖保护时间: Schema.number().default(24 * 60 * 60 * 1e3),
  保镖保护概率: Schema.number().default(0.8),
  // 天气系统配置
  weather: WeatherConfig,
  messageRecall: Schema.object({
    enabled: Schema.boolean().default(false).description("是否开启奴隶市场指令的消息撤回"),
    delay: Schema.number().default(60).description("撤回延迟时间（秒）")
  }).default({}).description("消息撤回设置"),
  // 牛马福利系统配置
  福利等级: Schema.object({
    基础工资: Schema.array(Schema.number()).default([100, 200, 300, 400, 500]),
    培训费用: Schema.array(Schema.number()).default([1e3, 2e3, 3e3, 4e3, 5e3]),
    培训提升: Schema.array(Schema.number()).default([0.1, 0.2, 0.3, 0.4, 0.5]),
    福利间隔: Schema.number().default(24 * 60 * 60 * 1e3),
    培训间隔: Schema.number().default(12 * 60 * 60 * 1e3),
    虐待惩罚: Schema.number().default(1e3),
    虐待间隔: Schema.number().default(1 * 60 * 60 * 1e3)
  }).description("牛马福利系统配置"),
  // 监狱系统配置
  监狱系统: Schema.object({
    监狱打工收入: Schema.number().default(30),
    监狱打工间隔: Schema.number().default(5 * 60 * 1e3),
    监狱打工次数上限: Schema.number().default(3),
    工作收入倍率: Schema.number().default(1),
    抢劫入狱概率: Schema.number().default(0.5).description("抢劫失败后被关进监狱的概率")
  }),
  // 管理员列表配置
  管理员列表: Schema.array(Schema.string()).default([]).description("管理员用户ID列表"),
  // 牛马福利配置
  牛马福利: Schema.object({
    基础福利比例: Schema.number().default(0.1).description("基础福利占身价的比例"),
    等级加成: Schema.number().default(0.2).description("每级福利的额外加成比例"),
    培训费用比例: Schema.number().default(0.2).description("培训费用占身价的比例"),
    培训冷却: Schema.number().default(60 * 60 * 1e3).description("培训冷却时间（毫秒）")
  }).description("牛马福利系统配置"),
  贷款系统: Schema.object({
    基础额度: Schema.number().default(1e3).description("基础贷款额度"),
    等级加成: Schema.number().default(500).description("信用等级每级增加的贷款额度"),
    利率: Schema.number().default(0.02).description("贷款利率（每小时）")
  }).description("贷款额度与利率设置"),
  调试日志: Schema.boolean().default(false).description("是否输出额外调试日志，便于问题排查"),
  注册激励: Schema.object({
    启用: Schema.boolean().default(true),
    开始时间: Schema.string().default("18:00"),
    结束时间: Schema.string().default("22:00"),
    奖励金额: Schema.number().default(1e3)
  }).default({
    启用: true,
    开始时间: "18:00",
    结束时间: "22:00",
    奖励金额: 1e3
  }).description("在指定时间段注册可额外获得金币奖励"),
  备份设置: Schema.object({
    启用: Schema.boolean().default(true).description("是否启用定期备份"),
    目录: Schema.string().default("backups").description("备份文件存放目录（相对于Koishi运行目录或绝对路径）"),
    间隔: Schema.number().default(30 * 60 * 1e3).description("备份间隔（毫秒）"),
    保留数量: Schema.number().default(10).description("保留的备份文件数量")
  }).default({
    启用: true,
    目录: "backups",
    间隔: 30 * 60 * 1e3,
    保留数量: 10
  }).description("备份服务配置"),
  帮助页面: Schema.object({
    模板路径: Schema.string().default("help_page.html").description("帮助页面模板文件路径（相对于插件目录或绝对路径）")
  }).default({
    模板路径: "help_page.html"
  }).description("Puppeteer 帮助页面渲染配置"),
  统计报告: Schema.object({
    启用: Schema.boolean().default(false).description("是否启用自动统计报告"),
    间隔: Schema.number().default(60 * 60 * 1e3).description("自动报告间隔（毫秒）"),
    展示数量: Schema.number().default(5).description("排行榜展示的玩家数量"),
    统计范围小时: Schema.number().default(24).description("活跃玩家统计的时间范围（小时）")
  }).default({
    启用: false,
    间隔: 60 * 60 * 1e3,
    展示数量: 5,
    统计范围小时: 24
  }).description("游戏统计与报告配置")
});

module.exports = {
  Config,
  WeatherConfig
};
