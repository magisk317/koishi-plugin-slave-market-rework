const fs = require("fs");
const path = require("path");

class BackupService {
  constructor(ctx, options = {}) {
    this.ctx = ctx;
    this.enabled = options.启用 !== false;
    const dir = options.目录 || "backups";
    this.backupDir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
    this.backupInterval = options.间隔 ?? 30 * 60 * 1e3;
    this.retention = options.保留数量 ?? 10;
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup() {
    try {
      const users = await this.ctx.database.get("player_market_users", {});
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(this.backupDir, `backup_${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(users, null, 2));
      this.cleanOldBackups();
      this.ctx.logger.info(`[Backup] 成功创建备份: ${backupFile}`);
    } catch (error) {
      this.ctx.logger.error(`[Backup] 创建备份失败: ${error.message}`);
    }
  }

  cleanOldBackups() {
    try {
      const files = fs
        .readdirSync(this.backupDir)
        .filter((file) => file.startsWith("backup_") && file.endsWith(".json"))
        .map((file) => ({
          name: file,
          time: fs.statSync(path.join(this.backupDir, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);
      if (files.length > this.retention) {
        files.slice(this.retention).forEach((file) => {
          fs.unlinkSync(path.join(this.backupDir, file.name));
          this.ctx.logger.info(`[Backup] 删除旧备份: ${file.name}`);
        });
      }
    } catch (error) {
      this.ctx.logger.error(`[Backup] 清理旧备份失败: ${error.message}`);
    }
  }

  start() {
    if (!this.enabled) {
      this.ctx.logger.info("[Backup] 已禁用备份服务");
      return;
    }
    this.createBackup();
    setInterval(() => {
      this.createBackup();
    }, this.backupInterval);
    this.ctx.logger.info("[Backup] 备份服务已启动");
  }

  async restoreFromBackup(backupFile) {
    try {
      const backupPath = path.join(this.backupDir, backupFile);
      if (!fs.existsSync(backupPath)) {
        this.ctx.logger.error(`[Backup] 备份文件不存在: ${backupFile}`);
        return false;
      }
      const backupData = JSON.parse(fs.readFileSync(backupPath, "utf8"));
      await this.ctx.database.remove("player_market_users", {});
      for (const user of backupData) {
        await this.ctx.database.create("player_market_users", user);
      }
      this.ctx.logger.info(`[Backup] 成功从备份恢复: ${backupFile}`);
      return true;
    } catch (error) {
      this.ctx.logger.error(`[Backup] 恢复备份失败: ${error.message}`);
      return false;
    }
  }
}

module.exports = { BackupService };
