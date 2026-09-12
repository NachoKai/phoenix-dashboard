import { memo, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { ActivityState, EmotionState } from './types'
import { EXPRESSIONS, ACTIVITY_MOTIONS, IDLE_MOTIONS } from './expressions'

interface RobotFaceProps {
  activity: ActivityState
  emotion: EmotionState
}

const Eyes = memo(function Eyes({
  activity,
  emotion,
}: {
  activity: ActivityState
  emotion: EmotionState
}) {
  const shouldReduceMotion = false
  const [isBlinking, setIsBlinking] = useState(false)
  const config = EXPRESSIONS[emotion] || EXPRESSIONS.neutral

  useEffect(() => {
    if (emotion === 'sleeping' || shouldReduceMotion) return

    const blinkInterval = setInterval(
      () => {
        setIsBlinking(true)
        setTimeout(() => setIsBlinking(false), 120)
      },
      2500 + Math.random() * 2000,
    )

    return () => clearInterval(blinkInterval)
  }, [emotion, shouldReduceMotion])

  const isThinking = activity === 'thinking'
  const isBlinkingNow = isBlinking || emotion === 'sleeping'

  if (isThinking) {
    return (
      <g className="eyes">
        <path
          d="M -40 2 Q -25 8 -10 2"
          stroke={config.mouthColor}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 10 2 Q 25 8 40 2"
          stroke={config.mouthColor}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    )
  }

  if (config.eyeShape === 'arc') {
    const arch = -15 * config.eyeSquish
    return (
      <g className="eyes">
        <motion.path
          d={`M -45 0 Q -25 ${arch} -5 0`}
          stroke={config.mouthColor}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
        />
        <motion.path
          d={`M 5 0 Q 25 ${arch} 45 0`}
          stroke={config.mouthColor}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
        />
      </g>
    )
  }

  if (config.eyeShape === 'heart') {
    return (
      <g className="eyes">
        <path
          d="M -30 -8 C -30 -20 -15 -20 -15 -8 C -15 5 -30 12 -30 12 C -30 12 -45 5 -45 -8 C -45 -20 -30 -20 -30 -8"
          fill={config.mouthColor}
        />
        <path
          d="M 15 -8 C 15 -20 30 -20 30 -8 C 30 5 15 12 15 12 C 15 12 0 5 0 -8 C 0 -20 15 -20 15 -8"
          fill={config.mouthColor}
        />
      </g>
    )
  }

  const scaleY = isBlinkingNow ? 0.15 : config.eyeShape === 'droopy' ? 0.5 : 1

  return (
    <g className="eyes">
      <motion.g
        animate={{ scaleY, scaleX: isThinking ? 0.85 : 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.12 }}
      >
        <ellipse
          cx="-25"
          cy={0}
          rx="16"
          ry="18"
          fill={config.mouthColor}
          opacity={config.eyeOpacity}
        />
      </motion.g>

      <motion.g
        animate={{ scaleY, scaleX: isThinking ? 0.85 : 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.12 }}
      >
        <ellipse
          cx="25"
          cy={0}
          rx="16"
          ry="18"
          fill={config.mouthColor}
          opacity={config.eyeOpacity}
        />
      </motion.g>
    </g>
  )
})

const Mouth = memo(function Mouth({
  activity,
  emotion,
}: {
  activity: ActivityState
  emotion: EmotionState
}) {
  const config = EXPRESSIONS[emotion] || EXPRESSIONS.neutral
  const isTalking = activity === 'talking'

  if (config.mouthPath === 'circle') {
    return (
      <ellipse
        cx={0}
        cy={30}
        rx={15}
        ry={18}
        fill={config.mouthFill}
        stroke={config.mouthColor}
        strokeWidth={3}
      />
    )
  }

  if (emotion === 'neutral' && isTalking) {
    return (
      <motion.ellipse
        cx={0}
        cy={30}
        rx={10}
        ry={2}
        fill="none"
        stroke={config.mouthColor}
        strokeWidth={2.5}
        animate={isTalking ? { ry: [2, 8, 2] } : { ry: 2 }}
        transition={{
          duration: 0.24,
          repeat: isTalking ? Infinity : 0,
          repeatType: 'mirror',
        }}
      />
    )
  }

  if (emotion === 'sleeping') {
    return (
      <motion.path
        d={config.mouthPath}
        stroke={config.mouthColor}
        strokeWidth={config.mouthWidth}
        fill={config.mouthFill}
        strokeLinecap="round"
        animate={{ opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    )
  }

  return (
    <motion.path
      d={config.mouthPath}
      stroke={config.mouthColor}
      strokeWidth={config.mouthWidth}
      fill={config.mouthFill}
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: config.eyeOpacity }}
      style={{ transformOrigin: '0 30px' }}
      transition={{
        duration: 0.4,
        opacity: { duration: 0.3 },
      }}
    />
  )
})

export const RobotFace = memo(function RobotFace({
  activity,
  emotion,
}: RobotFaceProps) {
  const shouldReduceMotion = false

  const emotionMotion = IDLE_MOTIONS[emotion] || IDLE_MOTIONS.neutral
  const activityMotion = ACTIVITY_MOTIONS[activity] || ACTIVITY_MOTIONS.idle

  const getFaceMotion = () => {
    if (shouldReduceMotion) return { y: 0 }

    const activeMotion =
      activityMotion.duration > 0 ? activityMotion : emotionMotion

    return {
      y: activeMotion.y,
      x: activeMotion.x,
      rotate: activeMotion.rotate,
      scale: activeMotion.scale,
      transition: { repeat: Infinity, duration: activeMotion.duration },
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: '8px',
      }}
    >
      <motion.svg
        viewBox="-55 -25 110 80"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: 'clamp(150px, 35vw, 500px)',
          minWidth: '100px',
        }}
        aria-label={`Robot - ${emotion} emotion, ${activity} activity`}
      >
        <motion.g
          className="face"
          animate={getFaceMotion()}
          style={{ transformOrigin: '0 0' }}
        >
          <Eyes activity={activity} emotion={emotion} />
          <Mouth activity={activity} emotion={emotion} />
        </motion.g>
      </motion.svg>
    </div>
  )
})
