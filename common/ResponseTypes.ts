import { DateTime } from 'luxon';

export interface Error {
  field: string;
  message: string;
  rule?: string;
}

export interface ErrorResponse {
  errors: Error[];
}

export const isErrorResponse = (r: unknown): r is ErrorResponse => (
  (r as ErrorResponse).errors !== undefined
);

export type Point = {
  point: [number, number],
  timestamp: DateTime,
};

export type GarminErrorResponse = { status: number, statusText: string };

export type PointResponse = {
  code: 'success' | 'parse-error' | 'garmin-error' | 'empty-response';
  point?: Point,
  garminErrorResponse?: GarminErrorResponse;
}

export type HeatmapListResponse = { id: number, date: string }[];

export type HeatmapResponse = [number, number][];

export type TrailResponse = [number, number][][];

export type FeedResponse = { gpsFeed: string, feedPassword: string };
