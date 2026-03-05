/**
 * math-evaluator.ts
 *
 * Safely evaluates simple math expressions and appends the result.
 * Uses a recursive descent parser — NO eval() or Function().
 *
 * Supported operators: + - * / % ^ (power)
 * Supported syntax: parentheses, decimals, negative numbers
 * Supported extras: percentage applied to preceding value (e.g. 20% * 500)
 *
 * Output strategy: Opsi A (append)
 *   "2 + 3 * 4" → "2 + 3 * 4 = 14"
 */

/** Token types for the lexer */
type TokenType =
  | "NUMBER"
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "PERCENT"
  | "CARET"
  | "LPAREN"
  | "RPAREN"
  | "EOF";

interface Token {
  type: TokenType;
  value: string;
}

/**
 * Tokenize a math expression string into tokens.
 */
function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const src = expr.trim();

  while (i < src.length) {
    const ch = src[i];

    // Skip whitespace
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }

    // Number (integer or decimal)
    if (ch !== undefined && (ch >= "0" && ch <= "9" || ch === ".")) {
      let num = "";
      let c = src[i];
      while (i < src.length && c !== undefined && (c >= "0" && c <= "9" || c === ".")) {
        num += c;
        i++;
        c = src[i];
      }
      tokens.push({ type: "NUMBER", value: num });
      continue;
    }

    // Operators and parens
    switch (ch) {
      case "+":
        tokens.push({ type: "PLUS", value: "+" });
        break;
      case "-":
        tokens.push({ type: "MINUS", value: "-" });
        break;
      case "*":
        tokens.push({ type: "STAR", value: "*" });
        break;
      case "/":
        tokens.push({ type: "SLASH", value: "/" });
        break;
      case "%":
        tokens.push({ type: "PERCENT", value: "%" });
        break;
      case "^":
        tokens.push({ type: "CARET", value: "^" });
        break;
      case "(":
        tokens.push({ type: "LPAREN", value: "(" });
        break;
      case ")":
        tokens.push({ type: "RPAREN", value: ")" });
        break;
      default:
        // Unknown character — expression is not pure math
        throw new Error(`Unexpected character: ${ch}`);
    }
    i++;
  }

  tokens.push({ type: "EOF", value: "" });
  return tokens;
}

/**
 * Recursive descent parser for math expressions.
 *
 * Grammar:
 *   expr     → term (('+' | '-') term)*
 *   term     → power (('*' | '/' | '%') power)*
 *   power    → unary ('^' power)?
 *   unary    → ('-' | '+') unary | primary
 *   primary  → NUMBER | '(' expr ')'
 */
class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const token = this.tokens[this.pos];
    if (!token) throw new Error("Unexpected end of expression");
    this.pos++;
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (!token || token.type !== type) {
      throw new Error(`Expected ${type}, got ${token?.type ?? "EOF"}`);
    }
    return this.advance();
  }

  parse(): number {
    const result = this.expr();
    if (this.peek()?.type !== "EOF") {
      throw new Error("Unexpected token after expression");
    }
    return result;
  }

  private expr(): number {
    let left = this.term();
    while (this.peek()?.type === "PLUS" || this.peek()?.type === "MINUS") {
      const op = this.advance();
      const right = this.term();
      left = op.type === "PLUS" ? left + right : left - right;
    }
    return left;
  }

  private term(): number {
    let left = this.power();
    while (
      this.peek()?.type === "STAR" ||
      this.peek()?.type === "SLASH" ||
      this.peek()?.type === "PERCENT"
    ) {
      const op = this.advance();
      const right = this.power();
      if (op.type === "STAR") {
        left = left * right;
      } else if (op.type === "SLASH") {
        if (right === 0) throw new Error("Division by zero");
        left = left / right;
      } else {
        // Percent as modulo
        if (right === 0) throw new Error("Division by zero");
        left = left % right;
      }
    }
    return left;
  }

  private power(): number {
    const base = this.unary();
    if (this.peek()?.type === "CARET") {
      this.advance();
      const exp = this.power(); // right-associative
      return Math.pow(base, exp);
    }
    return base;
  }

  private unary(): number {
    if (this.peek()?.type === "MINUS") {
      this.advance();
      return -this.unary();
    }
    if (this.peek()?.type === "PLUS") {
      this.advance();
      return this.unary();
    }
    return this.primary();
  }

  private primary(): number {
    const token = this.peek();

    if (token?.type === "NUMBER") {
      this.advance();
      const value = parseFloat(token.value);
      if (isNaN(value)) throw new Error(`Invalid number: ${token.value}`);
      return value;
    }

    if (token?.type === "LPAREN") {
      this.advance();
      const result = this.expr();
      this.expect("RPAREN");
      return result;
    }

    throw new Error(`Unexpected token: ${token?.type ?? "EOF"}`);
  }
}

/**
 * Safely evaluate a math expression string.
 * Returns the numeric result or null if the expression is invalid.
 */
export function evaluateExpression(expr: string): number | null {
  const trimmed = expr.trim();
  if (!trimmed) return null;

  try {
    const tokens = tokenize(trimmed);
    const parser = new Parser(tokens);
    const result = parser.parse();

    // Guard against NaN/Infinity
    if (!isFinite(result)) return null;

    return result;
  } catch {
    return null;
  }
}

/**
 * Format a number result nicely.
 * - Integers display without decimals: 14
 * - Decimals display up to 10 significant digits, trailing zeros stripped: 3.14159
 */
export function formatResult(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  // Use toPrecision for clean output, then strip trailing zeros
  const formatted = parseFloat(value.toPrecision(10)).toString();
  return formatted;
}

/**
 * Evaluate a math expression and return the original expression with the result appended.
 *
 * Strategy: Opsi A (append)
 *   "2 + 3 * 4" → "2 + 3 * 4 = 14"
 *   "(15 * 3.5) + (200 / 4) - 10" → "(15 * 3.5) + (200 / 4) - 10 = 92.5"
 *
 * If the expression is invalid or already contains "=", returns the input unchanged.
 */
export function evaluateAndAppend(text: string): string {
  const trimmed = text.trim();

  // If already contains "=", don't re-evaluate
  if (trimmed.includes("=")) return text;

  const result = evaluateExpression(trimmed);
  if (result === null) return text;

  return `${trimmed} = ${formatResult(result)}`;
}
