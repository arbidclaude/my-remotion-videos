import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { V1, V1_DURATION } from "./v1/V1";
import { V2, V2_DURATION } from "./v2/V2";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition id="V1-YourDot" component={V1} durationInFrames={Math.round(V1_DURATION * 30)} fps={30} width={1080} height={1920} />
      <Composition id="V2-GetThe60" component={V2} durationInFrames={Math.round(V2_DURATION * 30)} fps={30} width={1080} height={1920} />
    </>
  );
};
