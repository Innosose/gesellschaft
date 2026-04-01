/**
 * sanitizeHtml — XSS sanitization unit tests
 */
import { sanitizeHtml } from '../../src/renderer/src/utils/sanitize'

describe('sanitizeHtml', () => {
  describe('dangerous element removal', () => {
    it('removes script tags', () => {
      const result = sanitizeHtml('<p>hello</p><script>alert("xss")</script>')
      expect(result).not.toContain('<script')
      expect(result).toContain('<p>hello</p>')
    })

    it('removes iframe tags', () => {
      const result = sanitizeHtml('<p>safe</p><iframe src="evil.com"></iframe>')
      expect(result).not.toContain('<iframe')
      expect(result).toContain('<p>safe</p>')
    })

    it('removes object tags', () => {
      const result = sanitizeHtml('<object data="evil.swf"></object><p>ok</p>')
      expect(result).not.toContain('<object')
    })

    it('removes embed tags', () => {
      const result = sanitizeHtml('<embed src="evil.swf"><p>ok</p>')
      expect(result).not.toContain('<embed')
    })

    it('removes form tags', () => {
      const result = sanitizeHtml('<form action="evil.com"><input></form><p>ok</p>')
      expect(result).not.toContain('<form')
    })
  })

  describe('event handler removal', () => {
    it('removes onerror', () => {
      const result = sanitizeHtml('<img onerror="alert(1)" src="x">')
      expect(result).not.toContain('onerror')
    })

    it('removes onclick', () => {
      const result = sanitizeHtml('<div onclick="alert(1)">click</div>')
      expect(result).not.toContain('onclick')
      expect(result).toContain('click')
    })

    it('removes onload', () => {
      const result = sanitizeHtml('<body onload="alert(1)"><p>text</p></body>')
      expect(result).not.toContain('onload')
    })

    it('removes onmouseover', () => {
      const result = sanitizeHtml('<span onmouseover="evil()">text</span>')
      expect(result).not.toContain('onmouseover')
    })
  })

  describe('javascript: href removal', () => {
    it('removes javascript: in href', () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>')
      expect(result).not.toContain('javascript:')
    })

    it('preserves normal href', () => {
      const result = sanitizeHtml('<a href="https://example.com">link</a>')
      expect(result).toContain('href="https://example.com"')
    })
  })

  describe('safe content preservation', () => {
    it('preserves basic formatting tags', () => {
      const html = '<p><strong>bold</strong> and <em>italic</em></p>'
      expect(sanitizeHtml(html)).toBe(html)
    })

    it('preserves lists', () => {
      const html = '<ul><li>one</li><li>two</li></ul>'
      expect(sanitizeHtml(html)).toBe(html)
    })

    it('preserves headings', () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2>'
      expect(sanitizeHtml(html)).toBe(html)
    })

    it('preserves code blocks', () => {
      const html = '<pre><code>const x = 1</code></pre>'
      expect(sanitizeHtml(html)).toBe(html)
    })

    it('preserves plain text', () => {
      expect(sanitizeHtml('just plain text')).toBe('just plain text')
    })

    it('handles empty string', () => {
      expect(sanitizeHtml('')).toBe('')
    })
  })

  describe('mixed dangerous and safe content', () => {
    it('removes script but preserves surrounding HTML', () => {
      const result = sanitizeHtml('<h1>Title</h1><script>evil()</script><p>body</p>')
      expect(result).toBe('<h1>Title</h1><p>body</p>')
    })

    it('strips event handlers but preserves element and content', () => {
      const result = sanitizeHtml('<div onclick="evil()" class="safe">content</div>')
      expect(result).not.toContain('onclick')
      expect(result).toContain('class="safe"')
      expect(result).toContain('content')
    })
  })
})
