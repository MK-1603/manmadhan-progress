import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Request, Response } from "express";
import { db } from "../../database/client";

export class CrudFactory<T extends PgTable<any>> {
	constructor(
		private table: T,
		private idField: any,
	) {}

	getAll = async (req: Request, res: Response) => {
		try {
			const records = await db.select().from(this.table as any);
			return res.json({ success: true, data: records });
		} catch (error: any) {
			return res.status(500).json({ success: false, error: error.message });
		}
	};

	getById = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const records = await db
				.select()
				.from(this.table as any)
				.where(eq(this.idField, id as string))
				.limit(1);
			if (!(records as any[]).length)
				return res.status(404).json({ success: false, error: "Not found" });
			return res.json({ success: true, data: (records as any[])[0] });
		} catch (error: any) {
			return res.status(500).json({ success: false, error: error.message });
		}
	};

	create = async (req: Request, res: Response) => {
		try {
			const payload = { ...req.body, id: randomUUID() };
			const newRecord = await db
				.insert(this.table as any)
				.values(payload)
				.returning();
			return res
				.status(201)
				.json({ success: true, data: (newRecord as any[])[0] });
		} catch (error: any) {
			return res.status(400).json({ success: false, error: error.message });
		}
	};

	update = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const payload = req.body;
			const updatedRecord = await db
				.update(this.table as any)
				.set(payload)
				.where(eq(this.idField, id as string))
				.returning();
			if (!(updatedRecord as any[]).length)
				return res.status(404).json({ success: false, error: "Not found" });
			return res.json({ success: true, data: (updatedRecord as any[])[0] });
		} catch (error: any) {
			return res.status(400).json({ success: false, error: error.message });
		}
	};

	delete = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const deletedRecord = await db
				.delete(this.table as any)
				.where(eq(this.idField, id as string))
				.returning();
			if (!(deletedRecord as any[]).length)
				return res.status(404).json({ success: false, error: "Not found" });
			return res.json({ success: true, message: "Deleted successfully" });
		} catch (error: any) {
			return res.status(500).json({ success: false, error: error.message });
		}
	};
}
