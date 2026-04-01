/**
 * Safe math expression evaluator — recursive descent parser
 * Supports: +, -, *, /, %, parentheses, negative numbers, decimals
 * Rejects any non-numeric/non-operator characters (no eval/Function)
 */
export function safeMathEval(expr: string): number {
  const tokens: string[] = []
  let i = 0
  const s = expr.replace(/\s/g, '')
  if (s.length === 0) throw new Error('빈 수식')
  while (i < s.length) {
    if ('0123456789.'.includes(s[i])) {
      let num = ''
      while (i < s.length && '0123456789.'.includes(s[i])) { num += s[i]; i++ }
      tokens.push(num)
    } else if ('+-*/%()'.includes(s[i])) {
      tokens.push(s[i]); i++
    } else {
      throw new Error('잘못된 문자')
    }
  }
  let pos = 0
  function peek(): string { return tokens[pos] ?? '' }
  function consume(): string { return tokens[pos++] }
  function parseExpr(): number {
    let left = parseTerm()
    while (peek() === '+' || peek() === '-') {
      const op = consume()
      const right = parseTerm()
      left = op === '+' ? left + right : left - right
    }
    return left
  }
  function parseTerm(): number {
    let left = parseFactor()
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume()
      const right = parseFactor()
      if (op === '*') left *= right
      else if (op === '/') { if (right === 0) throw new Error('0으로 나눌 수 없습니다'); left /= right }
      else left %= right
    }
    return left
  }
  function parseFactor(): number {
    if (peek() === '(') { consume(); const v = parseExpr(); if (peek() === ')') consume(); return v }
    if (peek() === '-') { consume(); return -parseFactor() }
    if (peek() === '+') { consume(); return parseFactor() }
    const n = parseFloat(consume())
    if (isNaN(n)) throw new Error('잘못된 숫자')
    return n
  }
  const result = parseExpr()
  if (pos < tokens.length) throw new Error('잘못된 수식')
  return result
}
