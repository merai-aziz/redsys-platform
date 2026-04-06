'use client'

import { Toaster } from 'sonner'

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: '#0f1e31',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          color: '#e2e8f0',
        },
      }}
    />
  )
}
