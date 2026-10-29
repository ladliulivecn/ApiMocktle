import type { ApiDetails, ApiRequestBody, RunTabInfo } from '@/types'

const STORAGE_PREFIX = 'run_tab_'

/** 运行 Tab 本地副本的存储键（按接口 id） */
export function getRunTabStorageKey(apiId: string): string {
  return `${STORAGE_PREFIX}${apiId}`
}

export function cloneApiDetails(source: ApiDetails): ApiDetails {
  return JSON.parse(JSON.stringify(source)) as ApiDetails
}

/** 把「保存到文档」时落库的运行时信息合并进文档定义 */
export function mergeRunTabInfo(docValue: ApiDetails, runTabInfo: RunTabInfo): ApiDetails {
  const base = cloneApiDetails(docValue)
  const hasBodyChanges = runTabInfo.bodyType !== undefined
    || runTabInfo.bodyParameters !== undefined
    || runTabInfo.bodyRawText !== undefined

  return {
    ...base,
    parameters: runTabInfo.parameters ?? base.parameters,
    requestBody: hasBodyChanges
      ? {
          type: runTabInfo.bodyType ?? base.requestBody?.type ?? 'none',
          parameters: runTabInfo.bodyParameters ?? base.requestBody?.parameters,
          rawText: runTabInfo.bodyRawText ?? base.requestBody?.rawText,
        } as ApiRequestBody
      : base.requestBody,
    preScript: runTabInfo.preScript ?? base.preScript,
    postScript: runTabInfo.postScript ?? base.postScript,
  }
}

/**
 * 运行 Tab 的本地副本。
 *
 * `docUpdatedAt` 记录写入时的文档版本（菜单行 `updatedAt`）。旧版本直接存了裸
 * `ApiDetails`，读取时按「无版本戳」兼容，视为未过期以保留用户内容。
 */
export interface LocalRunCopy {
  docUpdatedAt?: string
  workCopy: ApiDetails
}

function isApiDetailsLike(value: unknown): value is ApiDetails {
  return !!value && typeof value === 'object' && typeof (value as ApiDetails).id === 'string' && (value as ApiDetails).id.length > 0
}

export function readLocalRunCopy(storageKey: string): LocalRunCopy | undefined {
  if (!storageKey) { return undefined }

  try {
    const raw = window.localStorage.getItem(storageKey)

    if (!raw) { return undefined }

    const parsed: unknown = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') { return undefined }

    const payload = parsed as { workCopy?: unknown, docUpdatedAt?: unknown }

    if (isApiDetailsLike(payload.workCopy)) {
      return {
        docUpdatedAt: typeof payload.docUpdatedAt === 'string' ? payload.docUpdatedAt : undefined,
        workCopy: payload.workCopy,
      }
    }

    // 旧格式：裸 ApiDetails
    if (isApiDetailsLike(parsed)) {
      return { workCopy: parsed }
    }

    return undefined
  }
  catch {
    return undefined
  }
}

export function writeLocalRunCopy(
  storageKey: string,
  docUpdatedAt: string | undefined,
  workCopy: ApiDetails,
): void {
  if (!storageKey) { return }

  try {
    const payload: LocalRunCopy = { docUpdatedAt, workCopy }
    window.localStorage.setItem(storageKey, JSON.stringify(payload))
  }
  catch {
    // 存储不可用（隐私模式 / 配额）时静默降级：运行 Tab 仍可工作，只是不跨会话恢复
  }
}

export interface ResolveInitialWorkCopyInput {
  docValue: ApiDetails
  savedRunTabInfo?: RunTabInfo
  localCopy?: LocalRunCopy
  docUpdatedAt?: string
}

/**
 * 决定运行 Tab 首次渲染时的 `workCopy`。
 *
 * 纯函数：只依赖入参，不读存储、不看渲染时序，因此「菜单数据早到/晚到」不会
 * 改变结果（这是 Body 二次进入变空白的根因之一）。
 *
 * 决策：
 * 1. 无本地副本 → 文档定义 + 保存点；
 * 2. 本地副本无版本戳（旧格式）或版本一致 → 本地副本（保留用户填写的 Body）；
 * 3. 文档版本已变化 → 文档定义 + 保存点；若两者都没有 Body 原文，则保留本地 Body，
 *    避免「文档没定义 Body」时把用户内容清空。
 */
export function resolveInitialWorkCopy(input: ResolveInitialWorkCopyInput): ApiDetails {
  const { docValue, savedRunTabInfo, localCopy, docUpdatedAt } = input

  const fromDoc = (): ApiDetails => savedRunTabInfo
    ? mergeRunTabInfo(docValue, savedRunTabInfo)
    : cloneApiDetails(docValue)

  if (!localCopy) { return fromDoc() }

  const localIsCurrent = !localCopy.docUpdatedAt || !docUpdatedAt
    ? true
    : localCopy.docUpdatedAt === docUpdatedAt

  if (localIsCurrent) { return cloneApiDetails(localCopy.workCopy) }

  const merged = fromDoc()
  const localRawText = localCopy.workCopy.requestBody?.rawText
  const mergedRawText = merged.requestBody?.rawText

  if (!mergedRawText?.trim() && localRawText?.trim()) {
    merged.requestBody = {
      ...(merged.requestBody ?? { type: localCopy.workCopy.requestBody?.type ?? 'none' }),
      rawText: localRawText,
    } as ApiRequestBody
  }

  return merged
}
