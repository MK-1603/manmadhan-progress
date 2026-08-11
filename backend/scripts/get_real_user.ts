import { db } from "../database/client";
import { users } from "../database/schema";

async function main() {
  const allUsers = await db.select().from(users).limit(5);
  console.log("Found users:", allUsers.map((u) => ({ id: u.id, email: u.email, role: u.role })));
  process.exit(0);
}
main();
