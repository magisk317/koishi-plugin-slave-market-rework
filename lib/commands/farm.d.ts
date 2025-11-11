import { Context } from 'koishi';
import { Config } from '../config/player_market';
interface Crop {
    name: string;
    price: number;
    growthTime: number;
    harvestPrice: number;
    description: string;
}
export declare const crops: Crop[];
export declare function farm(ctx: Context, config: Config, session: any, cropName: string): Promise<string>;
export declare function harvest(ctx: Context, config: Config, session: any): Promise<string>;
export declare function cropStatus(ctx: Context, config: Config, session: any): Promise<string>;
export {};
