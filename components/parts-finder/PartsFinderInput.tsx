'use client'

import { Search } from 'lucide-react'

interface PartsFinderInputProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

export function PartsFinderInput({
  placeholder = 'Recherche par modele ou reference',
  value = '',
  onChange,
}: PartsFinderInputProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#d0d9e3] bg-white px-4 py-2 shadow-sm">
      <Search className="h-4 w-4 text-[#7a8fa3]" />
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-[#1a3a52] outline-none placeholder:text-[#8ea2b5]"
      />
    </div>
  )
}
