import { useCallback, useEffect } from "react";
import { parseAsString, useQueryState, type UseQueryStateReturn } from "nuqs";
import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import { palette } from "@/lib/label-colors";
import type { components, paths } from "@/lib/streetscapes-api";
import { useFilters } from "./filters";

export type Polygon = [number, number][];
export type MultiPolygon = Polygon[];

export type Image =
  paths["/images"]["get"]["responses"]["200"]["content"]["application/json"];
export type ImageMetadata =
  paths["/images/{image_id}"]["get"]["responses"]["200"]["content"]["application/json"];
export type Segmentation = components["schemas"]["Segmentation"];
export type Instance = components["schemas"]["Instance"];
export type AggregateStats = components["schemas"]["AggregateStats"];
export type ImagesQueryParams = paths["/images"]["get"]["parameters"]["query"];

export function useStreetscapeBaseUrl() {
  const [streetscapesWebServiceUrl] = useQueryState(
    "s",
    parseAsString.withDefault("http://localhost:3000"),
  );
  return streetscapesWebServiceUrl;
}

export function useStreetscapes() {
  const streetscapesWebServiceUrl = useStreetscapeBaseUrl();
  const fetchClient = createFetchClient<paths>({
    baseUrl: streetscapesWebServiceUrl,
  });
  const $api = createClient(fetchClient);
  return $api;
}

export function useImages() {
  const [filters] = useFilters();
  const query: ImagesQueryParams = {
    sources: filters.sources,
    tags: filters.tags,
    labels: filters.labels,
    models: filters.models,
    image_ratings: filters.image_ratings,
    segmentation_ratings: filters.segmentation_ratings,
    model_runs: filters.model_runs,
  };
  if (filters.max_captured_at && filters.min_captured_at) {
    query.date_range = [filters.min_captured_at, filters.max_captured_at];
  }

  const $api = useStreetscapes();
  // eslint-disable-next-line react-compiler/react-compiler
  return $api.useQuery("get", "/images", {
    placeholderData: [],
    params: {
      query,
    },
  });
}

export function useCurrentImageId(): UseQueryStateReturn<string, undefined> {
  const [imageId, setImageId] = useQueryState("i", parseAsString);
  return [imageId, setImageId];
}

export function useCurrentImageInfo() {
  const [imageId] = useCurrentImageId();
  const $api = useStreetscapes();

  // eslint-disable-next-line react-compiler/react-compiler
  return $api.useQuery(
    "get",
    "/images/{image_id}",
    {
      params: {
        path: { image_id: imageId! },
      },
    },
    {
      enabled: imageId !== null,
      // annotorious does not like while fetching no data
      // so we keep previous data while loading
      placeholderData: (prev) => prev,
    },
  );
}

export function useImageNavigation() {
  const { data: images = [], isLoading } = useImages();
  const [currentImageId, setCurrentImageId] = useCurrentImageId();

  useEffect(() => {
    if (!images) return;

    const exists = images.some((img) => img.id === currentImageId);
    if ((!currentImageId || !exists) && images.length > 0) {
      setCurrentImageId(images[0].id);
    }
  }, [currentImageId, images, setCurrentImageId]);

  const currentIndex = images.findIndex((img) => img.id === currentImageId);
  const filtered = images.length;

  const goToNext = useCallback(() => {
    if (!images.length) return;

    const index = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (index + 1) % images.length;
    setCurrentImageId(images[nextIndex].id);
  }, [currentIndex, images, setCurrentImageId]);

  const goToPrevious = useCallback(() => {
    if (!images.length) return;

    const index = currentIndex === -1 ? images.length - 1 : currentIndex;
    const prevIndex = (index - 1 + images.length) % images.length;
    setCurrentImageId(images[prevIndex].id);
  }, [currentIndex, images, setCurrentImageId]);

  return {
    total: images.length,
    filtered,
    currentIndex,
    currentImageId,
    isLoading,
    goToPrevious,
    goToNext,
  };
}

const placeholderStats: AggregateStats = {
  tags: [],
  labels: [],
  model_run_names: [],
  image_sources: [],
  date_range: ["1970-01-01", "2100-12-31"],
  models: ["manual"],
};

export function useAggregateStats() {
  const $api = useStreetscapes();
  // eslint-disable-next-line react-compiler/react-compiler
  return $api.useQuery("get", "/stats", {
    placeholderData: placeholderStats,
  });
}

export function useAllTags() {
  const { data = placeholderStats } = useAggregateStats();
  return data.tags;
}

export function useAllLabels() {
  const { data = placeholderStats } = useAggregateStats();
  const labels = data.labels;
  return Object.fromEntries(
    labels.map((l, i) => [l, palette[i % palette.length]]),
  );
}

export function useAllSources() {
  const { data = placeholderStats } = useAggregateStats();
  return data.image_sources;
}

export function useAllModels() {
  const { data = placeholderStats } = useAggregateStats();
  return data.models;
}

export function useAllModelRunNames() {
  const { data = placeholderStats } = useAggregateStats();
  return data.model_run_names;
}

export function useImageActions() {
  const $api = useStreetscapes();
  // TODO do not repeat onSettled logic, reuse a common invalidate function

  // eslint-disable-next-line react-compiler/react-compiler
  const { mutate: setRating } = $api.useMutation(
    "post",
    "/images/{image_id}/rating",
    {
      onSettled(_data, _error, variables, _onMutateResult, context) {
        context.client.invalidateQueries({
          queryKey: [
            "get",
            "/images/{image_id}",
            {
              params: { path: { image_id: variables.params.path.image_id } },
            },
          ],
        });
      },
    },
  );
  // eslint-disable-next-line react-compiler/react-compiler
  const { mutate: setTags } = $api.useMutation(
    "post",
    "/images/{image_id}/tags",
    {
      onSettled(_data, _error, variables, _onMutateResult, context) {
        return Promise.all([
          context.client.invalidateQueries({
            queryKey: [
              "get",
              "/images/{image_id}",
              {
                params: { path: { image_id: variables.params.path.image_id } },
              },
            ],
          }),
          context.client.invalidateQueries({
            // TODO only invalidate /stats when a new unknown tag is added or unique tag is removed
            queryKey: ["get", "/stats"],
          }),
        ]);
      },
    },
  );

  // eslint-disable-next-line react-compiler/react-compiler
  const { mutate: setNotes } = $api.useMutation(
    "post",
    "/images/{image_id}/notes",
    {
      onSettled(_data, _error, variables, _onMutateResult, context) {
        context.client.invalidateQueries({
          queryKey: [
            "get",
            "/images/{image_id}",
            {
              params: { path: { image_id: variables.params.path.image_id } },
            },
          ],
        });
      },
    },
  );

  return {
    setRating,
    setTags,
    setNotes,
  };
}

export function useSegmentationActions() {
  const $api = useStreetscapes();
  // eslint-disable-next-line react-compiler/react-compiler
  const { mutate: setSegmentLabel } = $api.useMutation(
    "post",
    "/images/{image_id}/{run_name}/{instance_idx}/{label}",
    {
      onSettled(_data, _error, variables, _onMutateResult, context) {
        context.client.invalidateQueries({
          queryKey: [
            "get",
            "/images/{image_id}",
            {
              params: { path: { image_id: variables.params.path.image_id } },
            },
          ],
        });
      },
    },
  );
  // eslint-disable-next-line react-compiler/react-compiler
  const { mutate: setSegmentationRating } = $api.useMutation(
    "post",
    "/images/{image_id}/{run_name}/rating",
    {
      onSettled(_data, _error, variables, _onMutateResult, context) {
        context.client.invalidateQueries({
          queryKey: [
            "get",
            "/images/{image_id}",
            {
              params: { path: { image_id: variables.params.path.image_id } },
            },
          ],
        });
      },
    },
  );
  return {
    setSegmentLabel,
    setSegmentationRating,
  };
}
