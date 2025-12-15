import { requestForm, requestJson } from "./client";

type UploadResponse = { url: string };
type DeleteResponse = { result: string };

export async function uploadMedia(adventureSlug: string, file: File | Blob) {
  const form = new FormData();
  form.append("adventureId", adventureSlug);
  form.append("media", file);

  return requestForm<UploadResponse>("/api/media", form, {
    method: "POST",
  });
}

export async function deleteMedia(adventureSlug: string, hash: string) {
  return requestJson<DeleteResponse>(`/api/media/${adventureSlug}/${hash}`, {
    method: "DELETE",
  });
}
