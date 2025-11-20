const { buildFigurePayload } = require("../utils/figureHelper");

function chunkArray(list, size) {
  const chunks = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

function createBillRenderer() {
  function buildSummaryText(summary = []) {
    if (!summary.length) return "暂无分类统计";
    return summary
      .map((entry, index) => `${index + 1}. ${entry.label}｜${entry.tip}`)
      .join("\n");
  }

  function buildDetailSections(details = []) {
    if (!details.length) return ["暂无账单记录"];
    const chunks = chunkArray(details, 8);
    return chunks.map((chunk, idx) => {
      const header = chunk.length ? `📄 明细（${idx * 8 + 1}-${idx * 8 + chunk.length}）` : "📄 明细";
      const rows = chunk
        .map((entry, index) => {
          const direction = entry.direction === "income" ? "收入" : "支出";
          return `${idx * 8 + index + 1}. ${direction} ${entry.amount}｜${entry.categoryLabel}\n   ${entry.timeLabel}\n   ${entry.description || "无描述"}`;
        })
        .join("\n");
      return `${header}\n${rows}`;
    });
  }

  function buildSections(data) {
    const sections = [];
    sections.push(
      `${data.title}\n${data.subtitle}\n${data.filterText}`,
    );
    sections.push(
      `💰 收支概览\n- 总收入：${data.totalIncome}\n- 总支出：${data.totalExpense}`,
    );
    sections.push(`📊 分类统计\n${buildSummaryText(data.summary)}`);
    sections.push(...buildDetailSections(data.entries));
    return sections;
  }

  async function renderBillCard(ctx, data, session) {
    const sections = buildSections(data);
    const payload = buildFigurePayload(session, sections);
    return payload.figure ?? payload.text;
  }

  return { renderBillCard };
}

module.exports = { createBillRenderer };
