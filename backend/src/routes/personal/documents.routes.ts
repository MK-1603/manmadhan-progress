import fs from "node:fs";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { personalDb } from "../../../database/db";
import { personalDocuments } from "../../../database/schema/personal.schema";
import { getUserId } from "../../middleware/auth";
import { authenticate } from "../../middleware/auth.middleware";
import { socketService } from "../../services/socket.service";
import logger from "../../utils/logger";

// Configure multer for file uploads
const storage = multer.diskStorage({
	destination: (_req, _file, cb) => {
		const uploadDir = path.join(process.cwd(), "uploads");
		if (!fs.existsSync(uploadDir)) {
			fs.mkdirSync(uploadDir, { recursive: true });
		}
		cb(null, uploadDir);
	},
	filename: (_req, file, cb) => {
		const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
		cb(null, uniqueName);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for PRD/TRD documents
});

export const personalDocumentsRouter = Router();

personalDocumentsRouter.use(authenticate);

// --- DOCUMENTS ---

// 1. Get all documents for the current user
personalDocumentsRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const documents = await personalDb.query.personalDocuments.findMany({
			where: eq(personalDocuments.ownerUserId, userId),
			orderBy: [desc(personalDocuments.updatedAt)],
		});

		res.json({ success: true, data: documents });
	} catch (error: any) {
		logger.error(`Get Documents Error: ${error.message}`);
		res
			.status(500)
			.json({ success: false, error: "Failed to fetch documents" });
	}
});

// 2. Create or upload a document
personalDocumentsRouter.post(
	"/",
	(req: Request, res: Response, next) => {
		upload.single("file")(req, res, (err: any) => {
			if (err instanceof multer.MulterError) {
				if (err.code === "LIMIT_FILE_SIZE") {
					return res
						.status(413)
						.json({ success: false, error: "File exceeds 25MB limit" });
				}
				return res.status(400).json({ success: false, error: err.message });
			} else if (err) {
				return res
					.status(500)
					.json({ success: false, error: `Upload error: ${err.message}` });
			}
			next();
		});
	},
	async (req: Request, res: Response) => {
		try {
			const userId = getUserId(req);
			if (!userId)
				return res.status(401).json({ success: false, error: "Unauthorized" });

			const { title, content, folder, status } = req.body;
			let url = null;
			let originalName = null;
			let fileType = req.body.fileType || "markdown";
			let sizeBytes = req.body.sizeBytes ? parseInt(req.body.sizeBytes, 10) : 0;

			if (req.file) {
				url = `/uploads/${req.file.filename}`;
				originalName = req.file.originalname;
				fileType = req.file.mimetype;
				sizeBytes = req.file.size;
			}

			// A document can either be a text document (has title) or an uploaded file (has originalName)
			const docTitle = title || originalName || "Untitled";

			const newId = uuidv4();
			const [newDoc] = await personalDb
				.insert(personalDocuments)
				.values({
					id: newId,
					ownerUserId: userId,
					title: docTitle,
					content,
					url,
					originalName,
					folder: folder || "Root",
					fileType,
					sizeBytes,
					status: status || "Active",
				})
				.returning();

			socketService.emitToUser(userId, "document_created", newDoc);
			res.status(201).json({ success: true, data: newDoc });
		} catch (error: any) {
			logger.error(`Create Document Error: ${error.message}`);
			res
				.status(500)
				.json({ success: false, error: "Failed to create document" });
		}
	},
);

// 3. Update a document
personalDocumentsRouter.patch("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const docId = req.params.id as string;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const { title, content, folder, status } = req.body;

		const [updatedDoc] = await personalDb
			.update(personalDocuments)
			.set({
				title,
				content,
				folder,
				status,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(personalDocuments.id, docId),
					eq(personalDocuments.ownerUserId, userId),
				),
			)
			.returning();

		if (!updatedDoc)
			return res
				.status(404)
				.json({ success: false, error: "Document not found" });

		socketService.emitToUser(userId, "document_updated", updatedDoc);
		res.json({ success: true, data: updatedDoc });
	} catch (error: any) {
		logger.error(`Update Document Error: ${error.message}`);
		res
			.status(500)
			.json({ success: false, error: "Failed to update document" });
	}
});

// 4. Delete a document
personalDocumentsRouter.delete("/:id", async (req: Request, res: Response) => {
	try {
		const userId = getUserId(req);
		const docId = req.params.id as string;
		if (!userId)
			return res.status(401).json({ success: false, error: "Unauthorized" });

		const [deletedDoc] = await personalDb
			.delete(personalDocuments)
			.where(
				and(
					eq(personalDocuments.id, docId),
					eq(personalDocuments.ownerUserId, userId),
				),
			)
			.returning();

		if (!deletedDoc)
			return res
				.status(404)
				.json({ success: false, error: "Document not found" });

		// Physical deletion of file if it exists
		if (deletedDoc.url?.startsWith("/uploads/")) {
			const filePath = path.join(process.cwd(), deletedDoc.url);
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		}

		socketService.emitToUser(userId, "document_deleted", { id: docId });
		res.json({ success: true, data: deletedDoc });
	} catch (error: any) {
		logger.error(`Delete Document Error: ${error.message}`);
		res
			.status(500)
			.json({ success: false, error: "Failed to delete document" });
	}
});
