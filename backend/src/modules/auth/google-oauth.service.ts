import jwt from "jsonwebtoken";
import passport from "passport";
import {
	Strategy as GoogleStrategy,
	type Profile,
	type VerifyCallback,
} from "passport-google-oauth20";
import { env } from "../../../config/env.config";
import { authLogger } from "../../services/logger.service";

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
	const callbackURL =
		process.env.GOOGLE_AUTH_CALLBACK_URL ||
		`http://localhost:${env.PORT || 4100}/api/v1/auth/google/callback`;

	passport.use(
		new GoogleStrategy(
			{
				clientID: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
				callbackURL,
			},
			async (
				accessToken: string,
				refreshToken: string,
				profile: Profile,
				done: VerifyCallback,
			) => {
				try {
					const email = profile.emails?.[0]?.value;

					if (!email) {
						return done(null, false, {
							message: "No email provided by Google.",
						});
					}

					const normalizedEmail = email.toLowerCase().trim();

					// Check if user is in our DB
					const { db } = require("../../../database/client");
					const { users } = require("../../../database/schema");
					const { eq } = require("drizzle-orm");
					const crypto = require("crypto");

					const userRecords = await db
						.select()
						.from(users)
						.where(eq(users.email, normalizedEmail))
						.limit(1);

					let existingUser = userRecords.length > 0 ? userRecords[0] : null;

					if (!existingUser) {
						authLogger.warn(
							{ email: normalizedEmail },
							"Google OAuth sign in attempted for unregistered account",
						);
						return done(null, false, {
							message: "Account not found in organization workspace",
						});
					}

					if (
						existingUser.status === "Locked" ||
						existingUser.status === "Suspended" ||
						existingUser.status === "Deleted"
					) {
						return done(null, false, {
							message: `Unauthorized account. Account is ${existingUser.status}.`,
						});
					}

					authLogger.info(
						{ googleId: profile.id },
						"Google OAuth strategy authenticated user",
					);

					const user = {
						id: existingUser.id,
						name: existingUser.name,
						email: existingUser.email,
						avatar: profile.photos?.[0]?.value || existingUser.avatar,
						role: existingUser.role,
						provider: "google",
					};

					// Update user's avatar and googleId if needed
					await db
						.update(users)
						.set({
							avatar: profile.photos?.[0]?.value || existingUser.avatar,
							googleId: profile.id,
							isGoogleEnabled: true,
						})
						.where(eq(users.id, existingUser.id));

					return done(null, user);
				} catch (error: any) {
					authLogger.error({ err: error }, "Google OAuth Strategy Error");
					return done(error);
				}
			},
		),
	);
	authLogger.trace("Google OAuth 2.0 Strategy initialized");
}

export { passport };
