# LuaSkill Template

This template provides a skeleton implementation demonstrating how to build LuaSkills with custom tools using the Lua CLI framework.

## 🚀 Quick Start

1. **Install the Lua CLI globally:**
   ```bash
   npm install -g lua-cli
   ```

2. **Initialize a new LuaSkill project:**
   ```bash
   mkdir my-lua-skill
   cd my-lua-skill
   lua init
   ```

3. **Compile your skill:**
   ```bash
   lua compile
   ```

4. **Test your tools:**
   ```bash
   lua test
   ```

## 📁 Project Structure

```
my-lua-skill/
├── tools/           # Your custom tools
│   ├── GetWeatherTool.ts
│   ├── GetUserDataTool.ts
│   └── CreatePostTool.ts
├── services/        # Shared services
│   ├── ApiService.ts
│   └── GetWeather.ts
├── index.ts         # Main skill definition
├── package.json     # Dependencies
└── .lua/           # Generated files (auto-created)
    ├── deploy.json  # Compiled skill data
    └── *.js        # Bundled tool files
```

## 🛠️ Creating Tools

### Basic Tool Structure

Every tool must implement the `LuaTool` interface:

```typescript
import { LuaTool } from "lua-cli/skill";
import { z } from "zod";

export default class MyTool implements LuaTool<z.ZodObject<any>, z.ZodObject<any>> {
  name = "my_tool";
  description = "Description of what this tool does";
  
  inputSchema = z.object({
    // Define your input parameters
    param1: z.string().describe("Description of param1"),
    param2: z.number().describe("Description of param2")
  });
  
  outputSchema = z.object({
    // Define your output structure
    result: z.string(),
    success: z.boolean()
  });
  
  async execute(input: z.infer<typeof this.inputSchema>) {
    // Your tool logic here
    return {
      result: "Tool executed successfully",
      success: true
    };
  }
}
```

### Tool Examples

#### 1. Simple Data Processing Tool

```typescript
import { LuaTool } from "lua-cli/skill";
import { z } from "zod";

export default class ProcessDataTool implements LuaTool<z.ZodObject<any>, z.ZodObject<any>> {
  name = "process_data";
  description = "Process and transform input data";
  
  inputSchema = z.object({
    data: z.string().describe("Raw data to process"),
    format: z.enum(["json", "xml", "csv"]).describe("Output format")
  });
  
  outputSchema = z.object({
    processedData: z.string(),
    format: z.string(),
    timestamp: z.string()
  });
  
  async execute(input) {
    // Process the data based on format
    let processedData;
    switch (input.format) {
      case "json":
        processedData = JSON.stringify({ data: input.data });
        break;
      case "xml":
        processedData = `<data>${input.data}</data>`;
        break;
      case "csv":
        processedData = `data\n"${input.data}"`;
        break;
    }
    
    return {
      processedData,
      format: input.format,
      timestamp: new Date().toISOString()
    };
  }
}
```

#### 2. HTTP API Tool

```typescript
import { LuaTool } from "lua-cli/skill";
import { z } from "zod";
import axios from "axios";

export default class ApiCallTool implements LuaTool<z.ZodObject<any>, z.ZodObject<any>> {
  name = "api_call";
  description = "Make HTTP API calls";
  
  inputSchema = z.object({
    url: z.string().url().describe("API endpoint URL"),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).describe("HTTP method"),
    data: z.any().optional().describe("Request body data"),
    headers: z.record(z.string()).optional().describe("Custom headers")
  });
  
  outputSchema = z.object({
    status: z.number(),
    data: z.any(),
    success: z.boolean(),
    error: z.string().optional()
  });
  
  async execute(input) {
    try {
      const response = await axios({
        url: input.url,
        method: input.method,
        data: input.data,
        headers: input.headers || {}
      });
      
      return {
        status: response.status,
        data: response.data,
        success: true
      };
    } catch (error: any) {
      return {
        status: error.response?.status || 0,
        data: null,
        success: false,
        error: error.message
      };
    }
  }
}
```

#### 3. File Operations Tool

```typescript
import { LuaTool } from "lua-cli/skill";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

export default class FileTool implements LuaTool<z.ZodObject<any>, z.ZodObject<any>> {
  name = "file_operations";
  description = "Perform file system operations";
  
  inputSchema = z.object({
    operation: z.enum(["read", "write", "list", "delete"]).describe("File operation to perform"),
    path: z.string().describe("File or directory path"),
    content: z.string().optional().describe("Content to write (for write operations)")
  });
  
  outputSchema = z.object({
    success: z.boolean(),
    data: z.any().optional(),
    error: z.string().optional()
  });
  
  async execute(input) {
    try {
      switch (input.operation) {
        case "read":
          const content = await fs.readFile(input.path, "utf8");
          return { success: true, data: content };
          
        case "write":
          await fs.writeFile(input.path, input.content || "");
          return { success: true, data: "File written successfully" };
          
        case "list":
          const files = await fs.readdir(input.path);
          return { success: true, data: files };
          
        case "delete":
          await fs.unlink(input.path);
          return { success: true, data: "File deleted successfully" };
          
        default:
          return { success: false, error: "Invalid operation" };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
```

## 🔧 Creating Services

Services provide reusable functionality across multiple tools:

```typescript
// services/DatabaseService.ts
import axios from "axios";

export default class DatabaseService {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async query(sql: string) {
    const response = await axios.post(`${this.baseUrl}/query`, { sql });
    return response.data;
  }
  
  async insert(table: string, data: any) {
    const response = await axios.post(`${this.baseUrl}/insert`, { table, data });
    return response.data;
  }
}
```

## 📝 Main Skill Definition

Your `index.ts` file defines the skill and registers tools:

```typescript
import { LuaSkill } from "lua-cli/skill";
import ProcessDataTool from "./tools/ProcessDataTool";
import ApiCallTool from "./tools/ApiCallTool";
import FileTool from "./tools/FileTool";

// Initialize skill
const skill = new LuaSkill();

// Add tools
skill.addTool(new ProcessDataTool());
skill.addTool(new ApiCallTool());
skill.addTool(new FileTool());

// Test cases (optional)
const testCases = [
  { tool: "process_data", data: "Hello World", format: "json" },
  { tool: "api_call", url: "https://httpbin.org/get", method: "GET" },
  { tool: "file_operations", operation: "list", path: "./" }
];

async function runTests() {
  console.log("🧪 Running tool tests...\n");
  
  for (const [index, testCase] of testCases.entries()) {
    try {
      console.log(`Test ${index + 1}: ${testCase.tool}`);
      const result = await skill.run(testCase);
      console.log("✅ Success:", result);
    } catch (error: any) {
      console.log("❌ Error:", error.message);
    }
    console.log("");
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}
```

## 🎯 Best Practices

### 1. Input Validation
Always use Zod schemas for robust input validation:

```typescript
inputSchema = z.object({
  email: z.string().email().describe("Valid email address"),
  age: z.number().min(0).max(120).describe("Age between 0 and 120"),
  tags: z.array(z.string()).optional().describe("Optional array of tags")
});
```

### 2. Error Handling
Provide meaningful error messages:

```typescript
async execute(input) {
  try {
    // Your logic here
    return { success: true, data: result };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
```

### 3. Async Operations
Use async/await for better error handling:

```typescript
async execute(input) {
  const result = await someAsyncOperation(input);
  return result;
}
```

### 4. Service Reuse
Extract common functionality into services:

```typescript
// In your tool
import DatabaseService from "../services/DatabaseService";

export default class UserTool {
  private dbService = new DatabaseService("http://localhost:3000");
  
  async execute(input) {
    const users = await this.dbService.query("SELECT * FROM users");
    return { users };
  }
}
```

## 📦 Dependencies

Add external dependencies to your `package.json`:

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "zod": "^3.22.0"
  }
}
```

The Lua CLI will automatically bundle these dependencies when you run `lua compile`.

## 🧪 Testing

### Interactive Testing
```bash
lua test
```

### Programmatic Testing
```typescript
const result = await skill.run({
  tool: "my_tool",
  param1: "value1",
  param2: 42
});
console.log(result);
```

## 🚀 Deployment

Once your skill is ready:

1. **Compile:**
   ```bash
   lua compile
   ```

2. **Deploy:**
   ```bash
   lua deploy
   ```

The compiled skill data will be in `.lua/deploy.json` and can be used with the Lua platform.

## 📚 API Reference

### LuaSkill Class

```typescript
class LuaSkill {
  constructor()
  addTool<TInput, TOutput>(tool: LuaTool<TInput, TOutput>): void
  async run(input: Record<string, any>): Promise<any>
}
```

### LuaTool Interface

```typescript
interface LuaTool<TInput extends ZodType, TOutput extends ZodType> {
  name: string;
  description: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  execute(input: z.infer<TInput>): Promise<z.infer<TOutput>>;
}
```

## 🔍 Troubleshooting

### Common Issues

1. **"Tool not found" error:**
   - Ensure the tool name matches exactly
   - Check that the tool is added to the skill

2. **Input validation errors:**
   - Verify your Zod schema matches the input structure
   - Check required vs optional fields

3. **Bundling errors:**
   - Ensure all dependencies are in `package.json`
   - Check import paths are correct

4. **Runtime errors:**
   - Use try/catch blocks in your execute methods
   - Check that all required globals are available

### Debug Tips

- Use `console.log` for debugging (output appears in test mode)
- Test individual tools before adding to the skill
- Validate schemas with Zod's `.parse()` method
- Check the generated `.lua/deploy.json` for compilation issues

## 📖 Examples

See the `tools/` directory for complete working examples:
- `GetWeatherTool.ts` - Simple API call
- `GetUserDataTool.ts` - Complex service integration
- `CreatePostTool.ts` - POST request with data

## 🤝 Contributing

Found a bug or want to add a feature? Check out our [contributing guidelines](../../CONTRIBUTING.md).

## 📄 License

This template is part of the Lua CLI framework. See the main [LICENSE](../../LICENSE) file for details.
