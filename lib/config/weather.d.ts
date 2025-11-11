import { Schema } from 'koishi';
export declare enum Season {
    SPRING = "spring",
    SUMMER = "summer",
    AUTUMN = "autumn",
    WINTER = "winter"
}
export declare enum WeatherType {
    SUNNY = "sunny",
    CLOUDY = "cloudy",
    RAINY = "rainy",
    STORMY = "stormy",
    SNOWY = "snowy",
    WINDY = "windy"
}
export interface WeatherEffect {
    name: string;
    description: string;
    cropGrowthRate: number;
    workIncomeRate: number;
}
export interface SeasonEffect {
    name: string;
    description: string;
    weatherProbability: Record<WeatherType, number>;
    cropGrowthRate: number;
    temperatureRange: [number, number];
}
export declare const weatherEffects: Record<WeatherType, WeatherEffect>;
export declare const seasonEffects: Record<Season, SeasonEffect>;
export declare const WeatherConfig: Schema<Schemastery.ObjectS<{
    季节持续天数: Schema<number, number>;
    天气更新间隔: Schema<number, number>;
    开始时间: Schema<number, number>;
}>, Schemastery.ObjectT<{
    季节持续天数: Schema<number, number>;
    天气更新间隔: Schema<number, number>;
    开始时间: Schema<number, number>;
}>>;
export interface WeatherConfig {
    季节持续天数: number;
    天气更新间隔: number;
    开始时间: number;
}
