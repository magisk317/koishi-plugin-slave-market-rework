import { Context, Session } from 'koishi';
import { Config } from '../config/player_market';
export declare function jailWork(ctx: Context, config: Config, session: Session): Promise<string>;
export declare function checkJailStatus(ctx: Context, config: Config, session: any): Promise<string>;
