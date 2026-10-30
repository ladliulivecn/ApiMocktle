import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ApiRunResult } from '@/types'

/**
 * 结果区集成测试：
 * 恢复历史结果时 result 是异步到达的，页签必须跟着切到「响应内容」，
 * 否则用户看到的是空的「请求内容」区（历史缺陷：activeTab 初值在 result 到达前算定）。
 */

vi.mock('@/components/MonacoEditor', () => ({
  MonacoEditor: ({ value }: { value?: string }) => <pre data-testid="monaco">{value ?? ''}</pre>,
}))

vi.mock('./ResponseBodyViewer', () => ({
  ResponseBodyViewer: ({ body }: { body?: string }) => <div data-testid="resp-body">{body}</div>,
}))

vi.mock('@/contexts/proxy-config', () => ({ useProxyConfig: () => ({ proxyConfig: undefined }) }))

vi.mock('@/contexts/auth', () => ({ useAuth: () => ({ sessionId: 's1' }) }))

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useParams: () => ({ projectId: 'p1' }),
}))

vi.mock('@/api-client', () => ({
  api: vi.fn(() => Promise.resolve([])),
  apiRaw: vi.fn(),
}))

import { ResultViewer } from './ResultViewer'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

function makeResult(overrides: Partial<ApiRunResult> = {}): ApiRunResult {
  return {
    url: 'https://api.example.com/orders',
    method: 'POST',
    status: 200,
    statusText: 'OK',
    durationMs: 12,
    contentType: 'application/json',
    headers: [],
    requestHeaders: [],
    requestQuery: [],
    requestCookie: [],
    requestBodyParameters: [],
    body: '{"ok":true}',
    ...overrides,
  } as ApiRunResult
}

function isTabActive(name: string): boolean {
  return screen.getByRole('tab', { name })?.getAttribute('aria-selected') === 'true'
}

describe('ResultViewer 页签跟随结果', () => {
  it('结果异步到达（恢复历史结果）时切到「响应内容」并渲染响应体', async () => {
    const view = render(<ResultViewer result={undefined} />)

    expect(view.container.textContent).toBe('')

    view.rerender(<ResultViewer result={makeResult()} />)

    await waitFor(() => {
      expect(isTabActive('响应内容')).toBe(true)
    })

    expect(screen.getByTestId('resp-body').textContent).toBe('{"ok":true}')
  })

  it('结果没有响应体时停在「请求内容」', async () => {
    const view = render(<ResultViewer result={undefined} />)

    view.rerender(<ResultViewer result={makeResult({ body: undefined })} />)

    await waitFor(() => {
      expect(isTabActive('请求内容')).toBe(true)
    })
  })

  it('运行出新结果时从「请求内容」自动切回「响应内容」', async () => {
    const view = render(<ResultViewer result={makeResult({ body: undefined })} />)

    await waitFor(() => {
      expect(isTabActive('请求内容')).toBe(true)
    })

    view.rerender(<ResultViewer result={makeResult()} />)

    await waitFor(() => {
      expect(isTabActive('响应内容')).toBe(true)
    })
  })
})
