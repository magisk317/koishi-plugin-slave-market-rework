import { Context } from 'koishi';
import { WeatherConfig, WeatherType, Season } from '../config/weather';
export declare class WeatherService {
    private ctx;
    private config;
    private currentWeather;
    private currentSeason;
    private lastUpdateTime;
    private temperature;
    constructor(ctx: Context, config: WeatherConfig);
    private initWeatherSystem;
    private updateWeather;
    getWeatherStatus(): {
        weather: WeatherType;
        season: Season;
        temperature: number;
        weatherEffect: import("../config/weather").WeatherEffect;
        seasonEffect: import("../config/weather").SeasonEffect;
    };
    getCropGrowthRate(): number;
    getWorkIncomeRate(): number;
}
