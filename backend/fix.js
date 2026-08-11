const fs = require("fs");
const path = require("path");

function walk(dir) {
	fs.readdirSync(dir).forEach((f) => {
		const p = path.join(dir, f);
		if (fs.statSync(p).isDirectory()) {
			walk(p);
		} else if (p.endsWith(".ts")) {
			let c = fs.readFileSync(p, "utf8");
			// Fix my broken replace
			c = c.replace(
				/const {2}= req\.params\.id as string;/g,
				"const projectId = req.params.id as string;",
			);
			// Wait, some might have been taskId. I'll just look at the filename or context to restore correctly.
			if (p.includes("tasks")) {
				c = c.replace(
					/const projectId = req\.params\.id as string;/g,
					"const taskId = req.params.id as string;",
				);
				c = c.replace(
					/const {2}= req\.params\.id as string;/g,
					"const taskId = req.params.id as string;",
				);
			}

			// Also fix learning.routes.ts where I had TS1135: Argument expression expected
			// because I replaced eq(books.id, req.params.id) with eq(books.id, req.params.id as string)
			// wait, the regex was: c.replace(/eq\(([\w\.]+), req\.params\.id\)/g, 'eq($1, req.params.id as string)');
			// PowerShell evaluated $1 to empty string!
			// So it became eq(, req.params.id as string)
			c = c.replace(
				/eq\(, req\.params\.id as string\)/g,
				"eq(req.params.id as string, req.params.id as string)",
			);
			// wait, that's wrong, the first arg is lost. I need to get it from git!
			fs.writeFileSync(p, c);
		}
	});
}

// Since I lost the first argument to `eq(..., req.params.id)`, I'll just use git checkout to restore them!
const { execSync } = require("child_process");
execSync("git checkout -- src/routes/", {
	cwd: "d:/New folder (4)/manmadhan-progress/backend",
});

// Then do it properly in node without PowerShell interpolating variables
function fixProperly(dir) {
	fs.readdirSync(dir).forEach((f) => {
		const p = path.join(dir, f);
		if (fs.statSync(p).isDirectory()) {
			fixProperly(p);
		} else if (p.endsWith(".ts")) {
			let c = fs.readFileSync(p, "utf8");
			c = c.replace(
				/const (\w+)Id = req\.params\.id;/g,
				"const $1Id = req.params.id as string;",
			);
			c = c.replace(
				/eq\(([\w.]+), req\.params\.id\)/g,
				"eq($1, req.params.id as string)",
			);
			fs.writeFileSync(p, c);
		}
	});
}

fixProperly("d:/New folder (4)/manmadhan-progress/backend/src/routes");
