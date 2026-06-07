import { loggerService } from '@logger'

import { getRequiredCapability, resolveProviderFromRef } from '../../utils/provider'
import type { FileProcessingCapabilityHandler } from '../types'
import { buildMarkdownResult, callResponsesApi, extractMarkdownFromResult, readFileAsBase64 } from './utils'

const logger = loggerService.withContext('CustomDocumentHandler')

export const customDocumentHandler: FileProcessingCapabilityHandler<'document_to_markdown'> = {
  mode: 'background',
  prepare(file, config, signal) {
    signal?.throwIfAborted()
    const capability = getRequiredCapability(config, 'document_to_markdown', 'custom-document')
    const providerRef = capability.providerRef

    if (!providerRef) {
      throw new Error('Custom document parsing requires a provider reference. Please select a model in settings.')
    }

    return {
      mode: 'background',
      async execute(executionContext) {
        executionContext.reportProgress(10)
        const resolved = await resolveProviderFromRef(providerRef)
        executionContext.reportProgress(20)
        const fileBase64 = await readFileAsBase64(file)
        executionContext.reportProgress(30)
        logger.info(`Calling document API for file: ${file.name}`)
        const result = await callResponsesApi(
          resolved.baseUrl,
          resolved.apiKey,
          resolved.modelId,
          fileBase64,
          executionContext.signal
        )
        executionContext.reportProgress(80)
        const markdown = extractMarkdownFromResult(result)
        return buildMarkdownResult(markdown)
      }
    }
  }
}
