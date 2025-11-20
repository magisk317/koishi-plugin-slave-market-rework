const { buildFigurePayload } = require("../utils/figureHelper");

const qualityMap = {
  normal: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说"
};

const typeLabelMap = {
  clothes: "衣服",
  accessories: "配饰",
  hairstyle: "发型",
  makeup: "妆容"
};

function formatItem(item) {
  const quality = qualityMap[item.quality] || qualityMap.normal;
  const status = item.owned ? "已拥有" : "可购买";
  return `• ${item.name}｜${quality}\n  价格：${item.price} 金币｜身价 +${item.priceBonus}\n  ${item.description}\n  状态：${status}`;
}

function createAppearanceRenderer() {
  function buildSections(payload) {
    const sections = [
      "🎭 装扮商店\n装扮可提升身价、福报与外观，已购装扮会显示“已拥有”。"
    ];
    payload.groups.forEach((group) => {
      const title = typeLabelMap[group.type] || group.type;
      if (!group.items.length) {
        sections.push(`【${title}】\n暂无装扮`);
        return;
      }
      const list = group.items.map(formatItem).join("\n");
      sections.push(`【${title}】\n${list}`);
    });
    if (payload.tips?.length) {
      sections.push(`💡 购买提示\n- ${payload.tips.join("\n- ")}`);
    }
    return sections;
  }

  async function renderShopCard(ctx, payload, session) {
    const sections = buildSections(payload);
    const figurePayload = buildFigurePayload(session, sections);
    return figurePayload.figure ?? figurePayload.text;
  }

  return { renderShopCard };
}

module.exports = { createAppearanceRenderer };
