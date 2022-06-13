import { DateTime } from 'luxon';

export interface Error {
  field: string;
  message: string;
  rule: string;
}

export interface ErrorResponse {
  errors: Error[];
}

export const isErrorResponse = (r: unknown): r is ErrorResponse => (
  (r as ErrorResponse).errors !== undefined
);

export type PointResponse = { point: [number, number], timestamp: DateTime };

export const isPointResponse = (r: unknown): r is PointResponse => (
  (r as PointResponse).point !== undefined
  && (r as PointResponse).timestamp !== undefined
  && Array.isArray((r as PointResponse).point)
  && (r as PointResponse).point.length >= 2
);

export type GarminErrorResponse = { status: number, statusText: string };

export type HeatmapListResponse = { id: number, date: string }[];

export type HeatmapResponse = [number, number][];

export type TrailResponse = [number, number][][];

export type FeedResponse = { gpsFeed: string, feedPassword: string };
