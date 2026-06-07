import fs from 'node:fs/promises'

import type { FileInfo } from '@shared/file/types'

import type { ImageToTextHandlerOutput } from '../types'

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff'
}

const MAX_OCR_IMAGE_SIZE = 20 * 1024 * 1024

export async function createImageDataUrl(file: FileInfo): Promise<string> {
  if (file.size > MAX_OCR_IMAGE_SIZE) {
    throw new Error(
      `Image file too large for OCR: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${MAX_OCR_IMAGE_SIZE / 1024 / 1024}MB)`
    )
  }

  const extension = file.ext ? `.${file.ext.toLowerCase()}` : ''
  const mime = IMAGE_MIME_BY_EXTENSION[extension]

  if (!mime) {
    throw new Error(`Unsupported image type for custom OCR: ${extension || file.ext}`)
  }

  const buffer = await fs.readFile(file.path)
  return `data:${mime};base64,${buffer.toString('base64')}`
}

interface OpenAIChatMessage {
  role: 'system' | 'user'
  content: string | Array<{ type: string; [key: string]: unknown }>
}

interface OpenAIChatResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export async function callOpenAICompatibleChat(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  imageDataUrl: string,
  signal?: AbortSignal
): Promise<string> {
  const url = `${baseUrl}/chat/completions`

  const messages: OpenAIChatMessage[] = [
    {
      role: 'system',
      content: '<image>\nFree OCR.'
    },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: imageDataUrl }
        }
      ]
    }
  ]

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      messages
    }),
    signal
  })

  if (!response.ok) {
    const errorText = await response.text().then((t) => t.slice(0, 500))
    throw new Error(`OpenAI-compatible API error (${response.status}): ${errorText}`)
  }

  const data = (await response.json()) as OpenAIChatResponse
  return data.choices[0]?.message?.content ?? ''
}

export function buildTextResult(text: string): ImageToTextHandlerOutput {
  if (!text) {
    throw new Error('Custom OCR returned empty text content')
  }

  return {
    kind: 'text',
    text
  }
}
