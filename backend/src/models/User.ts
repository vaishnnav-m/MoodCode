import {
  DEFAULT_BRACKETS,
  THEME_DEFAULTS,
  DEFAULT_SIGNAL_WEIGHTS,
  type MoodName,
  type TimeBracket,
  type UserConfig,
  type SignalWeights,
} from '@moodcode/shared';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const MOOD_NAMES: MoodName[] = ['morning', 'deep_work', 'post_lunch', 'late_night'];

const timeBracketSchema = new Schema<TimeBracket>(
  {
    start: { type: Number, required: true, min: 0, max: 23 },
    end: { type: Number, required: true, min: 0, max: 23 },
    mood: { type: String, required: true, enum: MOOD_NAMES },
    theme: { type: String, required: true },
  },
  { _id: false },
);

const themeMappingsSchema = new Schema<UserConfig['themeMappings']>(
  {
    morning: { type: String, required: true, default: THEME_DEFAULTS.morning },
    deep_work: { type: String, required: true, default: THEME_DEFAULTS.deep_work },
    post_lunch: { type: String, required: true, default: THEME_DEFAULTS.post_lunch },
    late_night: { type: String, required: true, default: THEME_DEFAULTS.late_night },
  },
  { _id: false },
);

const signalWeightsSchema = new Schema<SignalWeights>(
  {
    time: { type: Number, required: true, min: 0, max: 100, default: DEFAULT_SIGNAL_WEIGHTS.time },
    typing: { type: Number, required: true, min: 0, max: 100, default: DEFAULT_SIGNAL_WEIGHTS.typing },
    spotify: { type: Number, required: true, min: 0, max: 100, default: DEFAULT_SIGNAL_WEIGHTS.spotify },
    weather: { type: Number, required: true, min: 0, max: 100, default: DEFAULT_SIGNAL_WEIGHTS.weather },
    git: { type: Number, required: true, min: 0, max: 100, default: DEFAULT_SIGNAL_WEIGHTS.git },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    brackets: { type: [timeBracketSchema], required: true, default: () => DEFAULT_BRACKETS },
    themeMappings: { type: themeMappingsSchema, required: true, default: () => THEME_DEFAULTS },
    signalWeights: { type: signalWeightsSchema, required: true, default: () => DEFAULT_SIGNAL_WEIGHTS },
  },
  { timestamps: true },
);

export type UserDocFields = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserDocFields>;

export const User = model('User', userSchema);
