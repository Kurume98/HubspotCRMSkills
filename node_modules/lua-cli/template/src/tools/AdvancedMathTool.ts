// Example: Advanced Math Tool using MathService
import { LuaTool } from "lua-cli/skill";
import { z } from "zod";
import MathService from "../services/MathService";

// Define schemas as static properties for Lua CLI detection
const inputSchema = z.object({
  operation: z.enum(["factorial", "is_prime", "fibonacci", "gcd", "lcm"]).describe("Mathematical operation"),
  numbers: z.array(z.number()).describe("Numbers for the operation")
});

const outputSchema = z.object({
  result: z.any(),
  operation: z.string(),
  input: z.array(z.number())
});

export default class AdvancedMathTool implements LuaTool<typeof inputSchema, typeof outputSchema> {
  name: string;
  description: string;
  inputSchema: typeof inputSchema;
  outputSchema: typeof outputSchema;
  private mathService: MathService;
  
  constructor() {
    this.name = "advanced_math";
    this.description = "Perform advanced mathematical operations";
    this.inputSchema = inputSchema;
    this.outputSchema = outputSchema;
    this.mathService = new MathService();
  }
  
  async execute(input: z.infer<typeof inputSchema>) {
    let result: any;
    
    switch (input.operation) {
      case "factorial":
        if (input.numbers.length !== 1) {
          throw new Error("Factorial requires exactly one number");
        }
        result = this.mathService.factorial(input.numbers[0]);
        break;
        
      case "is_prime":
        if (input.numbers.length !== 1) {
          throw new Error("Prime check requires exactly one number");
        }
        result = this.mathService.isPrime(input.numbers[0]);
        break;
        
      case "fibonacci":
        if (input.numbers.length !== 1) {
          throw new Error("Fibonacci requires exactly one number");
        }
        result = this.mathService.fibonacci(input.numbers[0]);
        break;
        
      case "gcd":
        if (input.numbers.length !== 2) {
          throw new Error("GCD requires exactly two numbers");
        }
        result = this.mathService.gcd(input.numbers[0], input.numbers[1]);
        break;
        
      case "lcm":
        if (input.numbers.length !== 2) {
          throw new Error("LCM requires exactly two numbers");
        }
        result = this.mathService.lcm(input.numbers[0], input.numbers[1]);
        break;
        
      default:
        throw new Error(`Unknown operation: ${input.operation}`);
    }
    
    return {
      result,
      operation: input.operation,
      input: input.numbers
    };
  }
}
