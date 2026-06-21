// Renders the board background — either a static image (CSS background-image)
// or a looping <video> tag, depending on the source MIME prefix.
//
// Detection rule: any data URL starting with `data:video/` is treated as a
// video. Any other value (incl. plain URLs like `/bg-overlay.png`) is treated
// as an image. This matches what MainMenu emits via FileReader.
import { useMemo } from 'react';

export function isVideoBackground(src) {
  return typeof src === 'string' && src.startsWith('data:video/');
}

export default function BoardBackground({ background, shade = 55 }) {
  const shadeStyle = useMemo(
    () => ({ '--bg-shade': Math.max(0, Math.min(100, shade)) / 100 }),
    [shade],
  );
  const isVideo = isVideoBackground(background);

  if (isVideo) {
    return (
      <>
        <video
          key={background}
          className="board-bg-video"
          src={background}
          autoPlay
          loop
          muted
          playsInline
          data-testid="board-bg-video"
        />
        <div className="board-bg-shade" style={shadeStyle} data-testid="board-bg-shade" />
      </>
    );
  }

  return (
    <div
      className="board-bg"
      style={{ backgroundImage: `url(${background})`, ...shadeStyle }}
      data-testid="board-bg-image"
    />
  );
}
