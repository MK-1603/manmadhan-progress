import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GitHubStrategy, type Profile } from "passport-github2";
import { env } from "../../../config/env.config";
import { authLogger } from "../../services/logger.service";

const isGithubConfigured =
	env.GITHUB_CLIENT_ID &&
	env.GITHUB_CLIENT_SECRET &&
	!env.GITHUB_CLIENT_ID.includes("placeholder") &&
	!env.GITHUB_CLIENT_ID.includes("github-client-id") &&
	!env.GITHUB_CLIENT_SECRET.includes("github-client-secret");

if (isGithubConfigured) {
	const callbackURL =
		process.env.GITHUB_AUTH_CALLBACK_URL ||
		process.env.GITHUB_CALLBACK_URL ||
		(process.env.SERVER_URL
			? `${process.env.SERVER_URL.replace(/\/$/, "")}/api/v1/auth/github/callback`
			: `http://localhost:${env.PORT || 4000}/api/v1/auth/github/callback`);

	passport.use(
		new GitHubStrategy(
			{
				clientID: env.GITHUB_CLIENT_ID,
				clientSecret: env.GITHUB_CLIENT_SECRET,
				callbackURL,
				scope: ["user:email"],
			},
			(
				_accessToken: string,
				_refreshToken: string,
				profile: Profile,
				done: (err: any, user?: any) => void,
			) => {
				authLogger.info(
					{ githubId: profile.id, username: profile.username },
					"GitHub OAuth strategy authenticated user",
				);

				const user = {
					id: profile.id,
					name: profile.displayName || profile.username || "GitHub User",
					email:
						profile.emails?.[0]?.value ||
						`${profile.username}@users.noreply.github.com`,
					avatar:
						profile.photos?.[0]?.value ||
						`https://avatars.githubusercontent.com/u/${profile.id}`,
					provider: "github",
				};

				const token = jwt.sign(user, env.JWT_SECRET, { expiresIn: "7d" });
				return done(null, { ...user, token });
			},
		),
	);
	authLogger.trace("GitHub OAuth 2.0 Strategy initialized");
}

export { passport };
