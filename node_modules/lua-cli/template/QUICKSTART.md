# Quick Start Guide

Get up and running with Lua CLI in 5 minutes!

## 🚀 Installation

```bash
npm install -g lua-cli
```

## 📦 Create Your First Skill

1. **Initialize a new project:**
   ```bash
   mkdir my-first-skill
   cd my-first-skill
   lua init
   ```

2. **Create a simple tool:**
   ```typescript
   // tools/HelloTool.ts
   import { LuaTool } from "lua-cli/skill";
   import { z } from "zod";

   export default class HelloTool implements LuaTool<z.ZodObject<any>, z.ZodObject<any>> {
     name = "hello";
     description = "Say hello to someone";
     
     inputSchema = z.object({
       name: z.string().describe("Name to greet")
     });
     
     outputSchema = z.object({
       message: z.string(),
       timestamp: z.string()
     });
     
     async execute(input) {
       return {
         message: `Hello, ${input.name}!`,
         timestamp: new Date().toISOString()
       };
     }
   }
   ```

3. **Register the tool:**
   ```typescript
   // index.ts
   import { LuaSkill } from "lua-cli/skill";
   import HelloTool from "./tools/HelloTool";

   const skill = new LuaSkill();
   skill.addTool(new HelloTool());

   // Test the tool
   async function test() {
     const result = await skill.run({
       tool: "hello",
       name: "World"
     });
     console.log(result);
   }

   test().catch(console.error);
   ```

4. **Compile and test:**
   ```bash
   lua compile
   lua test
   ```

## 🎯 Common Patterns

### API Call Tool
```typescript
import axios from "axios";

export default class WeatherTool implements LuaTool<z.ZodObject<any>, z.ZodObject<any>> {
  name = "weather";
  description = "Get weather for a city";
  
  inputSchema = z.object({
    city: z.string().describe("City name")
  });
  
  outputSchema = z.object({
    temperature: z.number(),
    condition: z.string(),
    city: z.string()
  });
  
  async execute(input) {
    const response = await axios.get(`https://api.weather.com/v1/current`, {
      params: { q: input.city }
    });
    
    return {
      temperature: response.data.temp_c,
      condition: response.data.condition.text,
      city: input.city
    };
  }
}
```

### Data Processing Tool
```typescript
export default class ProcessDataTool implements LuaTool<z.ZodObject<any>, z.ZodObject<any>> {
  name = "process_data";
  description = "Process and transform data";
  
  inputSchema = z.object({
    data: z.array(z.any()).describe("Array of data to process"),
    operation: z.enum(["sort", "filter", "map"]).describe("Operation to perform")
  });
  
  outputSchema = z.object({
    result: z.array(z.any()),
    count: z.number()
  });
  
  async execute(input) {
    let result;
    
    switch (input.operation) {
      case "sort":
        result = input.data.sort();
        break;
      case "filter":
        result = input.data.filter(item => item > 0);
        break;
      case "map":
        result = input.data.map(item => item * 2);
        break;
    }
    
    return {
      result,
      count: result.length
    };
  }
}
```

## 🔧 Next Steps

1. **Read the full documentation:**
   - [README.md](./README.md) - Complete guide
   - [DEVELOPER.md](./DEVELOPER.md) - Technical details
   - [API.md](./API.md) - API reference

2. **Explore examples:**
   - Check the `tools/` directory for working examples
   - Look at `services/` for reusable components

3. **Build something awesome:**
   - Create tools for your specific use case
   - Integrate with your favorite APIs
   - Share your skills with the community

## 🆘 Need Help?

- Check the [troubleshooting section](./README.md#troubleshooting)
- Look at the [API reference](./API.md)
- Review the [developer documentation](./DEVELOPER.md)

Happy coding! 🎉
