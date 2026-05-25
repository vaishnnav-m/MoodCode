import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

const spotifyTokenSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    scope: { type: String, required: true },
  },
  { timestamps: true },
);

export type SpotifyTokenDocFields = InferSchemaType<typeof spotifyTokenSchema>;
export type SpotifyTokenDocument = HydratedDocument<SpotifyTokenDocFields>;

export const SpotifyToken = model('SpotifyToken', spotifyTokenSchema);
