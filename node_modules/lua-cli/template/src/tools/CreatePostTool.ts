import { LuaTool } from "lua-cli/skill";
import { z } from "zod";
import ApiService from "../services/ApiService";

// Define schemas as static properties for Lua CLI detection
const inputSchema = z.object({ 
    title: z.string(), 
    content: z.string() 
});

const outputSchema = z.object({ 
    id: z.string().nullable(), 
    title: z.string(), 
    status: z.string(), 
    error: z.string().optional(), 
    url: z.string().nullable() 
});

export default class CreatePostTool implements LuaTool<typeof inputSchema, typeof outputSchema> {
    name: string;
    description: string;
    inputSchema: typeof inputSchema;
    outputSchema: typeof outputSchema;
    
    apiService: ApiService;
    
    constructor() {
        this.name = "create_post";
        this.description = "Create a new post";
        this.inputSchema = inputSchema;
        this.outputSchema = outputSchema;
        this.apiService = new ApiService();
    }
    
    async execute(input: z.infer<typeof inputSchema>) {
        return this.apiService.createPost(input.title, input.content);
    }
}