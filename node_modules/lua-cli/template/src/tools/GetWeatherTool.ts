import { LuaTool } from "lua-cli/skill";
import { z } from "zod";
import GetWeatherService from "../services/GetWeather";

// Define schemas as static properties for Lua CLI detection
const inputSchema = z.object({ 
    city: z.string() 
});

const outputSchema = z.object({ 
    weather: z.string(), 
    city: z.string(),
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    description: z.string().optional()
});

export default class GetWeatherTool implements LuaTool<typeof inputSchema, typeof outputSchema> {
    name: string;
    description: string;
    inputSchema: typeof inputSchema;
    outputSchema: typeof outputSchema;
    
    weatherService: GetWeatherService;

    constructor() {
        this.name = "get_weather";
        this.description = "Get the weather for a given city";
        this.inputSchema = inputSchema;
        this.outputSchema = outputSchema;
        this.weatherService = new GetWeatherService();
    }

    async execute(input: z.infer<typeof inputSchema>) {
        return this.weatherService.getWeather(input.city);
    }
}