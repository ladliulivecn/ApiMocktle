import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BodyType } from '@/enums'

vi.mock('@/components/MonacoEditor', () => ({
  MonacoEditor: ({ value }: { value?: string }) => <textarea readOnly value={value ?? ''} />,
}))

vi.mock('@/contexts/auth', () => ({ useAuth: () => ({ sessionId: 's1' }) }))

vi.mock('@/api-client', () => ({
  api: vi.fn(() => Promise.resolve([])),
  apiRaw: vi.fn(),
}))

import { BodyPanel } from './BodyPanel'

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

describe('BodyPanel 类型选择器', () => {
  it('requestBody 缺失时仍渲染全部类型标签，并可切到 json', () => {
    const onBodyTypeChange = vi.fn()

    render(<BodyPanel requestBody={undefined} onBodyTypeChange={onBodyTypeChange} />)

    // 不再出现「无 Body」这种没有出口的空态
    expect(screen.queryByText('无 Body')).toBeNull()

    for (const label of ['none', 'form-data', 'url-encoded', 'json', 'xml', 'raw', 'binary']) {
      expect(screen.getByText(label)).toBeTruthy()
    }

    fireEvent.click(screen.getByText('json'))

    expect(onBodyTypeChange).toHaveBeenCalledWith(BodyType.Json)
  })

  it('requestBody 缺失且无回调时保持只读空态', () => {
    render(<BodyPanel requestBody={undefined} />)

    expect(screen.getByText('无 Body')).toBeTruthy()
  })

  it('requestBody 为 none 时展示类型标签与「无请求体」提示', () => {
    render(<BodyPanel requestBody={{ type: BodyType.None }} onBodyTypeChange={vi.fn()} />)

    expect(screen.getByText('json')).toBeTruthy()
    expect(screen.getByText('无请求体')).toBeTruthy()
  })

  it('json 类型渲染编辑器并回显 rawText', () => {
    const { container } = render(
      <BodyPanel
        bodyRawText={'{"a":1}'}
        requestBody={{ type: BodyType.Json }}
        onBodyTypeChange={vi.fn()}
      />,
    )

    expect(container.querySelector('textarea')?.value).toBe('{"a":1}')
  })
})
