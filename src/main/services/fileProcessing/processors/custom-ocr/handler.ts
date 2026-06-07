import { loggerService } from '@logger'

import { getRequiredCapability, resolveProviderFromRef } from '../../utils/provider'
import type { FileProcessingCapabilityHandler } from '../types'
import { buildTextResult, callOpenAICompatibleChat, createImageDataUrl } from './utils'

const logger = loggerService.withContext('CustomOcrHandler')

export const customOcrHandler: FileProcessingCapabilityHandler<'image_to_text'> = {
  mode: 'background',
  prepare(file, config, signal) {
    signal?.throwIfAborted()
    const capability = getRequiredCapability(config, 'image_to_text', 'custom-ocr')
    const providerRef = capability.providerRef

    if (!providerRef) {
      throw new Error('Custom OCR requires a provider reference. Please select a model in settings.')
    }

    return {
      mode: 'background',
      async execute(executionContext) {
        executionContext.reportProgress(10)
        const resolved = await resolveProviderFromRef(providerRef)
        executionContext.reportProgress(20)
        const imageDataUrl = await createImageDataUrl(file)
        executionContext.reportProgress(30)
        logger.info(`Calling OCR API for file: ${file.name}`)
        const text = await callOpenAICompatibleChat(
          resolved.baseUrl,
          resolved.apiKey,
          resolved.modelId,
          imageDataUrl,
          executionContext.signal
        )
        executionContext.reportProgress(90)
        return buildTextResult(text)
      }
    }
  }
}
