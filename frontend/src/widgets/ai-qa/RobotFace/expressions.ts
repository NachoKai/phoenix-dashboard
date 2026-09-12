import type {
  EmotionDefinition,
  ExpressionConfig,
  MotionConfig,
  ActivityState,
} from './types'

const BASE_EXPRESSION: ExpressionConfig = {
  eyeShape: 'circle',
  eyeSquish: 1,
  eyeOpacity: 1,
  mouthPath: 'M -25 30 Q 0 35 25 30',
  mouthColor: '#4fd1c5',
  mouthWidth: 4,
  mouthFill: 'none',
}

export const EXPRESSIONS: Record<string, ExpressionConfig> = {
  neutral: BASE_EXPRESSION,
  happy: {
    ...BASE_EXPRESSION,
    eyeShape: 'arc',
    eyeSquish: 0.2,
    mouthPath: 'M -35 35 Q 0 55 35 35',
    mouthColor: '#f6ad55',
    mouthWidth: 6,
  },
  excited: {
    ...BASE_EXPRESSION,
    eyeShape: 'arc',
    eyeSquish: 0.08,
    mouthPath: 'M -38 32 Q 0 60 38 32',
    mouthColor: '#fbd38d',
    mouthWidth: 7,
    mouthFill: 'none',
  },
  sad: {
    ...BASE_EXPRESSION,
    eyeShape: 'droopy',
    eyeOpacity: 0.45,
    mouthPath: 'M -28 28 Q 0 8 28 28',
    mouthColor: '#90cdf4',
    mouthWidth: 3,
  },
  surprised: {
    ...BASE_EXPRESSION,
    eyeShape: 'wide',
    eyeSquish: 1.3,
    mouthPath: 'circle',
    mouthFill: '#4fd1c5',
  },
  confused: {
    ...BASE_EXPRESSION,
    eyeShape: 'asymmetric',
    eyeOpacity: 0.8,
    mouthPath: 'M -25 28 Q -10 38 0 30 Q 10 22 25 32',
    mouthWidth: 3,
  },
  sleeping: {
    ...BASE_EXPRESSION,
    eyeShape: 'droopy',
    eyeOpacity: 0.1,
    eyeSquish: 0.15,
    mouthPath: 'M -12 31 Q 0 33 12 31',
    mouthWidth: 2,
    mouthColor: '#a0aec0',
  },
  angry: {
    ...BASE_EXPRESSION,
    eyeShape: 'arc',
    eyeSquish: -0.7,
    mouthPath: 'M -26 36 Q -8 24 0 30 Q 8 36 26 28',
    mouthColor: '#fc8181',
    mouthWidth: 3,
  },
}

export const ACTIVITY_MOTIONS: Record<ActivityState, MotionConfig> = {
  idle: { duration: 0 },
  thinking: { y: [0, -4, -2, -4, 0], rotate: [0, 2, -1, 0], duration: 2.5 },
  talking: { y: [0, -2, 0], x: [0, -1, 1, -0.5, 0], duration: 0.35 },
  listening: { rotate: [0, 3, -1, 2, -2, 0], y: [0, -1, 0], duration: 3.5 },
}

export const IDLE_MOTIONS: Record<string, MotionConfig> = {
  neutral: { duration: 0 },
  happy: { y: [-3, 1, -2, 0], scale: [1, 1.025, 0.99, 1], duration: 0.65 },
  sad: { y: [0, 5, 3, 5, 2], scale: [1, 0.97, 0.98, 0.97, 1], duration: 6 },
  surprised: { y: [-8, 4, -2, 0], scale: [1.12, 0.9, 1.04, 1], duration: 0.22 },
  confused: { rotate: [-5, 5, -3, 2, -1, 0], y: [0, -1, 1, 0], duration: 2.5 },
  sleeping: {
    y: [0, 3, 2, 3, 0],
    scale: [1, 0.985, 0.99, 0.985, 1],
    duration: 5,
  },
  excited: {
    y: [-9, 5, -4, 2, -1],
    scale: [1.07, 0.93, 1.05, 0.97, 1],
    x: [-2, 2, -1, 1, 0],
    duration: 0.12,
  },
  angry: {
    x: [-4, 4, -3, 3, -2, 2, -1, 0],
    scale: [1.06, 1.1, 1.06, 1],
    y: [-2, 0],
    duration: 0.16,
  },
}

export function getEmotionDefinition(emotion: string): EmotionDefinition {
  return {
    expression: EXPRESSIONS[emotion] || EXPRESSIONS.neutral,
    activityMotion: ACTIVITY_MOTIONS.idle,
    idleMotion: IDLE_MOTIONS[emotion] || IDLE_MOTIONS.neutral,
  }
}

export function getActivityMotion(activity: ActivityState): MotionConfig {
  return ACTIVITY_MOTIONS[activity] || ACTIVITY_MOTIONS.idle
}

export function mergeMotions(
  emotionMotion: MotionConfig,
  activityMotion: MotionConfig,
): MotionConfig {
  if (activityMotion.duration === 0) return emotionMotion

  return {
    ...emotionMotion,
    y: emotionMotion.y || activityMotion.y,
    x: emotionMotion.x || activityMotion.x,
    rotate: emotionMotion.rotate || activityMotion.rotate,
    scale: emotionMotion.scale || activityMotion.scale,
    duration: activityMotion.duration,
  }
}
