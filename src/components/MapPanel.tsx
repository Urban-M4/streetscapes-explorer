import Map, {
  FullscreenControl,
  Layer,
  NavigationControl,
  ScaleControl,
  Source,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  useCurrentImageId,
  useImages,
  useStreetscapeBaseUrl,
} from "@/hooks/streetscapes";
import { useTheme } from "@/components/theme-provider";
import { useRef, useState } from "react";
import { ZoomToImagesControl } from "./ZoomToImagesControl";

const selectedMarkerCololr = "#fd9a00"; // tailwind orange-500
const unselectedMarkerColor = "#007cbf"; // tailwind sky-600

export function MapPanel() {
  const streetscapesWebServiceUrl = useStreetscapeBaseUrl();
  const [currentImageId, setCurrentImageId] = useCurrentImageId();
  const { isDarkMode } = useTheme();
  const mapRef = useRef<MapRef | null>(null);
  const { data: images = [] } = useImages();
  const [hoverInfo, setHoverInfo] = useState<{
    feature: MapGeoJSONFeature;
    x: number;
    y: number;
  } | null>(null);

  const mapStyle = isDarkMode
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

  // MapLibre forces id to number, while image id are strings
  const imageLookup: Record<string, number> = Object.fromEntries(
    images.map((img, index) => [img.id, index]),
  );

  const geojson = {
    type: "FeatureCollection" as const,
    features: images?.map((img) => ({
      type: "Feature" as const,
      id: imageLookup[img.id],
      properties: {
        id: img.id,
        url: `${streetscapesWebServiceUrl}/images/${img.id}/img`,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [img.lon, img.lat],
      },
    })),
  };

  function handleClick(event: MapLayerMouseEvent) {
    if (!mapRef.current) return;

    const features = mapRef.current.queryRenderedFeatures(event.point, {
      layers: ["images"],
    });
    if (features.length > 0) {
      const feature = features[0];
      setCurrentImageId(feature.properties.id);
    }
  }

  const onHover = (event: MapLayerMouseEvent) => {
    const {
      features,
      point: { x, y },
    } = event;
    const hoveredFeature = features && features[0];
    setHoverInfo(hoveredFeature ? { feature: hoveredFeature, x, y } : null);
  };

  return (
    <div className="relative overflow-hidden h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 5,
          latitude: 52,
          zoom: 8,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        onClick={handleClick}
        onMouseMove={onHover}
        interactiveLayerIds={["images"]}
      >
        <FullscreenControl position="top-left" />
        <NavigationControl position="top-left" />
        <ZoomToImagesControl images={images} />
        <ScaleControl />
        <Source id="images" type="geojson" data={geojson}>
          <Layer
            id="images"
            type="circle"
            paint={{
              "circle-radius": 8,
              "circle-color": "rgba(0,0,0,0)",
              "circle-stroke-width": 8,
              "circle-stroke-color": unselectedMarkerColor,
            }}
          />
          <Layer
            id="images-selected"
            type="circle"
            filter={["==", ["get", "id"], currentImageId ?? ""]}
            paint={{
              "circle-radius": 8,
              "circle-color": selectedMarkerCololr,
              "circle-stroke-width": 8,
              "circle-stroke-color": selectedMarkerCololr,
            }}
          />
        </Source>
        {hoverInfo && (
          <div
            className="absolute pointer-events-none bg-white dark:bg-gray-800 p-2 rounded shadow-lg border border-gray-200 dark:border-gray-700"
            style={{
              left: hoverInfo.x + 10,
              top: hoverInfo.y + 10,
            }}
          >
            <img
              src={hoverInfo.feature.properties.url}
              alt="Street view thumbnail"
              className="max-w-64 max-h-64 object-cover rounded"
            />
          </div>
        )}
      </Map>
    </div>
  );
}
