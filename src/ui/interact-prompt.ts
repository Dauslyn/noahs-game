/**
 * InteractPrompt -- floating "Press E" text that appears near stations.
 */

import { Container, Text, TextStyle } from 'pixi.js';
import { MONO } from './ui-helpers.js';

export class InteractPrompt {
  readonly container: Container;
  private text: Text;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    this.text = new Text({
      text: 'Press E',
      style: new TextStyle({
        fontFamily: MONO, fontSize: 14, fill: 0x00ccff,
        fontWeight: 'bold',
      }),
    });
    this.text.anchor.set(0.5, 1);
    this.container.addChild(this.text);
  }

  show(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
