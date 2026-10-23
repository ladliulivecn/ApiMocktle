import type { Monaco } from '@monaco-editor/react'
import { open } from '@tauri-apps/plugin-shell'

/** 只允许通过系统浏览器打开的协议 */
const ALLOWED_PROTOCOL = /^https?:\/\//i

/** 链接尾部常见标点：JSON 里 URL 后紧跟引号、逗号、括号 */
const TRAILING_PUNCTUATION = /[),.;:'"\]}]+$/

/** 链接头部可能包裹的引号或括号（JSON 字符串场景） */
const LEADING_PUNCTUATION = /^[("'[{]+/

let registered = false

/**
 * 把链接文本规整为可打开的外部地址；非 http/https 一律返回 null。
 *
 * 独立成纯函数，便于单测覆盖协议白名单（避免 file:// 打开本地文件、
 * javascript: 执行脚本）。
 */
export function resolveExternalUrl(raw: string): string | null {
  const url = raw
    .trim()
    .replace(LEADING_PUNCTUATION, '')
    .replace(TRAILING_PUNCTUATION, '')

  return ALLOWED_PROTOCOL.test(url) ? url : null
}

/**
 * 注册 Monaco 全局链接打开器：Ctrl/Cmd + 点击 http(s) 链接时交给系统默认浏览器。
 *
 * Monaco 的 `links` 选项默认开启，命中链接后由这里接管，替代 WebView 内的默认
 * window.open 行为（Tauri 下会被拦截或弹出空白窗口）。
 *
 * 全局只需注册一次，重复调用直接返回。
 */
export function ensureExternalLinkOpener(monaco: Monaco): void {
  if (registered) {
    return
  }

  registered = true

  monaco.editor.registerLinkOpener({
    async open(resource) {
      const url = resolveExternalUrl(resource.toString(true))

      if (!url) {
        return false
      }

      try {
        await open(url)
      }
      catch {
        // 非 Tauri 环境（浏览器调试）降级为新窗口，避免未捕获异常
        window.open(url, '_blank', 'noopener')
      }

      return true
    },
  })
}
