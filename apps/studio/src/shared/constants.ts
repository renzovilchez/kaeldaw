import { Transport } from "@kaeldaw/audio-engine/Transport";

export const TICKS_PER_BEAT_VISUAL = 24;
export const VISUAL_TO_PPQN = Transport.ppqn / TICKS_PER_BEAT_VISUAL;
export const PPQN_TO_VISUAL = TICKS_PER_BEAT_VISUAL / Transport.ppqn;
