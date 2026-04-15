import { ImagePickerAsset } from "expo-image-picker";
import { API_BASE_URL } from "@/constants/config";
import { getAccessToken } from "@/services/api";

export type UploadPurpose = "avatar" | "message";

export type UploadableAsset = Pick<
  ImagePickerAsset,
  "uri" | "mimeType" | "fileName" | "fileSize"
>;

function inferMimeType(asset: UploadableAsset) {
  if (asset.mimeType) return asset.mimeType;

  const name = String(asset.fileName || asset.uri).toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function inferFileName(asset: UploadableAsset, purpose: UploadPurpose) {
  if (asset.fileName) return asset.fileName;
  const mime = inferMimeType(asset);
  const ext = mime.split("/")[1] || "bin";
  return `${purpose}.${ext}`;
}

async function assetToBlob(asset: UploadableAsset) {
  const response = await fetch(asset.uri);
  return response.blob();
}

export async function uploadAssetViaPresign(
  asset: UploadableAsset,
  purpose: UploadPurpose,
) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const contentType = inferMimeType(asset);
  const fileName = inferFileName(asset, purpose);
  const blob = await assetToBlob(asset);
  const contentLength = asset.fileSize ?? blob.size;

  const res = await fetch(`${API_BASE_URL}/media/presigned-upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      purpose,
      fileName,
      contentType,
      contentLength,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Presign failed (${res.status})`);
  }

  const putRes = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: blob,
  });

  if (!putRes.ok) {
    throw new Error(`Upload failed (${putRes.status})`);
  }

  return {
    publicUrl: String(data.publicUrl),
    key: String(data.key),
    fileName,
    mimeType: contentType,
    sizeBytes: contentLength,
  };
}
