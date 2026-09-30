'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FilterItem {
  id: string
  type: 'text' | 'select' | 'date'
  placeholder?: string
  label?: string
  options?: Array<{ value: string; label: string }>
  defaultValue?: string
}

interface FilterBarProps {
  filters: FilterItem[]
  onFilterChange?: (filters: Record<string, string>) => void
  onApply?: () => void
  className?: string
}

export function FilterBar({
  filters,
  onFilterChange,
  onApply,
  className,
}: FilterBarProps) {
  const [values, setValues] = React.useState<Record<string, string>>({})

  const handleChange = (id: string, value: string) => {
    const newValues = { ...values, [id]: value }
    setValues(newValues)
    onFilterChange?.(newValues)
  }

  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      {filters.map((filter) => {
        if (filter.type === 'text') {
          return (
            <div key={filter.id} className="min-w-50">
              {filter.label && (
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  {filter.label}
                </label>
              )}
              <Input
                placeholder={filter.placeholder}
                value={values[filter.id] || ''}
                onChange={(e) => handleChange(filter.id, e.target.value)}
              />
            </div>
          )
        }

        if (filter.type === 'select') {
          return (
            <div key={filter.id}>
              {filter.label && (
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  {filter.label}
                </label>
              )}
              <Select value={values[filter.id] || ''} onValueChange={(val) => handleChange(filter.id, val)} >
                <SelectTrigger className='min-w-37.5'>
                  <SelectValue placeholder={filter.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        }

        if (filter.type === 'date') {
          return (
            <div key={filter.id} className="min-w-37.5">
              {filter.label && (
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  {filter.label}
                </label>
              )}
              <Input
                type="date"
                value={values[filter.id] || ''}
                onChange={(e) => handleChange(filter.id, e.target.value)}
              />
            </div>
          )
        }

        return null
      })}

      {onApply && (
        <Button onClick={onApply} className="shrink-0">
          Apply
        </Button>
      )}
    </div>
  )
}
