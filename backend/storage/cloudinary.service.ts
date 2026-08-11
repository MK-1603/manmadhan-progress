import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.config";
import { logger } from "../src/services/logger.service";

if (
	env.CLOUDINARY_CLOUD_NAME &&
	env.CLOUDINARY_API_KEY &&
	env.CLOUDINARY_API_SECRET
) {
	cloudinary.config({
		cloud_name: env.CLOUDINARY_CLOUD_NAME,
		api_key: env.CLOUDINARY_API_KEY,
		api_secret: env.CLOUDINARY_API_SECRET,
		secure: true,
	});
	logger.trace(
		{ cloudName: env.CLOUDINARY_CLOUD_NAME },
		"Cloudinary SDK configured",
	);
}

export const cloudinaryService = {
	async uploadBase64(
		base64Data: string,
		folder = "manmadhan-progress",
	): Promise<{
		secure_url: string;
		public_id: string;
		optimizeUrl: string;
		autoCropUrl: string;
	}> {
		const result = await cloudinary.uploader.upload(base64Data, {
			folder,
			resource_type: "auto",
		});

		const optimizeUrl = cloudinary.url(result.public_id, {
			fetch_format: "auto",
			quality: "auto",
		});

		const autoCropUrl = cloudinary.url(result.public_id, {
			crop: "auto",
			gravity: "auto",
			width: 500,
			height: 500,
		});

		return {
			secure_url: result.secure_url,
			public_id: result.public_id,
			optimizeUrl,
			autoCropUrl,
		};
	},

	getOptimizeUrl(publicId: string): string {
		return cloudinary.url(publicId, {
			fetch_format: "auto",
			quality: "auto",
		});
	},

	getAutoCropUrl(publicId: string, width = 500, height = 500): string {
		return cloudinary.url(publicId, {
			crop: "auto",
			gravity: "auto",
			width,
			height,
		});
	},

	async deleteAsset(publicId: string): Promise<boolean> {
		const result = await cloudinary.uploader.destroy(publicId);
		return result.result === "ok";
	},

	isConfigured(): boolean {
		return Boolean(
			env.CLOUDINARY_CLOUD_NAME &&
				env.CLOUDINARY_API_KEY &&
				env.CLOUDINARY_API_SECRET,
		);
	},
};
