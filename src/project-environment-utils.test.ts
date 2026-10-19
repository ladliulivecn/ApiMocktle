import { describe, expect, it } from 'vitest'

import { parseBaseUrl, resolveBaseUrlProtocol, serializeBaseUrl } from './project-environment-utils'

describe('parseBaseUrl', () => {
  it('拆分 http 协议与域名', () => {
    expect(parseBaseUrl('http://api.example.com')).toEqual({ protocol: 'http', host: 'api.example.com' })
  })

  it('拆分 https 协议与域名（保留路径）', () => {
    expect(parseBaseUrl('https://api.example.com/v1')).toEqual({ protocol: 'https', host: 'api.example.com/v1' })
  })

  it('空值与无协议默认 https', () => {
    expect(parseBaseUrl('')).toEqual({ protocol: 'https', host: '' })
    expect(parseBaseUrl('api.example.com')).toEqual({ protocol: 'https', host: 'api.example.com' })
  })

  it('协议大小写不敏感', () => {
    expect(parseBaseUrl('HTTP://api.example.com')).toEqual({ protocol: 'http', host: 'api.example.com' })
  })
})

describe('serializeBaseUrl', () => {
  it('拼接完整地址', () => {
    expect(serializeBaseUrl('http', 'api.example.com')).toBe('http://api.example.com')
    expect(serializeBaseUrl('https', ' api.example.com ')).toBe('https://api.example.com')
  })

  it('host 为空时返回空串，不写半截协议', () => {
    expect(serializeBaseUrl('http', '')).toBe('')
    expect(serializeBaseUrl('https', '   ')).toBe('')
  })
})

describe('resolveBaseUrlProtocol', () => {
  it('url 非空时以 url 中的协议为准，忽略草稿', () => {
    expect(resolveBaseUrlProtocol('https://api.example.com', { envId: 'e1', protocol: 'http' }, 'e1')).toBe('https')
    expect(resolveBaseUrlProtocol('http://api.example.com', { envId: 'e1', protocol: 'https' }, 'e1')).toBe('http')
  })

  it('url 为空且草稿属于当前环境时使用草稿协议', () => {
    expect(resolveBaseUrlProtocol('', { envId: 'e1', protocol: 'http' }, 'e1')).toBe('http')
  })

  it('url 为空且草稿属于其他环境时回落默认 https，避免切换环境串值', () => {
    expect(resolveBaseUrlProtocol('', { envId: 'e1', protocol: 'http' }, 'e2')).toBe('https')
  })

  it('url 为空且无草稿时默认 https', () => {
    expect(resolveBaseUrlProtocol('', null, 'e1')).toBe('https')
    expect(resolveBaseUrlProtocol('', undefined, 'e1')).toBe('https')
  })
})
