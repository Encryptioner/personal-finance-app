import { z } from 'zod'
import { MESSAGES } from '@/shared/constants/messages'

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const CURRENCY_REGEX = /^[A-Z]{3}$/

function maxFutureDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

const amountSchema = z
  .number({ required_error: MESSAGES.validation.invalidAmount })
  .superRefine((v, ctx) => {
    if (!Number.isInteger(v) || v === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: MESSAGES.validation.invalidAmount })
      return z.NEVER
    }
    if (v < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: MESSAGES.validation.negativeAmount })
      return z.NEVER
    }
  })

/** Shared field definitions reused by both schemas */
const sharedFields = {
  type: z.enum(['income', 'expense', 'transfer'], {
    errorMap: () => ({ message: MESSAGES.validation.invalidType }),
  }),
  amount: amountSchema,
  currency: z
    .string()
    .regex(CURRENCY_REGEX, MESSAGES.validation.invalidCurrency),
  date: z
    .string()
    .regex(ISO_DATE_REGEX, MESSAGES.validation.invalidDate)
    .refine((d) => d <= maxFutureDate(), {
      message: MESSAGES.validation.futureDateTooFar,
    }),
  category: z.string().min(1, MESSAGES.validation.required('category')),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  deletedAt: z.string().optional(),
}

/**
 * Schema for a complete Transaction (includes system-assigned fields).
 * Used when reading from IndexedDB or the Drive file.
 */
export const transactionSchema = z.object({
  id: z.string().min(1, MESSAGES.validation.invalidId),
  ...sharedFields,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  deviceId: z.string().min(1, MESSAGES.validation.missingDeviceId),
})

/**
 * Schema for user-supplied transaction input (no system fields).
 * Used when validating the add/edit form.
 */
export const transactionInputSchema = z.object(sharedFields)

export type TransactionSchemaInput = z.infer<typeof transactionSchema>
export type TransactionInputSchemaInput = z.infer<typeof transactionInputSchema>
