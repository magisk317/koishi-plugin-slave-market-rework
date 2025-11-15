const path = require("path");
const fs = require("fs").promises;
const { h } = require("koishi");

function createSponsorService(options = {}) {
  const sponsorQrPath = options.imagePath ?? path.join(__dirname, "..", "ai.png");
  let sponsorQrCache = null;
  let sponsorQrError = "";

  async function loadSponsorQr() {
    if (!sponsorQrCache && !sponsorQrError) {
      try {
        const buffer = await fs.readFile(sponsorQrPath);
        sponsorQrCache = h.image(buffer, "image/png");
      } catch (error) {
        sponsorQrError = "⚠️ 赞赏码暂不可用，请稍后再试";
        console.error("Sponsor QR load failed:", { path: sponsorQrPath, error });
      }
    }
    return sponsorQrCache ?? sponsorQrError ?? "⚠️ 暂无赞赏码，请联系管理员";
  }

  async function withSponsorQr(message) {
    const qrSegment = await loadSponsorQr();
    return `${message}\n\n${qrSegment}`;
  }

  return { withSponsorQr };
}

module.exports = { createSponsorService };
