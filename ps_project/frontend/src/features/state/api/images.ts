import {
  imageCategoryDtoSchema,
  imageDtoSchema,
  type ImageCategoryDto,
  type ImageDto,
} from "@/domain/dto";
import { ApiError, requestJson, resolveApiUrl } from "./client";

type LoadOptions = {
  force?: boolean;
};

let cachedCategories: ImageCategoryDto[] | null = null;
let categoriesPromise: Promise<ImageCategoryDto[]> | null = null;
const categoryImagesCache = new Map<number, ImageDto[]>();
const categoryImagesPromise = new Map<number, Promise<ImageDto[]>>();

const normalizeImage = (image: ImageDto): ImageDto => ({
  id: image.id,
  title: image.title ?? "",
  author: image.author ?? "",
  author_url: image.author_url ?? "",
  full_url: image.full_url ?? "",
  download_url: image.download_url ?? "",
  thumb_url: image.thumb_url ?? "",
});

const normalizeCategory = (category: ImageCategoryDto): ImageCategoryDto => ({
  id: category.id,
  title: category.title,
  images: category.images ? category.images.map(normalizeImage) : undefined,
});

export async function loadImageCategories(
  options: LoadOptions = {}
): Promise<ImageCategoryDto[]> {
  const { force = false } = options;
  if (!force && cachedCategories) return cachedCategories;
  if (!force && categoriesPromise) return categoriesPromise;

  const endpoint = "/api/images/categories";
  const promise = requestJson<ImageCategoryDto[]>(endpoint, {
    cache: "no-store",
    auth: true,
  })
    .then((result) => {
      if (!Array.isArray(result)) {
        throw new ApiError(
          500,
          "Invalid image categories response",
          result,
          resolveApiUrl(endpoint)
        );
      }

      const categories = result
        .map((item) => {
          const parsed = imageCategoryDtoSchema.safeParse(item);
          if (!parsed.success) return null;
          return normalizeCategory(parsed.data);
        })
        .filter((item): item is ImageCategoryDto => Boolean(item));

      cachedCategories = categories;
      return categories;
    })
    .finally(() => {
      categoriesPromise = null;
    });

  categoriesPromise = promise;
  return promise;
}

export async function loadImagesInCategory(
  categoryId: number,
  options: LoadOptions = {}
): Promise<ImageDto[]> {
  const { force = false } = options;
  if (!force && categoryImagesCache.has(categoryId)) {
    return categoryImagesCache.get(categoryId) ?? [];
  }
  if (!force && categoryImagesPromise.has(categoryId)) {
    return categoryImagesPromise.get(categoryId) ?? [];
  }

  const endpoint = `/api/images/category/${categoryId}`;
  const promise = requestJson<ImageDto[]>(endpoint, {
    cache: "no-store",
    auth: true,
  })
    .then((result) => {
      if (!Array.isArray(result)) {
        throw new ApiError(
          500,
          "Invalid image list response",
          result,
          resolveApiUrl(endpoint)
        );
      }

      const images = result
        .map((item) => {
          const parsed = imageDtoSchema.safeParse(item);
          if (!parsed.success) return null;
          return normalizeImage(parsed.data);
        })
        .filter((item): item is ImageDto => Boolean(item));

      categoryImagesCache.set(categoryId, images);
      return images;
    })
    .finally(() => {
      categoryImagesPromise.delete(categoryId);
    });

  categoryImagesPromise.set(categoryId, promise);
  return promise;
}

export async function loadImageById(imageId: number): Promise<ImageDto> {
  const endpoint = `/api/images/${imageId}`;
  const result = await requestJson<ImageDto>(endpoint, {
    cache: "no-store",
    auth: true,
  });

  const parsed = imageDtoSchema.safeParse(result);
  if (!parsed.success) {
    throw new ApiError(
      500,
      "Invalid image response",
      result,
      resolveApiUrl(endpoint)
    );
  }

  return normalizeImage(parsed.data);
}

export type { ImageCategoryDto, ImageDto };
