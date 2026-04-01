/**
 * Sanitize HTML — remove dangerous elements and attributes
 * Uses DOMParser (available in browser and jsdom)
 */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, iframe, object, embed, form').forEach(el => el.remove())
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on') || (attr.name === 'href' && attr.value.startsWith('javascript:'))) {
        el.removeAttribute(attr.name)
      }
    }
  })
  return doc.body.innerHTML
}
