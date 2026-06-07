import fs from 'node:fs/promises'

import type { FileInfo } from '@shared/file/types'

import type { DocumentToMarkdownHandlerOutput } from '../types'

const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024

interface ResponsesApiRequest {
  model: string
  input: string | { type: string; [key: string]: unknown }[]
}

interface ResponsesApiResult {
  result?: {
    markdown?: string
    outputs?: {
      json?: {
        pages?: Array<{
          blocks?: Array<{
            content?: string
          }>
        }>
      }
    }
  }
  message?: string
  code?: number
}

export async function readFileAsBase64(file: FileInfo): Promise<string> {
  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error(
      `Document file too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB)`
    )
  }

  const buffer = await fs.readFile(file.path)
  return buffer.toString('base64')
}

export async function callResponsesApi(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  fileBase64: string,
  signal?: AbortSignal
): Promise<ResponsesApiResult> {
  const url = `${baseUrl}/responses`

  const body: ResponsesApiRequest = {
    model: modelId,
    input: fileBase64
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    signal
  })

  if (!response.ok) {
    const errorText = await response.text().then((t) => t.slice(0, 500))
    throw new Error(`Responses API error (${response.status}): ${errorText}`)
  }

  return (await response.json()) as ResponsesApiResult
}

export function extractMarkdownFromResult(result: ResponsesApiResult): string {
  // Try Somark-style response first (result.markdown)
  if (result.result?.markdown) {
    return result.result.markdown
  }

  // Try Hehe-style response (result.outputs.json.pages[].blocks[].content)
  const pages = result.result?.outputs?.json?.pages
  if (pages && pages.length > 0) {
    const content = pages
      .flatMap((page) => page.blocks?.map((block) => block.content ?? '') ?? [])
      .filter(Boolean)
      .join('\n\n')
    if (content) {
      return content
    }
  }

  throw new Error('Document parsing returned empty content')
}

export function buildMarkdownResult(markdown: string): DocumentToMarkdownHandlerOutput {
  if (!markdown) {
    throw new Error('Custom document parsing returned empty content')
  }

  return {
    kind: 'markdown',
    markdownContent: markdown
  }
}
