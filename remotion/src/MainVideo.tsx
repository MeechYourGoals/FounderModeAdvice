import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { PersistentBackground, ProgressRail } from "./components/PersistentBackground";
import { SceneHook } from "./scenes/SceneHook";
import { ScenePaste } from "./scenes/ScenePaste";
import { SceneProfile } from "./scenes/SceneProfile";
import { SceneInsights } from "./scenes/SceneInsights";
import { SceneChat } from "./scenes/SceneChat";
import { SceneClose } from "./scenes/SceneClose";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#05070C" }}>
      <PersistentBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={130}>
          <SceneHook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 14 })} />

        <TransitionSeries.Sequence durationInFrames={185}>
          <ScenePaste />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 14 })} />

        <TransitionSeries.Sequence durationInFrames={160}>
          <SceneProfile />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })}
        />

        <TransitionSeries.Sequence durationInFrames={215}>
          <SceneInsights />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 14 })} />

        <TransitionSeries.Sequence durationInFrames={160}>
          <SceneChat />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 14 })} />

        <TransitionSeries.Sequence durationInFrames={100}>
          <SceneClose />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <ProgressRail />
    </AbsoluteFill>
  );
};
