import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_VIDEO = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = String(formData.get("folder") || "thandizo");

    if (!file) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      return NextResponse.json({ error: "Only images and videos allowed" }, { status: 400 });
    }
    if (isImage && file.size > MAX_IMAGE) {
      return NextResponse.json({ error: "Image max 5MB" }, { status: 400 });
    }
    if (isVideo && file.size > MAX_VIDEO) {
      return NextResponse.json({ error: "Video max 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder: folder.startsWith("thandizo") ? folder : `thandizo/${folder}`,
      resource_type: isVideo ? "video" : "image",
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      type: isVideo ? "VIDEO" : "IMAGE",
    });
  } catch (err: any) {
    console.error("upload error", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
