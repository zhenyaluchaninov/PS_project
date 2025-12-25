import { categoryDtoSchema, type CategoryDto } from "@/domain/dto";
import { mapCategoryDto } from "@/domain/mappers";
import type { CategoryModel } from "@/domain/models";
import { ApiError, requestJson, resolveApiUrl } from "./client";

export async function loadCategories(): Promise<CategoryModel[]> {
  const endpoint = "/api/categories";
  const result = await requestJson<CategoryDto[]>(endpoint, {
    cache: "no-store",
    auth: true,
  });

  if (!Array.isArray(result)) {
    throw new ApiError(
      500,
      "Invalid categories response",
      result,
      resolveApiUrl(endpoint)
    );
  }

  return result
    .map((item) => {
      const parsed = categoryDtoSchema.safeParse(item);
      if (!parsed.success) return null;
      return mapCategoryDto(parsed.data);
    })
    .filter((item): item is CategoryModel => Boolean(item));
}
