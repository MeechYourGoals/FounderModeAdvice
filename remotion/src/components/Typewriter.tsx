import { useCurrentFrame } from "remotion";

export const Typewriter: React.FC<{ text: string; startFrame?: number; charsPerFrame?: number; showCaret?: boolean; style?: React.CSSProperties }> = ({
  text,
  startFrame = 0,
  charsPerFrame = 0.9,
  showCaret = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const count = Math.min(text.length, Math.floor(elapsed * charsPerFrame));
  const shown = text.slice(0, count);
  const caretOn = Math.floor(frame / 8) % 2 === 0;
  return (
    <span style={style}>
      {shown}
      {showCaret && (
        <span style={{ opacity: caretOn ? 1 : 0, marginLeft: 2 }}>▍</span>
      )}
    </span>
  );
};
