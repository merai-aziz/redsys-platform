'use client'

import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

export function ConfigStepper({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: Array<{ id: string; label: string; isComplete: boolean }>
  currentStep: number
  onStepClick: (index: number) => void
}) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex min-w-max items-start gap-0">
        {steps.map((step, index) => {
          const isActive = index === currentStep
          const isComplete = step.isComplete
          const isPending = !isActive && !isComplete

          return (
            <div key={step.id} className="flex min-w-[120px] flex-1 items-start">
              <button
                type="button"
                onClick={() => onStepClick(index)}
                className="group flex flex-col items-center gap-2 text-center"
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition',
                    isComplete && 'border-emerald-600 bg-emerald-600 text-white',
                    isActive && 'border-sky-600 bg-sky-600 text-white',
                    isPending && 'border-slate-300 bg-white text-slate-500',
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span
                  className={cn(
                    'max-w-[120px] text-xs font-medium',
                    isActive ? 'text-sky-700' : isComplete ? 'text-emerald-700' : 'text-slate-500',
                  )}
                >
                  {step.label}
                </span>
              </button>

              {index < steps.length - 1 ? (
                <div className="mt-4 h-[2px] flex-1 bg-slate-200">
                  <div
                    className={cn(
                      'h-full transition-all',
                      step.isComplete ? 'w-full bg-emerald-500' : 'w-0 bg-transparent',
                    )}
                  />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
