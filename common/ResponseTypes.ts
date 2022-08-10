import { DateTime } from 'luxon';

export interface Error {
  field: string;
  message: string;
  rule?: string;
}

export interface ErrorResponse {
  code: 'E_FORM_ERRORS' | 'E_EMAIL_NOT_VERIFIED',
  errors?: Error[];
}

export const isErrorResponse = (r: unknown): r is ErrorResponse => (
  (r as ErrorResponse).code !== undefined
);

export const isFormErrorResponse = (r: unknown): r is ErrorResponse => (
  (r as ErrorResponse).code === 'E_FORM_ERRORS'
);

export type Point = {
  point: [number, number],
  timestamp: DateTime,
};

export type GarminErrorResponse = { status: number, statusText: string };

export type PointResponse = {
  code: 'success' | 'parse-error' | 'garmin-error' | 'empty-response' | 'gps-feed-null';
  point?: Point,
  garminErrorResponse?: GarminErrorResponse;
}

export type HeatmapListResponse = { id: number, date: string }[];

export type HeatmapResponse = [number, number][];

export type TrailResponse = [number, number][][];

export type FeedResponse = { gpsFeed: string, feedPassword: string };

export type UserResponse = { initialized: boolean, avatarUrl: string | null };

export type WildlandFireResponse = {
  globalId: string,
  lat: number,
  lng: number,
  name: string,
  discoveredAt: string,
  modifiedAt: string,
  incidentTypeCategory: string,
  incidentSize: number | null,
  percentContained: number | null,
  distance?: number,
  perimeter?: {
    rings: [number, number][][],
  },
}[];
