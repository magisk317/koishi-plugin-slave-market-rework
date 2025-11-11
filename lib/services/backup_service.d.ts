import { Context } from 'koishi';
import { Config } from '../config/player_market';
export declare class BackupService {
    private ctx;
    private config;
    private backupDir;
    private backupInterval;
    constructor(ctx: Context, config: Config);
    private ensureBackupDir;
    createBackup(): Promise<void>;
    private cleanOldBackups;
    start(): void;
    restoreFromBackup(backupFile: string): Promise<boolean>;
}
