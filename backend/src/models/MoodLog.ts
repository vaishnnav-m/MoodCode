import type { MoodName } from '@moodcode/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const MOOD_NAMES: MoodName[] = ['morning', 'deep_work', 'post_lunch', 'late_night'];

const LOG_SOURCES = ['time', 'spotify', 'weather', 'git', 'typing', 'override'] as const;
export type MoodLogSource = (typeof LOG_SOURCES)[number];

const moodLogSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    mood: { type: String, required: true, enum: MOOD_NAMES },
    theme: { type: String, required: true },
    source: { type: String, required: true, enum: LOG_SOURCES },
    timestamp: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: false },
);

moodLogSchema.index({ userId: 1, timestamp: -1 });

export type MoodLogDocFields = InferSchemaType<typeof moodLogSchema>;
export type MoodLogDocument = HydratedDocument<MoodLogDocFields>;

export const MoodLog = model('MoodLog', moodLogSchema);
