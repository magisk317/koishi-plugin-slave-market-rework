import { Context } from 'koishi';
import { Config } from '../config/player_market';
export declare function deposit(ctx: Context, config: Config, session: any, amount: number): Promise<string>;
export declare function withdraw(ctx: Context, config: Config, session: any, amount: number): Promise<string>;
export declare function claimInterest(ctx: Context, config: Config, session: any): Promise<string>;
export declare function bankInfo(ctx: Context, config: Config, session: any): Promise<string>;
export declare function upgradeCredit(ctx: Context, config: Config, session: any): Promise<string>;
export declare function transfer(ctx: Context, config: Config, session: any, target: string, amount: number): Promise<string>;
