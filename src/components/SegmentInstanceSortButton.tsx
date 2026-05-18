import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Instance, type Polygon } from "@/hooks/streetscapes";
import { ArrowDownWideNarrow } from "lucide-react";
import { useMemo } from "react";

export type SegmentationsSortMode = "unsorted" | "label" | "area";

export type SortedInstance = {
  instance: Instance;
  instanceIndex: number;
};

// TODO area calculation should done on server
function polygonArea(polygon: Polygon): number {
  if (polygon.length < 3) {
    return 0;
  }

  let area = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}

function instancePolygonArea(instance: Instance): number {
  if (!instance.polygon) {
    return 0;
  }

  return instance.polygon.reduce((sum, ring) => sum + polygonArea(ring), 0);
}

function sortInstances(
  instances: Instance[],
  mode: SegmentationsSortMode,
): SortedInstance[] {
  if (mode === "unsorted") {
    return instances.map((instance, instanceIndex) => ({
      instance,
      instanceIndex,
    }));
  }

  if (mode === "label") {
    return instances
      .map((instance, instanceIndex) => ({ instance, instanceIndex }))
      .toSorted((a, b) => {
        const byLabel = a.instance.label.localeCompare(b.instance.label);
        if (byLabel !== 0) {
          return byLabel;
        }

        return a.instanceIndex - b.instanceIndex;
      });
  }

  return instances
    .map((instance, instanceIndex) => ({
      area: instancePolygonArea(instance),
      instanceIndex,
      instance,
    }))
    .toSorted((a, b) => {
      const byArea = b.area - a.area;
      if (byArea !== 0) {
        return byArea;
      }

      return a.instanceIndex - b.instanceIndex;
    })
    .map(({ instance, instanceIndex }) => ({ instance, instanceIndex }));
}

export function useSortedInstances(
  instances: Instance[] | undefined,
  sortMode: SegmentationsSortMode,
): SortedInstance[] {
  return useMemo(
    () => sortInstances(instances ?? [], sortMode),
    [instances, sortMode],
  );
}

function sortModeLabel(mode: SegmentationsSortMode): string {
  switch (mode) {
    case "label":
      return "Instances: label";
    case "area":
      return "Instances: area";
    default:
      return "Instances: unsorted";
  }
}

export function SegmentInstanceSortButton({
  mode,
  onChange,
}: {
  mode: SegmentationsSortMode;
  onChange: (value: SegmentationsSortMode) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowDownWideNarrow className="size-4" />
            {sortModeLabel(mode)}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-64 w-auto">
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => onChange(value as SegmentationsSortMode)}
        >
          <DropdownMenuRadioItem value="unsorted">
            Unsorted
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="label">
            Sorted by label
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="area">
            Sorted by decreasing area of polygon
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
