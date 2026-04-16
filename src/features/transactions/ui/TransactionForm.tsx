import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DEFAULT_CATEGORIES } from '../lib/categories'
import type { Transaction, TransactionInput } from '@/shared/types/transaction'
import { MESSAGES } from '@/shared/constants/messages'

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const CURRENCY_REGEX = /^[A-Z]{3}$/

const formSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer'], {
    errorMap: () => ({ message: MESSAGES.validation.invalidType }),
  }),
  amount: z.string().min(1, MESSAGES.validation.required('Amount')),
  currency: z.string().regex(CURRENCY_REGEX, MESSAGES.validation.invalidCurrency),
  date: z.string().regex(ISO_DATE_REGEX, MESSAGES.validation.invalidDate),
  category: z.string().min(1, MESSAGES.validation.required('Category')),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface TransactionFormProps {
  defaultValues?: Partial<Transaction>
  onSubmit: (input: TransactionInput) => void | Promise<void>
  onCancel: () => void
  currency?: string
}

function toMinorUnits(value: string, currency: string): number {
  const decimals = currency === 'JPY' || currency === 'KRW' || currency === 'VND' ? 0 : 2
  const num = parseFloat(value.replace(/,/g, ''))
  return Math.round(num * Math.pow(10, decimals))
}

function fromMinorUnits(minorUnits: number, currency: string): string {
  const decimals = currency === 'JPY' || currency === 'KRW' || currency === 'VND' ? 0 : 2
  return (minorUnits / Math.pow(10, decimals)).toFixed(decimals)
}

export function TransactionForm({ defaultValues, onSubmit, onCancel, currency = 'USD' }: TransactionFormProps) {
  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: defaultValues?.type ?? 'expense',
      amount: defaultValues?.amount != null ? fromMinorUnits(defaultValues.amount, currency) : '',
      currency: defaultValues?.currency ?? currency,
      date: defaultValues?.date ?? today,
      category: defaultValues?.category ?? '',
      description: defaultValues?.description ?? '',
    },
  })

  const currentCurrency = useWatch({ control, name: 'currency' }) ?? currency

  function handleValidSubmit(values: FormValues) {
    void onSubmit({
      type: values.type,
      amount: toMinorUnits(values.amount, values.currency),
      currency: values.currency,
      date: values.date,
      category: values.category,
      description: values.description || undefined,
    })
  }

  return (
    <form onSubmit={(e) => void handleSubmit(handleValidSubmit)(e)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Type */}
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <Select
            defaultValue={defaultValues?.type ?? 'expense'}
            onValueChange={(v) => setValue('type', v as 'income' | 'expense' | 'transfer')}
          >
            <SelectTrigger id="type" aria-describedby={errors.type ? 'type-error' : undefined}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && <p id="type-error" className="text-xs text-destructive">{errors.type.message}</p>}
        </div>

        {/* Currency */}
        <div className="space-y-1.5">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            {...register('currency')}
            placeholder="USD"
            maxLength={3}
            className="uppercase"
            aria-describedby={errors.currency ? 'currency-error' : undefined}
          />
          {errors.currency && <p id="currency-error" className="text-xs text-destructive">{errors.currency.message}</p>}
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount ({currentCurrency})</Label>
        <Input
          id="amount"
          type="number"
          step="any"
          min="0"
          {...register('amount')}
          placeholder="0.00"
          aria-describedby={errors.amount ? 'amount-error' : undefined}
        />
        {errors.amount && <p id="amount-error" className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          {...register('date')}
          aria-describedby={errors.date ? 'date-error' : undefined}
        />
        {errors.date && <p id="date-error" className="text-xs text-destructive">{errors.date.message}</p>}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Select
          defaultValue={defaultValues?.category ?? ''}
          onValueChange={(v) => setValue('category', v)}
        >
          <SelectTrigger id="category" aria-describedby={errors.category ? 'category-error' : undefined}>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {DEFAULT_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && <p id="category-error" className="text-xs text-destructive">{errors.category.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          id="description"
          {...register('description')}
          placeholder="What was this for?"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">Cancel</Button>
        <Button type="submit" className="w-full sm:w-auto">Save</Button>
      </div>
    </form>
  )
}
