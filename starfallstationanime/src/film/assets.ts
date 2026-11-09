import night from '../assets/night.jpg';
import blue from '../assets/blue.jpg';
import sunset from '../assets/sunset.jpg';
import cloudsea from '../assets/cloudsea.jpg';
import dawn from '../assets/dawn.jpg';
import { makeCloud } from './fx';

export interface Assets {
  night: HTMLImageElement;
  blue: HTMLImageElement;
  sunset: HTMLImageElement;
  cloudsea: HTMLImageElement;
  dawn: HTMLImageElement;
  cloudsPink: HTMLCanvasElement[];
  cloudsViolet: HTMLCanvasElement[];
}

function load(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

export async function loadAssets(): Promise<Assets> {
  const [n, b, s, c, d] = await Promise.all([night, blue, sunset, cloudsea, dawn].map(load));
  const cloudsPink = [0, 1, 2, 3, 4].map((i) => makeCloud(100 + i * 17, 760, 300, '#fff0ee', '#e9b2d0', '#7b5aa6'));
  const cloudsViolet = [0, 1, 2, 3, 4].map((i) => makeCloud(300 + i * 23, 760, 300, '#ffd9cf', '#a97fc4', '#2e2a6e'));
  return { night: n, blue: b, sunset: s, cloudsea: c, dawn: d, cloudsPink, cloudsViolet };
}

export type ShotFn = (c: CanvasRenderingContext2D, t: number, d: number, A: Assets) => void;
