import { Button } from '@cherrystudio/ui'
import { resolveIcon } from '@cherrystudio/ui/icons'
import { ModelSelector } from '@renderer/components/ModelSelector'
import { getProviderDisplayName } from '@renderer/components/ModelSelector/utils'
import { useModels } from '@renderer/hooks/useModel'
import { useProviders } from '@renderer/hooks/useProvider'
import type { FileProcessorFeature } from '@shared/data/preference/preferenceTypes'
import type { Model } from '@shared/data/types/model'
import { ChevronDown } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const MODEL_SELECTOR_VISIBLE_COUNT = 8

const CUSTOM_OCR_MODEL_IDS = ['DeepSeek-OCR', 'qwen-vl-ocr-latest']
const CUSTOM_DOCUMENT_MODEL_IDS = ['somark', 'hehe-tywd']

type ModelReferenceSelectorProps = {
  feature: FileProcessorFeature
  providerRef?: { providerId: string; modelId: string }
  onSelect: (providerRef: { providerId: string; modelId: string } | undefined) => void
}

function getModelIdsForFeature(feature: FileProcessorFeature): string[] {
  return feature === 'image_to_text' ? CUSTOM_OCR_MODEL_IDS : CUSTOM_DOCUMENT_MODEL_IDS
}

function getModelIdentifier(model: Model): string {
  return model.apiModelId ?? model.id
}

function getModelInitial(model: Model): string {
  return model.name.trim().charAt(0) || 'M'
}

export function ModelReferenceSelector({ feature, providerRef, onSelect }: ModelReferenceSelectorProps) {
  const { t } = useTranslation()
  const { providers } = useProviders({ enabled: true })
  const { models } = useModels()

  const allowedModelIds = useMemo(() => getModelIdsForFeature(feature), [feature])

  const filter = useCallback(
    (model: Model) => {
      const modelIdentifier = getModelIdentifier(model)
      return allowedModelIds.includes(modelIdentifier)
    },
    [allowedModelIds]
  )

  const selectedModel = useMemo(() => {
    if (!providerRef) return undefined
    return models.find((m) => {
      const modelIdentifier = getModelIdentifier(m)
      return m.providerId === providerRef.providerId && modelIdentifier === providerRef.modelId
    })
  }, [providerRef, models])

  const handleSelect = useCallback(
    (model: Model | undefined) => {
      if (!model) {
        onSelect(undefined)
        return
      }
      onSelect({ providerId: model.providerId, modelId: getModelIdentifier(model) })
    },
    [onSelect]
  )

  const trigger = useMemo(() => {
    const icon = selectedModel ? resolveIcon(getModelIdentifier(selectedModel), selectedModel.providerId) : null
    const provider = selectedModel ? providers.find((p) => p.id === selectedModel.providerId) : undefined

    return (
      <Button
        type="button"
        variant="outline"
        className="h-7.5 min-w-0 flex-1 justify-between px-2.5 text-left font-normal">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {selectedModel ? (
            icon ? (
              <icon.Avatar size={20} />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-xs">
                {getModelInitial(selectedModel)}
              </span>
            )
          ) : null}
          <span className="min-w-0 flex-1 truncate">
            {selectedModel?.name ?? t('settings.tool.file_processing.fields.select_model')}
          </span>
          {provider ? (
            <span className="max-w-[32%] truncate text-muted-foreground text-xs">
              {getProviderDisplayName(provider)}
            </span>
          ) : null}
        </span>
        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
      </Button>
    )
  }, [selectedModel, providers, t])

  return (
    <ModelSelector
      multiple={false}
      value={selectedModel}
      onSelect={handleSelect}
      filter={filter}
      listVisibleCount={MODEL_SELECTOR_VISIBLE_COUNT}
      trigger={trigger}
    />
  )
}
