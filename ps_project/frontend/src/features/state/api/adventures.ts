import {
  adventureDtoSchema,
  type AdventureDto,
  type LinkDto,
  type NodeDto,
} from "@/domain/dto";
import {
  mapAdventureDto,
  mapLinkDto,
  mapNodeDto,
  parseAdventureDto,
} from "@/domain/mappers";
import type { AdventureModel, LinkModel, NodeModel } from "@/domain/models";
import { ApiError, requestJson, resolveApiUrl } from "./client";

type AdventureMode = "play" | "edit";

export async function loadAdventure(
  id: string,
  mode: AdventureMode = "play"
): Promise<AdventureModel> {
  const endpoint =
    mode === "play" ? `/api/adventure/${id}` : `/api/adventure/${id}/edit`;
  const dto = await requestJson<AdventureDto>(endpoint, {
    cache: "no-store",
    auth: mode === "edit",
  });
  const parsed = parseAdventureDto(dto);
  if (!parsed.ok) {
    throw new ApiError(
      500,
      "Invalid adventure payload",
      parsed.issues,
      resolveApiUrl(endpoint)
    );
  }
  return parsed.data;
}

export async function loadAdventureForEdit(
  editSlug: string
): Promise<{ adventure: AdventureModel; editVersion: number }> {
  if (process.env.NODE_ENV !== "production") {
    console.log("[adventures] loadAdventureForEdit", editSlug);
  }
  const adventure = await loadAdventure(editSlug, "edit");
  return { adventure, editVersion: adventure.editVersion };
}

export async function saveAdventure(
  adventureSlug: string,
  payload: AdventureDto
): Promise<AdventureModel> {
  const endpoint = `/api/adventure/${adventureSlug}`;
  const dto = await requestJson<AdventureDto>(endpoint, {
    method: "PUT",
    body: payload,
    auth: true,
  });
  const parsed = parseAdventureDto(dto);
  if (!parsed.ok) {
    throw new ApiError(
      500,
      "Invalid adventure payload",
      parsed.issues,
      resolveApiUrl(endpoint)
    );
  }
  return parsed.data;
}

export async function getAdventuresByList(
  listId: string
): Promise<AdventureModel[]> {
  const endpoint = `/api/adventures/${listId}`;
  const result = await requestJson<AdventureDto[]>(endpoint, { cache: "no-store" });

  if (!Array.isArray(result)) {
    throw new ApiError(
      500,
      "Invalid adventures list response",
      result,
      resolveApiUrl(endpoint)
    );
  }

  return result
    .map((item) => {
      const parsed = adventureDtoSchema.safeParse(item);
      if (!parsed.success) return null;
      return mapAdventureDto(parsed.data);
    })
    .filter((adv): adv is AdventureModel => Boolean(adv));
}

export async function trackNodeVisit(
  adventureSlug: string,
  nodeId: number
): Promise<"success"> {
  const response = await requestJson<"success">(`/api/statistics/${adventureSlug}/${nodeId}`, {
    method: "GET",
    cache: "no-store",
  });
  return response;
}

export async function reportAdventure(
  id: string,
  payload: { code: string; comment?: string }
): Promise<AdventureModel> {
  const endpoint = `/api/adventure/${id}/report`;
  const dto = await requestJson<AdventureDto>(endpoint, {
    method: "POST",
    body: payload,
  });
  const parsed = parseAdventureDto(dto);
  if (!parsed.ok) {
    throw new ApiError(
      500,
      "Invalid adventure payload",
      parsed.issues,
      resolveApiUrl(endpoint)
    );
  }
  return parsed.data;
}

// Convenience mappers for direct DTO usage (optional exports)
export function mapNodeDtoList(items: NodeDto[] | undefined): NodeModel[] {
  return (items ?? []).map(mapNodeDto);
}

export function mapLinkDtoList(items: LinkDto[] | undefined): LinkModel[] {
  return (items ?? []).map(mapLinkDto);
}
