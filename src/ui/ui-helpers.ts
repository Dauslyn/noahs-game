/**
 * Shared UI helpers for hub screen panels.
 * Provides text rendering and rounded-rect drawing utilities.
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export const MONO = 'monospace';

/** Create a centered text and add it to a parent container. */
export function centeredText(
  parent: Container, txt: string, style: TextStyle, x: number, y: number,
): Text {
  const t = new Text({ text: txt, style });
  t.anchor.set(0.5, 0);
  t.x = x;
  t.y = y;
  parent.addChild(t);
  return t;
}

/** Draw a rounded rect button background. */
export function drawRect(
  g: Graphics, w: number, h: number, r: number,
  fill: number, stroke: number, strokeW: number,
): void {
  g.clear();
  g.roundRect(0, 0, w, h, r);
  g.fill(fill);
  g.stroke({ color: stroke, width: strokeW });
}
