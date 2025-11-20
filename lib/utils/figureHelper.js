const { h } = require("koishi");

function buildFigurePayload(session, sections = []) {
  const filtered = sections
    .map((section) => (typeof section === "string" ? section.trim() : ""))
    .filter((section) => section.length);
  const text = filtered.join("\n\n");
  const supportsFigure = session && ["red", "onebot"].includes(session.platform) && filtered.length;
  if (supportsFigure) {
    const userId = session.userId || session.selfId || "";
    const nodes = filtered.map((content) => h("message", { userId }, content));
    return { figure: h("figure", {}, nodes), text };
  }
  return { figure: null, text };
}

module.exports = { buildFigurePayload };
