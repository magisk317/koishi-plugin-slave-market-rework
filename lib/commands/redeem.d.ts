import { Context } from 'koishi';
import { Config } from '../config/player_market';
export declare function redeem(ctx: Context, config: Config, session: any): Promise<string>;
export declare function release(ctx: Context, config: Config, session: any, target: string): Promise<string>;
