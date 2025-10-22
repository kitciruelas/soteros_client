import { useEffect, useState } from 'react'

interface AnimatedCounterProps {
  value: number
  duration?: number
  isVisible: boolean
  suffix?: string
  prefix?: string
  className?: string
}

const AnimatedCounter = ({ 
  value, 
  duration = 2000, 
  isVisible, 
  suffix = '', 
  prefix = '',
  className = ''
}: AnimatedCounterProps) => {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    if (isVisible && !hasAnimated) {
      setHasAnimated(true)
      
      const startTime = Date.now()
      const startValue = 0
      const endValue = value

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutCubic)
        
        setCount(currentValue)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setCount(endValue)
        }
      }
      
      requestAnimationFrame(animate)
    }
  }, [isVisible, value, duration, hasAnimated])

  // Reset animation when value changes (for dynamic stats)
  useEffect(() => {
    if (isVisible) {
      setHasAnimated(false)
    }
  }, [value, isVisible])

  return (
    <span className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}

export default AnimatedCounter
