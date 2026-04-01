/**
 * safeMathEval — safe math expression evaluator unit tests
 */
import { safeMathEval } from '../../src/renderer/src/utils/mathEval'

describe('safeMathEval', () => {
  describe('basic arithmetic', () => {
    it('addition', () => {
      expect(safeMathEval('2+3')).toBe(5)
    })

    it('subtraction', () => {
      expect(safeMathEval('10-3')).toBe(7)
    })

    it('multiplication', () => {
      expect(safeMathEval('4*5')).toBe(20)
    })

    it('division', () => {
      expect(safeMathEval('15/3')).toBe(5)
    })

    it('modulo', () => {
      expect(safeMathEval('10%3')).toBe(1)
    })
  })

  describe('operator precedence', () => {
    it('multiplication before addition', () => {
      expect(safeMathEval('2+3*4')).toBe(14)
    })

    it('parentheses override precedence', () => {
      expect(safeMathEval('(2+3)*4')).toBe(20)
    })

    it('nested parentheses', () => {
      expect(safeMathEval('((2+3))*4')).toBe(20)
    })

    it('complex mixed expression', () => {
      expect(safeMathEval('2+3*4-6/2')).toBe(11) // 2 + 12 - 3
    })
  })

  describe('decimals', () => {
    it('decimal addition', () => {
      expect(safeMathEval('1.5+2.5')).toBe(4)
    })

    it('decimal multiplication', () => {
      expect(safeMathEval('0.1*10')).toBeCloseTo(1)
    })

    it('mixed integer and decimal', () => {
      expect(safeMathEval('3+0.14')).toBeCloseTo(3.14)
    })
  })

  describe('negative numbers', () => {
    it('leading negative', () => {
      expect(safeMathEval('-5+3')).toBe(-2)
    })

    it('double negative', () => {
      expect(safeMathEval('--5')).toBe(5)
    })

    it('negative in parentheses', () => {
      expect(safeMathEval('(-3)*(-2)')).toBe(6)
    })

    it('leading positive sign', () => {
      expect(safeMathEval('+5+3')).toBe(8)
    })
  })

  describe('whitespace handling', () => {
    it('spaces between tokens', () => {
      expect(safeMathEval(' 2 + 3 ')).toBe(5)
    })

    it('tabs and mixed whitespace', () => {
      expect(safeMathEval('\t10\t*\t2\t')).toBe(20)
    })
  })

  describe('division by zero', () => {
    it('direct division by zero throws', () => {
      expect(() => safeMathEval('5/0')).toThrow()
    })

    it('expression resulting in division by zero throws', () => {
      expect(() => safeMathEval('10/(3-3)')).toThrow()
    })
  })

  describe('invalid input', () => {
    it('alphabetic characters throw', () => {
      expect(() => safeMathEval('abc')).toThrow()
    })

    it('empty string throws', () => {
      expect(() => safeMathEval('')).toThrow()
    })

    it('only whitespace throws', () => {
      expect(() => safeMathEval('   ')).toThrow()
    })

    it('special characters throw', () => {
      expect(() => safeMathEval('2^3')).toThrow()
    })

    it('incomplete expression throws', () => {
      expect(() => safeMathEval('2+')).toThrow()
    })

    it('double operators throw', () => {
      expect(() => safeMathEval('2**3')).toThrow()
    })
  })

  describe('large expressions', () => {
    it('chained additions', () => {
      expect(safeMathEval('1+2+3+4+5+6+7+8+9+10')).toBe(55)
    })

    it('complex nested expression', () => {
      expect(safeMathEval('(1+2)*(3+4)/(5-2)')).toBeCloseTo(7) // 3*7/3 = 7
    })
  })
})
