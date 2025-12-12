import { LuaTool } from "lua-cli/skill";
import { z } from "zod";
import ApiService from "../services/ApiService";

// Define schemas as static properties for Lua CLI detection
const inputSchema = z.object({ 
    userId: z.string() 
});

const outputSchema = z.object({ 
    id: z.string(), 
    name: z.string(), 
    url: z.string().nullable(), 
    status: z.string(), 
    error: z.string().optional(), 
    timestamp: z.string() 
});

export default class GetUserDataTool implements LuaTool<typeof inputSchema, typeof outputSchema> {
    name: string;
    description: string;
    inputSchema: typeof inputSchema;
    outputSchema: typeof outputSchema;
    
    apiService: ApiService;

    constructor() {
        this.name = "get_user_data";
        this.description = "Get the user data for a given user id";
        this.inputSchema = inputSchema;
        this.outputSchema = outputSchema;
        this.apiService = new ApiService();
    }

    async execute(input: z.infer<typeof inputSchema>) {
        return this.apiService.fetchUserData(input.userId);
    }
}