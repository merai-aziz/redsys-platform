'use client'

import { ConfigStepper } from '@/components/configurator/ConfigStepper'

export function ConfigStepperClient({
  steps,
  currentStep,
}: {
  steps: Array<{ id: string; label: string; isComplete: boolean }>
  currentStep: number
}) {
  return (
    <ConfigStepper
      steps={steps}
      currentStep={currentStep}
      onStepClick={(index) => {
        const step = steps[index]
        if (!step) return

        const target = document.getElementById(step.id)
        if (!target) return

        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }}
    />
  )
}
