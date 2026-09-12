export type ActivityState = 'idle' | 'thinking' | 'talking' | 'listening'

export type EmotionState =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'surprised'
  | 'confused'
  | 'sleeping'
  | 'excited'
  | 'angry'

export type RobotState = ActivityState | EmotionState

export interface ExpressionConfig {
  eyeShape: 'circle' | 'arc' | 'droopy' | 'wide' | 'heart' | 'asymmetric'
  eyeSquish: number
  eyeOpacity: number
  mouthPath: string
  mouthColor: string
  mouthWidth: number
  mouthFill: string
}

export interface MotionConfig {
  y?: number[]
  x?: number[]
  rotate?: number[]
  scale?: number[]
  duration: number
}

export interface EmotionDefinition {
  expression: ExpressionConfig
  activityMotion: MotionConfig
  idleMotion: MotionConfig
}
