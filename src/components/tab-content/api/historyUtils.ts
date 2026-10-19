import { nanoid } from 'nanoid'

import { ParamType } from '@/enums'
import type { ApiEnvironment, Parameter } from '@/types'

export function parseQueryFromUrl(url: string): Parameter[] {
  try {
    const parsed = new URL(url)
    const params: Parameter[] = []
    parsed.searchParams.forEach((value, name) => {
      params.push({
        id: nanoid(6),
        name,
        example: value,
        enable: true,
        type: ParamType.String,
      } as Parameter)
    })

    return params
  }
  catch {
    return []
  }
}

export function parseHistoryParams(
  headers: { name: string, value: string }[],
  url: string,
): { query: Parameter[], header: Parameter[], cookie: Parameter[] } {
  const query = parseQueryFromUrl(url)
  const header: Parameter[] = []
  const cookie: Parameter[] = []

  for (const h of headers) {
    if (h.name.toLowerCase() === 'cookie') {
      h.value.split(';').forEach((pair) => {
        const eqIdx = pair.indexOf('=')

        if (eqIdx > 0) {
          cookie.push({
            id: nanoid(6),
            name: pair.slice(0, eqIdx).trim(),
            example: pair.slice(eqIdx + 1).trim(),
            enable: true,
            type: ParamType.String,
          } as Parameter)
        }
      })
    }
    else {
      header.push({
        id: nanoid(6),
        name: h.name,
        example: h.value,
        enable: true,
        type: ParamType.String,
      } as Parameter)
    }
  }

  return { query, header, cookie }
}

/** 收集多个环境列表里的全部 baseUrl（环境自身 url + baseUrls[].url），用于前缀匹配 */
export function collectEnvironmentBaseUrls(
  ...envLists: (ApiEnvironment[] | undefined)[]
): string[] {
  const urls: string[] = []

  for (const envs of envLists) {
    for (const env of envs ?? []) {
      if (env.url) { urls.push(env.url) }

      for (const base of env.baseUrls ?? []) {
        if (base.url) { urls.push(base.url) }
      }
    }
  }

  return urls
}

function stripQueryAndHash(value: string): string {
  return value.split('#')[0].split('?')[0]
}

/**
 * 把历史记录里的请求 URL 还原成可跟随环境切换的相对路径。
 *
 * 历史落库的是 `buildRequest` 生成的完整 URL（已拼好环境 baseUrl），直接写进
 * `workCopy.path` 会让 `buildRequest` 认为这是绝对地址而跳过 baseUrl 拼接
 * （见 buildRequest.ts 中 `fullPath` 的判断），表现为「切换环境不生效」。
 *
 * 规则：
 * 1. 相对路径：去掉 query / hash 后原样返回；
 * 2. 绝对 URL：按 baseUrls 最长前缀剥离（忽略尾部 `/` 与大小写），剩余部分以 `/` 开头；
 * 3. 未命中任何 baseUrl：只保留 pathname，让请求跟随当前环境。
 */
export function extractPathFromHistoryUrl(
  url: string | undefined,
  baseUrls: string[] = [],
): string {
  const raw = (url ?? '').trim()

  if (!raw) { return '' }

  if (!/^[a-z][\w+.-]*:\/\//i.test(raw)) {
    return stripQueryAndHash(raw)
  }

  const candidates = Array.from(
    new Set(baseUrls.map((base) => base.trim().replace(/\/+$/, '')).filter(Boolean)),
  ).sort((a, b) => b.length - a.length)

  const lowerRaw = raw.toLowerCase()

  for (const base of candidates) {
    const lowerBase = base.toLowerCase()

    if (lowerRaw === lowerBase) { return '/' }

    if (lowerRaw.startsWith(`${lowerBase}/`)) {
      const rest = stripQueryAndHash(raw.slice(base.length))

      return rest.startsWith('/') ? rest : `/${rest}`
    }
  }

  try {
    return new URL(raw).pathname || '/'
  }
  catch {
    return stripQueryAndHash(raw)
  }
}
