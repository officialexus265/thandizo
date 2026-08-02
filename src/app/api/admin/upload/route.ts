import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    // Developers may only upload to their own projects
    if ((session.user as any)?.role === "developer" && projectId) {
      const owned = await prisma.project.findFirst({
        where: { id: projectId, developerId: (session.user as any).id },
      });
      if (!owned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const caption = (formData.get("caption") as string) || null;
    const setAsThumbnail = formData.get("setAsThumbnail") === "true";

    if (!file || !projectId) {
      return NextResponse.json({ error: "file and projectId are required" }, { status: 400 });
    }

    // Convert file to base64 for Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const isVideo = file.type.startsWith("video/");
    const resourceType = isVideo ? "video" : "image";

    const result = await cloudinary.uploader.upload(base64, {
      folder: "thandizo",
      resource_type: resourceType,
    });

    // Get current max sortOrder
    const lastMedia = await prisma.media.findFirst({
      where: { projectId },
      orderBy: { sortOrder: "desc" },
    });
    const sortOrder = (lastMedia?.sortOrder ?? -1) + 1;

    const media = await prisma.media.create({
      data: {
        projectId,
        url: result.secure_url,
        publicId: result.public_id,
        type: isVideo ? "VIDEO" : "IMAGE",
        caption,
        sortOrder,
      },
    });

    // Optionally set as project thumbnail
    if (setAsThumbnail && !isVideo) {
      await prisma.project.update({
        where: { id: projectId },
        data: { thumbnailUrl: result.secure_url },
      });
    }

    return NextResponse.json(media);
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { mediaId } = await req.json();
    if (!mediaId) return NextResponse.json({ error: "mediaId required" }, { status: 400 });

    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete from Cloudinary
    if (media.publicId) {
      await cloudinary.uploader.destroy(media.publicId, {
        resource_type: media.type === "VIDEO" ? "video" : "image",
      });
    }

    await prisma.media.delete({ where: { id: mediaId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
