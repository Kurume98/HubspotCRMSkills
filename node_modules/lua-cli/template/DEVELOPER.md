# Lua CLI Developer Documentation

This document provides detailed technical information for developers building LuaSkills with the Lua CLI framework.

## 🏗️ Architecture Overview

The Lua CLI framework consists of several key components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LuaSkill      │    │   LuaTool       │    │   Services      │
│   (Orchestrator)│    │   (Individual   │    │   (Shared       │
│                 │    │   Functions)    │    │   Logic)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Bundler       │
                    │   (esbuild)     │
                    └─────────────────┘
```

### Core Components

1. **LuaSkill**: Main orchestrator that manages tools and handles execution
2. **LuaTool**: Individual tool implementations with input/output schemas
3. **Services**: Reusable business logic shared across tools
4. **Bundler**: Compiles and bundles dependencies using esbuild

## 🔧 Tool Development

### Tool Lifecycle

```typescript
// 1. Definition
class MyTool implements LuaTool<InputSchema, OutputSchema> {
  // Tool metadata
  name = "my_tool";
  description = "Tool description";
  
  // 2. Schema Definition
  inputSchema = z.object({...});
  outputSchema = z.object({...});
  
  // 3. Execution
  async execute(input) {
    // Tool logic
    return result;
  }
}

// 4. Registration
const skill = new LuaSkill();
skill.addTool(new MyTool());

// 5. Execution
const result = await skill.run({ tool: "my_tool", ... });
```

### Schema Design Patterns

#### 1. Simple Input/Output
```typescript
inputSchema = z.object({
  text: z.string().describe("Text to process")
});

outputSchema = z.object({
  result: z.string(),
  length: z.number()
});
```

#### 2. Optional Parameters
```typescript
inputSchema = z.object({
  required: z.string(),
  optional: z.string().optional(),
  withDefault: z.string().default("default value")
});
```

#### 3. Union Types
```typescript
inputSchema = z.object({
  format: z.enum(["json", "xml", "csv"]),
  data: z.union([z.string(), z.object({})])
});
```

#### 4. Complex Nested Objects
```typescript
inputSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string().email(),
    preferences: z.object({
      theme: z.enum(["light", "dark"]),
      notifications: z.boolean()
    }).optional()
  }),
  settings: z.record(z.string(), z.any())
});
```

### Error Handling Strategies

#### 1. Graceful Degradation
```typescript
async execute(input) {
  try {
    const result = await riskyOperation(input);
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      fallback: await getFallbackData(input)
    };
  }
}
```

#### 2. Validation Errors
```typescript
async execute(input) {
  // Input is already validated by the framework
  // But you can add additional validation
  if (input.value < 0) {
    throw new Error("Value must be positive");
  }
  
  return { result: input.value * 2 };
}
```

#### 3. Retry Logic
```typescript
async execute(input) {
  const maxRetries = 3;
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await unreliableOperation(input);
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * i));
      }
    }
  }
  
  throw lastError;
}
```

## 🌐 Service Architecture

### Service Design Patterns

#### 1. Singleton Service
```typescript
class DatabaseService {
  private static instance: DatabaseService;
  private connection: Connection;
  
  private constructor() {
    this.connection = new Connection();
  }
  
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
  
  async query(sql: string) {
    return this.connection.query(sql);
  }
}
```

#### 2. Factory Service
```typescript
class ApiServiceFactory {
  static createService(type: 'rest' | 'graphql'): ApiService {
    switch (type) {
      case 'rest':
        return new RestApiService();
      case 'graphql':
        return new GraphQLApiService();
      default:
        throw new Error(`Unknown service type: ${type}`);
    }
  }
}
```

#### 3. Dependency Injection
```typescript
class UserService {
  constructor(
    private dbService: DatabaseService,
    private cacheService: CacheService
  ) {}
  
  async getUser(id: string) {
    // Check cache first
    const cached = await this.cacheService.get(`user:${id}`);
    if (cached) return cached;
    
    // Fetch from database
    const user = await this.dbService.query(`SELECT * FROM users WHERE id = ?`, [id]);
    
    // Cache the result
    await this.cacheService.set(`user:${id}`, user, 3600);
    
    return user;
  }
}
```

### Service Integration Examples

#### 1. HTTP Client Service
```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export class HttpClientService {
  private client: AxiosInstance;
  
  constructor(baseURL: string, timeout = 5000) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LuaSkill/1.0'
      }
    });
    
    // Add request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(`Request failed: ${error.message}`);
        return Promise.reject(error);
      }
    );
  }
  
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }
}
```

#### 2. Database Service
```typescript
export class DatabaseService {
  private pool: Pool;
  
  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }
  
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
  
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

## 📦 Bundling and Dependencies

### How Bundling Works

1. **Dependency Detection**: The bundler scans tool files for imports
2. **Dependency Resolution**: Uses esbuild to resolve and bundle dependencies
3. **Code Generation**: Creates self-contained JavaScript bundles
4. **Compression**: Compresses the final code for storage

### Supported Import Types

#### 1. Default Imports
```typescript
import axios from 'axios';
// Bundled as: const axios = require('axios');
```

#### 2. Named Imports
```typescript
import { z } from 'zod';
// Bundled as: const { z } = require('zod');
```

#### 3. Namespace Imports
```typescript
import * as fs from 'fs';
// Bundled as: const fs = require('fs');
```

#### 4. Local Imports
```typescript
import ApiService from '../services/ApiService';
// Resolved relative to tool file location
```

### Bundling Configuration

The bundler uses the following esbuild configuration:

```typescript
{
  bundle: true,
  format: 'cjs',           // CommonJS for Node.js compatibility
  platform: 'node',       // Node.js platform
  target: 'node16',       // Node.js 16+ features
  external: [],           // Bundle everything (no externals)
  minify: false,          // Keep readable for debugging
  sourcemap: false,       // No source maps
  resolveExtensions: ['.js', '.ts', '.json'],
  mainFields: ['main', 'module', 'browser'],
  conditions: ['node']
}
```

### Handling Different Package Types

#### 1. CommonJS Packages
```typescript
// These work out of the box
import fs from 'fs';
import path from 'path';
```

#### 2. ES Module Packages
```typescript
// Bundled automatically
import axios from 'axios';
import { z } from 'zod';
```

#### 3. Native Modules
```typescript
// May require special handling
import { createHash } from 'crypto';
```

## 🧪 Testing Strategies

### Unit Testing Tools

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import MyTool from '../tools/MyTool';

describe('MyTool', () => {
  let tool: MyTool;
  
  beforeEach(() => {
    tool = new MyTool();
  });
  
  it('should process valid input', async () => {
    const input = { text: 'Hello World' };
    const result = await tool.execute(input);
    
    expect(result).toEqual({
      result: 'HELLO WORLD',
      length: 11
    });
  });
  
  it('should handle invalid input', async () => {
    const input = { text: '' };
    
    await expect(tool.execute(input)).rejects.toThrow('Text cannot be empty');
  });
});
```

### Integration Testing

```typescript
import { LuaSkill } from 'lua-cli/skill';
import MyTool from '../tools/MyTool';

describe('Skill Integration', () => {
  let skill: LuaSkill;
  
  beforeEach(() => {
    skill = new LuaSkill();
    skill.addTool(new MyTool());
  });
  
  it('should execute tool through skill', async () => {
    const result = await skill.run({
      tool: 'my_tool',
      text: 'Hello World'
    });
    
    expect(result.result).toBe('HELLO WORLD');
  });
});
```

### Mocking External Dependencies

```typescript
import { vi } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('ApiTool', () => {
  it('should handle API responses', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { message: 'Success' },
      status: 200
    });
    
    const tool = new ApiTool();
    const result = await tool.execute({ url: 'https://api.example.com' });
    
    expect(result.success).toBe(true);
    expect(result.data.message).toBe('Success');
  });
});
```

## 🚀 Performance Optimization

### 1. Lazy Loading
```typescript
class ExpensiveTool {
  private expensiveService?: ExpensiveService;
  
  private getService() {
    if (!this.expensiveService) {
      this.expensiveService = new ExpensiveService();
    }
    return this.expensiveService;
  }
  
  async execute(input) {
    const service = this.getService();
    return service.process(input);
  }
}
```

### 2. Caching
```typescript
class CachedTool {
  private cache = new Map<string, any>();
  
  async execute(input) {
    const cacheKey = JSON.stringify(input);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = await expensiveOperation(input);
    this.cache.set(cacheKey, result);
    
    return result;
  }
}
```

### 3. Connection Pooling
```typescript
class DatabaseTool {
  private static pool: Pool;
  
  static {
    DatabaseTool.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
  }
  
  async execute(input) {
    const client = await DatabaseTool.pool.connect();
    try {
      return await client.query(input.sql);
    } finally {
      client.release();
    }
  }
}
```

## 🔒 Security Considerations

### 1. Input Sanitization
```typescript
import DOMPurify from 'dompurify';

class SafeTool {
  async execute(input) {
    // Sanitize HTML input
    const cleanHtml = DOMPurify.sanitize(input.html);
    
    // Validate file paths
    const safePath = path.resolve(input.basePath, input.fileName);
    if (!safePath.startsWith(input.basePath)) {
      throw new Error('Invalid file path');
    }
    
    return { cleanHtml, safePath };
  }
}
```

### 2. Rate Limiting
```typescript
class RateLimitedTool {
  private requests = new Map<string, number[]>();
  
  async execute(input) {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 10;
    
    const userRequests = this.requests.get(input.userId) || [];
    const recentRequests = userRequests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      throw new Error('Rate limit exceeded');
    }
    
    recentRequests.push(now);
    this.requests.set(input.userId, recentRequests);
    
    return await processRequest(input);
  }
}
```

### 3. Secret Management
```typescript
class SecureTool {
  async execute(input) {
    // Never log sensitive data
    const sanitizedInput = { ...input };
    delete sanitizedInput.password;
    delete sanitizedInput.apiKey;
    
    console.log('Processing request:', sanitizedInput);
    
    // Use environment variables for secrets
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    
    return await makeSecureRequest(input, apiKey);
  }
}
```

## 📊 Monitoring and Logging

### 1. Structured Logging
```typescript
class LoggedTool {
  async execute(input) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    console.log(JSON.stringify({
      level: 'info',
      message: 'Tool execution started',
      requestId,
      tool: this.name,
      timestamp: new Date().toISOString()
    }));
    
    try {
      const result = await this.processInput(input);
      
      console.log(JSON.stringify({
        level: 'info',
        message: 'Tool execution completed',
        requestId,
        duration: Date.now() - startTime,
        success: true
      }));
      
      return result;
    } catch (error) {
      console.log(JSON.stringify({
        level: 'error',
        message: 'Tool execution failed',
        requestId,
        duration: Date.now() - startTime,
        error: error.message,
        success: false
      }));
      
      throw error;
    }
  }
}
```

### 2. Metrics Collection
```typescript
class MetricsTool {
  private metrics = {
    executionCount: 0,
    successCount: 0,
    errorCount: 0,
    averageDuration: 0
  };
  
  async execute(input) {
    const startTime = Date.now();
    this.metrics.executionCount++;
    
    try {
      const result = await this.processInput(input);
      this.metrics.successCount++;
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.updateAverageDuration(duration);
    }
  }
  
  private updateAverageDuration(duration: number) {
    const total = this.metrics.successCount + this.metrics.errorCount;
    this.metrics.averageDuration = 
      (this.metrics.averageDuration * (total - 1) + duration) / total;
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
}
```

## 🔧 Advanced Patterns

### 1. Plugin Architecture
```typescript
interface ToolPlugin {
  name: string;
  beforeExecute?(input: any): any;
  afterExecute?(result: any): any;
  onError?(error: Error): void;
}

class PluggableTool {
  private plugins: ToolPlugin[] = [];
  
  addPlugin(plugin: ToolPlugin) {
    this.plugins.push(plugin);
  }
  
  async execute(input) {
    let processedInput = input;
    
    // Run before plugins
    for (const plugin of this.plugins) {
      if (plugin.beforeExecute) {
        processedInput = plugin.beforeExecute(processedInput);
      }
    }
    
    try {
      let result = await this.processInput(processedInput);
      
      // Run after plugins
      for (const plugin of this.plugins) {
        if (plugin.afterExecute) {
          result = plugin.afterExecute(result);
        }
      }
      
      return result;
    } catch (error) {
      // Run error plugins
      for (const plugin of this.plugins) {
        if (plugin.onError) {
          plugin.onError(error);
        }
      }
      throw error;
    }
  }
}
```

### 2. Middleware Pattern
```typescript
type Middleware = (input: any, next: () => Promise<any>) => Promise<any>;

class MiddlewareTool {
  private middlewares: Middleware[] = [];
  
  use(middleware: Middleware) {
    this.middlewares.push(middleware);
  }
  
  async execute(input) {
    let index = 0;
    
    const next = async (): Promise<any> => {
      if (index >= this.middlewares.length) {
        return this.processInput(input);
      }
      
      const middleware = this.middlewares[index++];
      return middleware(input, next);
    };
    
    return next();
  }
}
```

This developer documentation provides comprehensive technical guidance for building robust, scalable LuaSkills with the Lua CLI framework.
