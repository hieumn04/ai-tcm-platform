import {
  Circle,
  Clock,
  CircleCheck,
  CircleDashed,
  CircleX,
  CircleSlash2,
} from 'lucide-react'

export const renderStatusIcon = (uid: string) => {
  switch (uid) {
    case 'untested':
      return <Circle size={16} color="#d4d4d8" />
    case 'pending':
      return <Clock size={16} color="#1e90ff" />
    case 'passed':
      return <CircleCheck size={16} color="#17c964" />
    case 'retest':
      return <CircleDashed size={16} color="#f5a524" />
    case 'failed':
      return <CircleX size={16} color="#f31260" />
    case 'skipped':
      return <CircleSlash2 size={16} color="#52525b" />
    default:
      return null
  }
}
