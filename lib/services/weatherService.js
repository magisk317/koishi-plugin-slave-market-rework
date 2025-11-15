const Season = {
  SPRING: "spring",
  SUMMER: "summer",
  AUTUMN: "autumn",
  WINTER: "winter",
};

const weatherEffects = {
  sunny: {
    name: "晴天",
    description: "阳光明媚，适合农作物生长",
    cropGrowthRate: 1.2,
    workIncomeRate: 1.1,
  },
  cloudy: {
    name: "多云",
    description: "天气阴沉，略微影响心情",
    cropGrowthRate: 1,
    workIncomeRate: 1,
  },
  rainy: {
    name: "雨天",
    description: "下雨天，农作物生长加快",
    cropGrowthRate: 1.3,
    workIncomeRate: 0.8,
  },
  stormy: {
    name: "暴风雨",
    description: "狂风暴雨，可能损坏农作物",
    cropGrowthRate: 0.5,
    workIncomeRate: 0.6,
  },
  snowy: {
    name: "下雪",
    description: "白雪皑皑，农作物生长缓慢",
    cropGrowthRate: 0.6,
    workIncomeRate: 0.7,
  },
  windy: {
    name: "大风",
    description: "风力强劲，农作物生长受影响",
    cropGrowthRate: 0.8,
    workIncomeRate: 0.9,
  },
};

const seasonEffects = {
  spring: {
    name: "春季",
    description: "万物复苏的季节",
    weatherProbability: {
      sunny: 0.4,
      cloudy: 0.2,
      rainy: 0.3,
      stormy: 0.05,
      snowy: 0,
      windy: 0.05,
    },
    cropGrowthRate: 1.2,
    temperatureRange: [10, 25],
  },
  summer: {
    name: "夏季",
    description: "炎热的季节",
    weatherProbability: {
      sunny: 0.5,
      cloudy: 0.1,
      rainy: 0.2,
      stormy: 0.15,
      snowy: 0,
      windy: 0.05,
    },
    cropGrowthRate: 1.5,
    temperatureRange: [20, 35],
  },
  autumn: {
    name: "秋季",
    description: "收获的季节",
    weatherProbability: {
      sunny: 0.3,
      cloudy: 0.3,
      rainy: 0.2,
      stormy: 0.1,
      snowy: 0,
      windy: 0.1,
    },
    cropGrowthRate: 1,
    temperatureRange: [15, 25],
  },
  winter: {
    name: "冬季",
    description: "寒冷的季节",
    weatherProbability: {
      sunny: 0.2,
      cloudy: 0.3,
      rainy: 0.1,
      stormy: 0.05,
      snowy: 0.3,
      windy: 0.05,
    },
    cropGrowthRate: 0.6,
    temperatureRange: [-5, 10],
  },
};

class WeatherService {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.currentWeather = "sunny";
    this.currentSeason = "spring";
    this.lastUpdateTime = config.开始时间;
    this.temperature = 20;
    this.initWeatherSystem();
  }

  initWeatherSystem() {
    setInterval(() => {
      this.updateWeather();
    }, this.config.天气更新间隔);
    this.updateWeather();
  }

  updateWeather() {
    const now = Date.now();
    const daysSinceStart = Math.floor((now - this.config.开始时间) / (24 * 60 * 60 * 1e3));
    const seasonIndex = Math.floor(daysSinceStart / this.config.季节持续天数) % 4;
    this.currentSeason = Object.values(Season)[seasonIndex];
    const seasonEffect = seasonEffects[this.currentSeason];
    const weatherProb = seasonEffect.weatherProbability;
    const rand = Math.random();
    let accumProb = 0;
    for (const [weather, prob] of Object.entries(weatherProb)) {
      accumProb += prob;
      if (rand <= accumProb) {
        this.currentWeather = weather;
        break;
      }
    }
    const [minTemp, maxTemp] = seasonEffect.temperatureRange;
    this.temperature = minTemp + Math.random() * (maxTemp - minTemp);
    this.lastUpdateTime = now;
  }

  getWeatherStatus() {
    return {
      weather: this.currentWeather,
      season: this.currentSeason,
      temperature: Math.round(this.temperature),
      weatherEffect: weatherEffects[this.currentWeather],
      seasonEffect: seasonEffects[this.currentSeason],
    };
  }

  getCropGrowthRate() {
    const weatherRate = weatherEffects[this.currentWeather].cropGrowthRate;
    const seasonRate = seasonEffects[this.currentSeason].cropGrowthRate;
    return weatherRate * seasonRate;
  }

  getWorkIncomeRate() {
    return weatherEffects[this.currentWeather].workIncomeRate;
  }
}

module.exports = {
  WeatherService,
  Season,
  weatherEffects,
  seasonEffects,
};
