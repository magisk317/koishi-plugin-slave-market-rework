import { Context, Session } from 'koishi';
import { Config } from '../config/player_market';
export declare function redeemVipCard(ctx: Context, config: Config, session: Session, cardId: string): Promise<string>;
export declare function checkVipStatus(ctx: Context, config: Config, session: Session): Promise<string>;
export declare function toggleAutoTask(ctx: Context, config: Config, session: Session, action: string, taskName: string): Promise<string>;
export declare function executeAutoTasks(ctx: Context, config: Config): Promise<void>;
