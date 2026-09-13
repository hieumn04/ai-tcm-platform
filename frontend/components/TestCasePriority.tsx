import { priorities } from '@/config/selection'
import { PriorityMessages } from '@/types/priority'

type Props = {
  priorityValue: number
  priorityMessages: PriorityMessages
}

export default function TestCasePriority({
  priorityValue,
  priorityMessages,
}: Props) {
  // Map priorityValue 0,1,2,3 to priorities[0,1,2,3] (critical, high, medium, low)
  const priority = priorities[priorityValue] || priorities[0]

  return (
    <div
      className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold"
      style={{
        backgroundColor: priority.color,
        color: getContrastColor(priority.color),
      }}
    >
      {priorityMessages[priority.uid]}
    </div>
  )
}

// Function to determine best contrast color (white or black)
const getContrastColor = (bgColor: string) => {
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Calculate luminance
  const luminance = (r * 299 + g * 587 + b * 114) / 1000
  return luminance > 128 ? '#000000' : '#FFFFFF'
}
