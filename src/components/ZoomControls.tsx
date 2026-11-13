import { MAX_SCALE, MIN_SCALE } from "../lib/geometry";

type Props = {
  scale: number;
  disabled: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
};

export function ZoomControls({
  scale,
  disabled,
  onZoomIn,
  onZoomOut,
  onFit,
}: Props) {
  return (
    <div className="zoom-controls" role="toolbar" aria-label="Zoom">
      <button
        type="button"
        className="icon-button"
        onClick={onZoomOut}
        disabled={disabled || scale <= MIN_SCALE}
        aria-label="Zoom out"
        title="Zoom out (-)"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5 10h10" />
        </svg>
      </button>
      <output className="zoom-level" aria-label="Zoom level">
        {Math.round(scale * 100)}%
      </output>
      <button
        type="button"
        className="icon-button"
        onClick={onZoomIn}
        disabled={disabled || scale >= MAX_SCALE}
        aria-label="Zoom in"
        title="Zoom in (+)"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5 10h10M10 5v10" />
        </svg>
      </button>
      <span className="zoom-divider" aria-hidden="true" />
      <button
        type="button"
        className="text-button"
        onClick={onFit}
        disabled={disabled}
        title="Fit image to screen (0)"
      >
        Fit
      </button>
    </div>
  );
}
