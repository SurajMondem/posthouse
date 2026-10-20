import type { Box } from '../framework/Stage';

// Shared boxes, in station px (0–1080). Scenes draw them; carriers in config.tsx morph between them in world px
// (station i starts at x = i × W). Keeping them in one place keeps scenes and carriers in step.
export const W = 1080;
export const POST_CARD: Box = { x: 580, y: 360, w: 400, h: 220, r: 24 }; // s1: the post in the feed
export const POST_PANEL: Box = { x: 84, y: 300, w: 400, h: 460, r: 24 }; // s2: the post being read
export const WAVE: Box = { x: 84, y: 300, w: 912, h: 220, r: 24 }; // s3: the voice
export const AXIS: Box = { x: 84, y: 600, w: 912, h: 4, r: 2 }; // s4: the timeline
export const BASE: Box = { x: 84, y: 640, w: 912, h: 4, r: 2 }; // s5: the stage floor

export const world = (b: Box, station: number): Box => ({ ...b, x: b.x + station * W });
