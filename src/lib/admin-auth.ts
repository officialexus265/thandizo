import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  const role = (session.user as any).role;
  if (role !== "admin") {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }
  return { ok: true as const, session };
}
