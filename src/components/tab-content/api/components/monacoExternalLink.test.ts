import { describe, expect, it } from 'vitest'

import { resolveExternalUrl } from './monacoExternalLink'

describe('resolveExternalUrl', () => {
  it('放行 http 与 https 链接', () => {
    expect(resolveExternalUrl('https://example.com/callback')).toBe('https://example.com/callback')
    expect(resolveExternalUrl('http://example.com/a?b=1')).toBe('http://example.com/a?b=1')
    expect(resolveExternalUrl('HTTPS://Example.com/X')).toBe('HTTPS://Example.com/X')
  })

  it('去掉 JSON 里 URL 后紧跟的标点', () => {
    expect(resolveExternalUrl('"https://example.com/cb",')).toBe('https://example.com/cb')
    expect(resolveExternalUrl('https://example.com/cb).')).toBe('https://example.com/cb')
  })

  it('拒绝非 http(s) 协议', () => {
    expect(resolveExternalUrl('file:///etc/passwd')).toBeNull()
    expect(resolveExternalUrl('javascript:alert(1)')).toBeNull()
    expect(resolveExternalUrl('data:text/html,<b>x</b>')).toBeNull()
    expect(resolveExternalUrl('ftp://example.com/a')).toBeNull()
  })

  it('拒绝空串与普通文本', () => {
    expect(resolveExternalUrl('')).toBeNull()
    expect(resolveExternalUrl('   ')).toBeNull()
    expect(resolveExternalUrl('这段是普通描述，不含链接')).toBeNull()
  })

  it('保留已编码的查询参数，不做二次编码', () => {
    expect(resolveExternalUrl('https://example.com/a?q=%E4%B8%AD%E6%96%87')).toBe(
      'https://example.com/a?q=%E4%B8%AD%E6%96%87',
    )
  })
})
