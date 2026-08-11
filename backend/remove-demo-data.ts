import { inArray } from "drizzle-orm";
import { personalDb } from "./database/client";
import { personalBooks, personalProjects } from "./database/schema";

async function removeDemoData() {
	console.log("Starting demo data cleanup...");

	try {
		const demoProjectNames = ["AI SaaS Platform", "Portfolio Website", "Dyon"];

		const deletedProjects = await personalDb
			.delete(personalProjects)
			.where(inArray(personalProjects.name, demoProjectNames))
			.returning({ id: personalProjects.id, name: personalProjects.name });

		console.log(
			`Deleted ${deletedProjects.length} demo projects:`,
			deletedProjects.map((p) => p.name),
		);

		const demoBookTitles = ["Atomic Habits"];

		const deletedBooks = await personalDb
			.delete(personalBooks)
			.where(inArray(personalBooks.title, demoBookTitles))
			.returning({ id: personalBooks.id, title: personalBooks.title });

		console.log(
			`Deleted ${deletedBooks.length} demo books:`,
			deletedBooks.map((b) => b.title),
		);

		console.log("Demo data cleanup completed successfully.");
	} catch (error) {
		console.error("Error during demo data cleanup:", error);
	} finally {
		process.exit(0);
	}
}

removeDemoData();
