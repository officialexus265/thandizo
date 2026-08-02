import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectMoneySummary } from "@/lib/developer";

async function requireDeveloperProject(projectId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const developerId = (session.user as any).id as string;
  const project = await prisma.project.findFirst({
    where: { id: projectId, developerId },
    include: { media: { orderBy: { sortOrder: "asc" } } },
  });
  if (!project) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { session, developerId, project };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const result = await requireDeveloperProject(id);
  if ("error" in result && result.error) return result.error;
  const { project } = result as any;
  const money = await projectMoneySummary(project.id);
  return NextResponse.json({ project, money });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const result = await requireDeveloperProject(id);
  if ("error" in result && result.error) return result.error;
  const { project } = result as any;

  try {
    const body = await req.json();
    const data: any = {};

    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.developerName !== undefined)
      data.developerName = String(body.developerName).trim() || null;
    if (body.shortDesc !== undefined) data.shortDesc = String(body.shortDesc).trim();
    if (body.fullDesc !== undefined) data.fullDesc = String(body.fullDesc).trim();
    if (body.progressNote !== undefined)
      data.progressNote = body.progressNote ? String(body.progressNote) : null;
    if (body.workProgress !== undefined) {
      let p = Number(body.workProgress);
      if (isNaN(p)) p = 0;
      data.workProgress = Math.max(0, Math.min(100, Math.round(p)));
    }
    if (body.thumbnailUrl !== undefined)
      data.thumbnailUrl = body.thumbnailUrl || null;

    const updated = await prisma.project.update({
      where: { id: project.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
