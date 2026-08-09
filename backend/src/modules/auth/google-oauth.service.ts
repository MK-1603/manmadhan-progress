import passport from "passport";
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import { env } from "../../../config/env.config";
import { authLogger } from "../../services/logger.service";

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:4000/api/v1/auth/google/callback",
      },
      async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
        try {
          const email = profile.emails?.[0]?.value;
          
          if (!email) {
            return done(null, false, { message: "No email provided by Google." });
          }

          if (!email.endsWith("@gmail.com")) {
            return done(null, false, { message: "Unauthorized account. Only Gmail is allowed." });
          }

          // Check if user is in our DB and invited
          const { db } = require("../../../database/client");
          const { users } = require("../../../database/schema");
          const { eq } = require("drizzle-orm");

          const userRecords = await db.select().from(users).where(eq(users.email, email)).limit(1);
          
          const existingUser = userRecords.length > 0 ? userRecords[0] : null;

          if (!existingUser) {
            return done(null, false, { message: "Unauthorized account. You have not been invited." });
          }

          if (!existingUser.isInvited && existingUser.status !== "Seeded" && existingUser.status !== "Created" && existingUser.status !== "Activated") {
            return done(null, false, { message: "Unauthorized account. Account is not correctly initialized." });
          }

          authLogger.info({ googleId: profile.id }, "Google OAuth strategy authenticated user");
          
          const user = {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            avatar: profile.photos?.[0]?.value || existingUser.avatar,
            role: existingUser.role,
            provider: "google",
          };

          // Update user's avatar and googleId if needed
          await db.update(users)
            .set({ 
              avatar: profile.photos?.[0]?.value || existingUser.avatar, 
              googleId: profile.id,
              isGoogleEnabled: true 
            })
            .where(eq(users.id, existingUser.id));

          return done(null, user);
        } catch (error: any) {
          authLogger.error({ err: error }, "Google OAuth Strategy Error");
          return done(error);
        }
      }
    )
  );
  authLogger.trace("Google OAuth 2.0 Strategy initialized");
}

export { passport };
