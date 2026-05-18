import {
  useCurrentImageInfo,
  useImageActions,
  useStreetscapeBaseUrl,
} from "@/hooks/streetscapes";
import { Rating } from "@/components/rating";
import { Tags } from "@/components/Tags";
import { Notes } from "@/components/Notes";
import { Segmentations } from "@/components/Segmentations";
import { AnnotatedImage } from "./AnnotatedImage";
import { ImageMetaInfo } from "./ImageMetaInfo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

export function ImagePanel() {
  const streetscapesWebServiceUrl = useStreetscapeBaseUrl();
  const { data: imageInfo, isLoading, error } = useCurrentImageInfo();
  const actions = useImageActions();

  if (imageInfo === undefined) {
    return <div className="flex-1">No image selected</div>;
  }

  if (isLoading) {
    return <div className="flex-1">Loading...</div>;
  }

  if (error) {
    return <div className="flex-1">Error: {String(error)}</div>;
  }

  const imgUrl = `${streetscapesWebServiceUrl}/images/${imageInfo.id}/img`;

  return (
    <div className="flex-1 p-2 gap-4 flex flex-col">
      <h1 className="text-xl">Image: {imageInfo.id}</h1>
      <AnnotatedImage
        id={imageInfo.id}
        url={imgUrl}
        height={imageInfo.height}
        width={imageInfo.width}
        segmentations={imageInfo.segmentation ?? []}
      />
      <Accordion defaultValue={["information"]} className="border rounded">
        <AccordionItem
          key="information"
          value="information"
          className="border-b last:border-b-0  px-2"
        >
          <AccordionTrigger className="">Information</AccordionTrigger>
          <AccordionContent>
            <div className="flex-row gap-4 flex">
              <ImageMetaInfo info={imageInfo} />
              <div className="flex flex-col gap-2">
                <Tags
                  tags={imageInfo.tags ?? []}
                  onChange={(newTags: string[]) => {
                    actions.setTags({
                      params: { path: { image_id: imageInfo.id } },
                      body: newTags,
                    });
                  }}
                />
                <Rating
                  value={imageInfo.rating}
                  onChange={(value: number) => {
                    actions.setRating({
                      params: {
                        path: { image_id: imageInfo.id },
                        query: { rating: value },
                      },
                    });
                  }}
                />
                <Notes
                  value={imageInfo.notes}
                  onChange={(newNotes: string) => {
                    actions.setNotes({
                      params: {
                        path: { image_id: imageInfo.id },
                        query: { notes: newNotes },
                      },
                    });
                  }}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Segmentations
        imageId={imageInfo.id}
        segmentations={imageInfo.segmentation ?? []}
      />
    </div>
  );
}
