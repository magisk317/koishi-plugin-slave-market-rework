const { buildFigurePayload } = require("../utils/figureHelper");

function createProfileRenderer() {
  function formatList(title, items = []) {
    if (!items.length) return `${title}：无`;
    return `${title}：\n- ${items.join("\n- ")}`;
  }

  function formatCooldowns(cooldowns = {}) {
    const lines = Object.entries(cooldowns).map(([label, value]) => `${label}：${value}`);
    return lines.length ? lines.join("\n") : "暂无冷却数据";
  }

  function buildSections(profile) {
    const sections = [];
    sections.push(
      `👤 ${profile.nickname} 的信息\n最后活跃：${profile.lastActive || "刚刚"}`,
    );
    sections.push(
      `💰 资产总览
- 余额：${profile.balance} 金币
- 存款：${profile.deposit}/${profile.depositLimit}
- 当前身价：${profile.price} 金币
- 财富等级：${profile.creditLevel}
- 信用等级：${profile.loanCreditLevel}
- 当前贷款：${profile.loanBalance} / ${profile.loanLimit}
- 剩余额度：${profile.availableLoan}
- 牛马主：${profile.masterInfo || "自由人"}`,
    );
    sections.push(
      `📦 资产详情
- 牛马数量：${profile.employeeCount || 0}
- 保镖状态：${profile.bodyguardInfo || "无"}
- 福报收益：${profile.welfareIncome || 0}
- 培训等级：${profile.trainingLevel || 1}
- 福报等级：${profile.welfareLevel || 1}`,
    );
    sections.push(`🐂 牛马列表\n${formatList("牛马", profile.slaveList || [])}`);
    sections.push(`⏱️ 冷却状态\n${formatCooldowns(profile.cooldowns)}`);
    sections.push(
      `🌾 农场与监狱\n- 作物状态：${profile.cropInfo || "未种植"}\n- 监狱状态：${profile.prisonInfo || "自由"}`,
    );
    if (profile.tips?.length) {
      sections.push(`💡 提升建议\n- ${profile.tips.join("\n- ")}`);
    }
    return sections;
  }

  async function renderProfileCard(ctx, profile, session) {
    const sections = buildSections(profile);
    const payload = buildFigurePayload(session, sections);
    return payload.figure ?? payload.text;
  }

  return { renderProfileCard };
}

module.exports = { createProfileRenderer };
