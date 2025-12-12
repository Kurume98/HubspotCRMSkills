# Lua CLI API Reference

Complete API documentation for the Lua CLI framework.

## 📚 Table of Contents

- [LuaSkill Class](#luaskill-class)
- [LuaTool Interface](#luatool-interface)
- [Zod Schema Reference](#zod-schema-reference)
- [CLI Commands](#cli-commands)
- [Error Handling](#error-handling)
- [Type Definitions](#type-definitions)

## 🎯 LuaSkill Class

The main orchestrator for managing and executing LuaTools.

### Constructor

```typescript
constructor()
```

Creates a new LuaSkill instance.

**Example:**
```typescript
const skill = new LuaSkill();
```

### Methods

#### `addTool<TInput, TOutput>(tool: LuaTool<TInput, TOutput>): void`

Adds a tool to the skill.

**Parameters:**
- `tool` - The tool to add

**Example:**
```typescript
const skill = new LuaSkill();
skill.addTool(new MyTool());
```

#### `async run(input: Record<string, any>): Promise<any>`

Executes a tool with the given input.

**Parameters:**
- `input` - Object containing the tool name and parameters

**Returns:**
- Promise resolving to the tool's output

**Example:**
```typescript
const result = await skill.run({
  tool: "my_tool",
  param1: "value1",
  param2: 42
});
```

**Throws:**
- `Error` - If tool is not found or input validation fails

## 🛠️ LuaTool Interface

Interface that all tools must implement.

### Properties

#### `name: string`

Unique identifier for the tool.

**Example:**
```typescript
name = "get_weather";
```

#### `description: string`

Human-readable description of what the tool does.

**Example:**
```typescript
description = "Get current weather for a given city";
```

#### `inputSchema: TInput`

Zod schema defining the expected input structure.

**Example:**
```typescript
inputSchema = z.object({
  city: z.string().describe("City name"),
  units: z.enum(["metric", "imperial"]).optional()
});
```

#### `outputSchema: TOutput`

Zod schema defining the expected output structure.

**Example:**
```typescript
outputSchema = z.object({
  temperature: z.number(),
  condition: z.string(),
  timestamp: z.string()
});
```

### Methods

#### `async execute(input: z.infer<TInput>): Promise<z.infer<TOutput>>`

Executes the tool with validated input.

**Parameters:**
- `input` - Validated input object

**Returns:**
- Promise resolving to the tool's output

**Example:**
```typescript
async execute(input) {
  const weather = await this.fetchWeather(input.city);
  return {
    temperature: weather.temp,
    condition: weather.description,
    timestamp: new Date().toISOString()
  };
}
```

## 📋 Zod Schema Reference

Common Zod schema patterns for tool development.

### Basic Types

```typescript
// String
z.string()                    // Any string
z.string().min(1)            // Non-empty string
z.string().max(100)          // String with max length
z.string().email()           // Valid email
z.string().url()             // Valid URL
z.string().uuid()            // Valid UUID
z.string().regex(/^[a-z]+$/) // Custom regex

// Number
z.number()                   // Any number
z.number().int()             // Integer
z.number().positive()        // Positive number
z.number().min(0)            // Non-negative
z.number().max(100)          // Maximum value

// Boolean
z.boolean()                  // True or false

// Date
z.date()                     // Date object
z.string().datetime()        // ISO datetime string

// Array
z.array(z.string())          // Array of strings
z.array(z.number()).min(1)  // Non-empty number array

// Object
z.object({                   // Object with specific shape
  name: z.string(),
  age: z.number()
})
```

### Advanced Patterns

```typescript
// Optional fields
z.object({
  required: z.string(),
  optional: z.string().optional(),
  withDefault: z.string().default("default value")
})

// Union types
z.union([z.string(), z.number()])  // String or number
z.enum(["option1", "option2"])     // Specific values

// Discriminated unions
z.discriminatedUnion("type", [
  z.object({ type: z.literal("user"), name: z.string() }),
  z.object({ type: z.literal("admin"), permissions: z.array(z.string()) })
])

// Record types
z.record(z.string(), z.any())      // Object with string keys
z.record(z.string(), z.number())  // Object with number values

// Tuple types
z.tuple([z.string(), z.number()])  // Fixed-length array

// Lazy evaluation
z.lazy(() => z.object({
  name: z.string(),
  children: z.array(z.lazy(() => TreeNode))
}))

// Custom validation
z.string().refine(
  (val) => val.length > 5,
  { message: "Must be longer than 5 characters" }
)

// Transform
z.string().transform((val) => val.toUpperCase())
```

### Schema Composition

```typescript
// Extending schemas
const BaseSchema = z.object({
  id: z.string(),
  createdAt: z.date()
});

const UserSchema = BaseSchema.extend({
  name: z.string(),
  email: z.string().email()
});

// Merging schemas
const SchemaA = z.object({ a: z.string() });
const SchemaB = z.object({ b: z.number() });
const MergedSchema = SchemaA.merge(SchemaB);

// Partial schemas
const PartialUser = UserSchema.partial();  // All fields optional
const RequiredUser = UserSchema.required(); // All fields required

// Pick and omit
const NameOnly = UserSchema.pick({ name: true });
const WithoutId = UserSchema.omit({ id: true });
```

## 🖥️ CLI Commands

### `lua init`

Initializes a new LuaSkill project.

**Usage:**
```bash
lua init
```

**Creates:**
- `package.json` with dependencies
- `tsconfig.json` for TypeScript
- `tools/` directory
- `services/` directory
- `index.ts` template

### `lua compile`

Compiles the LuaSkill and bundles dependencies.

**Usage:**
```bash
lua compile
```

**Output:**
- `.lua/deploy.json` - Compiled skill data
- `.lua/*.js` - Bundled tool files

**Options:**
- `--watch` - Watch for changes and recompile
- `--minify` - Minify output code

### `lua test`

Interactive testing interface for tools.

**Usage:**
```bash
lua test
```

**Features:**
- Tool selection menu
- Input validation
- Real-time execution
- Error reporting

### `lua deploy`

Deploys the compiled skill to the Lua platform.

**Usage:**
```bash
lua deploy
```

**Requirements:**
- Valid API key (configured with `lua configure`)
- Compiled skill (run `lua compile` first)

### `lua configure`

Configures API keys and settings.

**Usage:**
```bash
lua configure
```

**Stores:**
- API keys securely
- Platform settings
- User preferences

### `lua agents`

Lists available agents on the platform.

**Usage:**
```bash
lua agents
```

**Output:**
- Agent names and descriptions
- Available capabilities
- Status information

## ⚠️ Error Handling

### Common Error Types

#### Validation Errors

```typescript
// Thrown when input doesn't match schema
const error = new ZodError([
  {
    code: "invalid_type",
    expected: "string",
    received: "number",
    path: ["name"],
    message: "Expected string, received number"
  }
]);
```

#### Tool Not Found Errors

```typescript
// Thrown when tool name doesn't exist
throw new Error(`Tool '${toolName}' not found`);
```

#### Execution Errors

```typescript
// Thrown during tool execution
throw new Error(`Tool execution failed: ${error.message}`);
```

### Error Handling Patterns

#### 1. Graceful Error Handling

```typescript
async execute(input) {
  try {
    const result = await riskyOperation(input);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
```

#### 2. Error Propagation

```typescript
async execute(input) {
  // Let errors bubble up to be handled by the framework
  const result = await riskyOperation(input);
  return result;
}
```

#### 3. Custom Error Types

```typescript
class ToolError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ToolError';
  }
}

async execute(input) {
  if (!input.required) {
    throw new ToolError(
      'Required parameter missing',
      'MISSING_PARAMETER',
      { parameter: 'required' }
    );
  }
}
```

## 📝 Type Definitions

### Core Types

```typescript
// Tool interface
interface LuaTool<TInput extends ZodType, TOutput extends ZodType> {
  name: string;
  description: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  execute(input: z.infer<TInput>): Promise<z.infer<TOutput>>;
}

// Skill class
class LuaSkill {
  constructor();
  addTool<TInput, TOutput>(tool: LuaTool<TInput, TOutput>): void;
  run(input: Record<string, any>): Promise<any>;
}

// Tool execution context
interface ExecutionContext {
  toolName: string;
  input: any;
  startTime: number;
  requestId: string;
}

// Tool result
interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  duration?: number;
}
```

### Utility Types

```typescript
// Extract input type from tool
type ToolInput<T> = T extends LuaTool<infer I, any> ? z.infer<I> : never;

// Extract output type from tool
type ToolOutput<T> = T extends LuaTool<any, infer O> ? z.infer<O> : never;

// Tool registry
type ToolRegistry = Record<string, LuaTool<any, any>>;

// Skill configuration
interface SkillConfig {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
}
```

### Service Types

```typescript
// HTTP service configuration
interface HttpServiceConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
}

// Database service configuration
interface DatabaseServiceConfig {
  connectionString: string;
  poolSize?: number;
  timeout?: number;
}

// Cache service configuration
interface CacheServiceConfig {
  ttl: number;
  maxSize?: number;
  strategy?: 'lru' | 'fifo';
}
```

## 🔧 Configuration

### Package.json

```json
{
  "name": "my-lua-skill",
  "version": "1.0.0",
  "type": "module",
  "main": "index.ts",
  "scripts": {
    "build": "tsc",
    "test": "lua test",
    "compile": "lua compile",
    "deploy": "lua deploy"
  },
  "dependencies": {
    "lua-cli": "^1.0.0",
    "zod": "^3.22.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## 📊 Performance Metrics

### Tool Execution Metrics

```typescript
interface ExecutionMetrics {
  executionCount: number;
  successCount: number;
  errorCount: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  lastExecution?: Date;
}
```

### Memory Usage

```typescript
interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}
```

### Bundle Metrics

```typescript
interface BundleMetrics {
  totalSize: number;
  compressedSize: number;
  dependencyCount: number;
  toolCount: number;
}
```

This API reference provides complete documentation for building LuaSkills with the Lua CLI framework.
