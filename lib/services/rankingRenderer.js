const { buildFigurePayload } = require("../utils/figureHelper");

function chunkEntries(entries, size) {
  const chunks = [];
  for (let i = 0; i < entries.length; i += size) {
    chunks.push(entries.slice(i, i + size));
  }
  return chunks;
}

function createRankingRenderer() {
  function buildSections(data) {
    const sections = [];
    const subtitle = data.subtitle ? `\n${data.subtitle}` : "";
    sections.push(`🏆 ${data.title}${subtitle}`);
    if (!data.entries?.length) {
      sections.push("暂无排行数据");
      return sections;
    }
    const chunks = chunkEntries(data.entries, 10);
    chunks.forEach((chunk, index) => {
      const header = `📋 排行 ${index * 10 + 1}-${index * 10 + chunk.length}`;
      const rows = chunk
        .map((entry, idx) => `${index * 10 + idx + 1}. ${entry.nickname}｜${entry.value}`)
        .join("\n");
      sections.push(`${header}\n${rows}`);
    });
    return sections;
  }

  async function renderRankingBoard(ctx, data, session) {
    const sections = buildSections(data);
    const payload = buildFigurePayload(session, sections);
    return payload.figure ?? payload.text;
  }

  return { renderRankingBoard };
}

module.exports = { createRankingRenderer };
