// Example: Simple Calculator Tool
import { LuaTool } from "lua-cli/skill";
import { z } from "zod";

// Define schemas as static properties for Lua CLI detection
const inputSchema = z.object({
  operation: z.enum(["add", "subtract", "multiply", "divide"]).describe("Mathematical operation"),
  a: z.number().describe("First number"),
  b: z.number().describe("Second number")
});

const outputSchema = z.object({
  result: z.number(),
  operation: z.string(),
  expression: z.string()
});

export default class CalculatorTool implements LuaTool<typeof inputSchema, typeof outputSchema> {
  name: string;
  description: string;
  inputSchema: typeof inputSchema;
  outputSchema: typeof outputSchema;
  
  constructor() {
    this.name = "calculator";
    this.description = "Perform basic mathematical operations";
    this.inputSchema = inputSchema;
    this.outputSchema = outputSchema;
  }
  
  async execute(input: z.infer<typeof inputSchema>) {
    let result: number;
    let expression: string;
    
    switch (input.operation) {
      case "add":
        result = input.a + input.b;
        expression = `${input.a} + ${input.b}`;
        break;
      case "subtract":
        result = input.a - input.b;
        expression = `${input.a} - ${input.b}`;
        break;
      case "multiply":
        result = input.a * input.b;
        expression = `${input.a} × ${input.b}`;
        break;
      case "divide":
        if (input.b === 0) {
          throw new Error("Division by zero is not allowed");
        }
        result = input.a / input.b;
        expression = `${input.a} ÷ ${input.b}`;
        break;
      default:
        throw new Error(`Unknown operation: ${input.operation}`);
    }
    
    return {
      result,
      operation: input.operation,
      expression
    };
  }
}
