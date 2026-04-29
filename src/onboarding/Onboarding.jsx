import { useState } from 'react'
import WelcomeStep from './WelcomeStep.jsx'
import SleepGoalStep from './SleepGoalStep.jsx'
import BaselineStep from './BaselineStep.jsx'
import ReminderStep from './ReminderStep.jsx'

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)

  const steps = [
    <WelcomeStep onNext={() => setStep(1)} />,
    <SleepGoalStep onNext={() => setStep(2)} />,
    <BaselineStep onNext={() => setStep(3)} />,
    <ReminderStep onFinish={onComplete} />,
  ]

  return steps[step]
}
