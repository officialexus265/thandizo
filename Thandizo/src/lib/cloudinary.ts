import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export async function uploadToCloudinary(
  file: Buffer | string,
  options: {
    folder?: string;
    resourceType?: "image" | "video" | "auto";
    publicId?: string;
  } = {}
) {
  const result = await cloudinary.uploader.upload(
    typeof file === "string" ? file : `data:application/octet-stream;base64,${file.toString("base64")}`,
    {
      folder: options.folder || "thandizo",
      resource_type: options.resourceType || "auto",
      public_id: options.publicId,
    }
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    width: result.width,
    height: result.height,
    duration: result.duration,
  };
}

export async function deleteFromCloudinary(publicId: string, resourceType: "image" | "video" = "image") {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
