import { z } from 'zod'
import { MESSAGES } from '@/shared/constants/messages'

const CURRENCY_REGEX = /^[A-Z]{3}$/

export const settingsSchema = z.object({
  currency: z.string().regex(CURRENCY_REGEX, MESSAGES.validation.invalidCurrency),
  locale: z.string().min(1),
  theme: z.enum(['light', 'dark', 'system']),
  deviceId: z.string().min(1, MESSAGES.validation.missingDeviceId),
  dismissedSignInBanner: z.boolean(),
})

export type SettingsSchemaInput = z.infer<typeof settingsSchema>
