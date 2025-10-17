export interface PanchangaDate {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  // Calendar system identifier (gregorian | julian | iso). Default: gregorian
  calendar?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  timezone: number;
}

export interface TithiResult {
  number: number;
  name: string;
  endTime: number[];
  paksha: string; // Add this property
}

export interface NakshatraResult {
  number: number;
  name: string;
  endTime: number[];
}

export interface YogaResult {
  number: number;
  name: string;
  endTime: number[];
}

export interface KaranaResult {
  number: number;
  name: string;
}

export interface MasaResult {
  number: number;
  name: string;
  isAdhika: boolean;
}

export interface PanchangaResult {
  date: PanchangaDate;
  location: Location;
  tithi: TithiResult[];
  nakshatra: NakshatraResult[];
  yoga: YogaResult[];
  karana: KaranaResult;
  masa: MasaResult;
  vaara: number;
  sunrise: number[];
  sunset: number[];
  moonrise: number[];
  moonset: number[];
  dayDuration: number[];
  // Optional AI refinement metadata
  aiMeta?: {
    applied: boolean;
    notes?: string;
  };
}

export interface DateOnly {
  year: number;
  month: number;
  day: number;
}

export interface TithiDatesResponse {
  tithiNumber: number;
  tithiName: string;
  location: Location;
  range: { start: DateOnly; end: DateOnly };
  dates: DateOnly[];
  count: number;
}

export interface MatchingDate {
  date: PanchangaDate;
  fields: {
    tithi: number;
    paksha: string;
    nakshatra: number;
    yoga: number;
    karana: number;
    masa: number;
    vaara: number;
  };
}
