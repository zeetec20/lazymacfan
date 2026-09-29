import { SliderRenderable } from "@opentui/core";
import type { Theme } from "./theme";

let installed = false;

/**
 * Patches SliderRenderable.prototype.renderVertical to render a sleek,
 * thin 1-pixel right-aligned vertical line (▕ - U+2595) instead of the
 * heavy full block (█), producing a modern, unobtrusive scrollbar.
 */
export const installThinScrollbar = (): void => {
  if (installed) return;
  installed = true;

  (SliderRenderable.prototype as any).renderVertical = function (buffer: any) {
    const virtualThumbSize = (this as any).getVirtualThumbSize();
    const virtualThumbStart = (this as any).getVirtualThumbStart();
    const virtualThumbEnd = virtualThumbStart + virtualThumbSize;

    const bg = (this as any).backgroundColor;
    const fg = (this as any).foregroundColor;

    if (bg && bg.a > 0) {
      buffer.fillRect(
        (this as any).x,
        (this as any).y,
        (this as any).width,
        (this as any).height,
        bg,
      );
    }

    const realStartCell = Math.floor(virtualThumbStart / 2);
    const realEndCell = Math.ceil(virtualThumbEnd / 2) - 1;
    const startY = Math.max(0, realStartCell);
    const endY = Math.min((this as any).height - 1, realEndCell);

    for (let realY = startY; realY <= endY; realY++) {
      const virtualCellStart = realY * 2;
      const virtualCellEnd = virtualCellStart + 2;
      const thumbStartInCell = Math.max(virtualThumbStart, virtualCellStart);
      const thumbEndInCell = Math.min(virtualThumbEnd, virtualCellEnd);
      const coverage = thumbEndInCell - thumbStartInCell;

      if (coverage > 0) {
        // Sleek thin right-aligned vertical bar (▕ - U+2595)
        const char = "▕";
        for (let x = 0; x < (this as any).width; x++) {
          buffer.setCellWithAlphaBlending(
            (this as any).x + x,
            (this as any).y + realY,
            char,
            fg,
            bg,
          );
        }
      }
    }
  };
};

export const getThinScrollbarOptions = (theme: Theme) => ({
  width: 1,
  showArrows: false,
  trackOptions: {
    width: 1,
    foregroundColor: theme.border,
    backgroundColor: "transparent",
  },
});
