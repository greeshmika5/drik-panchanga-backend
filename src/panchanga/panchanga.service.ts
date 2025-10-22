import { Injectable } from '@nestjs/common';
import { AiRefinementService } from './ai-refinement.service';
import * as sweph from 'sweph';
import {
  PanchangaDate,
  Location,
  TithiResult,
  NakshatraResult,
  YogaResult,
  KaranaResult,
  MasaResult,
  PanchangaResult,
} from './interfaces/panchanga.interface';

// Swiss Ephemeris constants (since they're not exported from the package)
const SE_SUN = 0;
const SE_MOON = 1;
const SE_GREG_CAL = 1;
const SEFLG_SWIEPH = 2;
const SE_CALC_RISE = 1;
const SE_CALC_SET = 2;
const SE_SIDM_LAHIRI = 1;

interface MatchingDate {
  date: PanchangaDate;
  fields: {
    tithi: number;
    paksha: string; // Add this property
    nakshatra: number;
    yoga: number;
    karana: number;
    masa: number;
    vaara: number;
  };
}

@Injectable()
export class PanchangaService {
  constructor(private readonly aiRefinement: AiRefinementService) {
    // Initialize Swiss Ephemeris
    sweph.set_ephe_path('');
  }

  /**
   * Convert degrees, minutes, seconds to decimal degrees
   */
  private fromDms(degs: number, mins: number, secs: number): number {
    return degs + mins / 60 + secs / 3600;
  }

  /**
   * Convert decimal degrees to degrees, minutes, seconds
   */
  private toDms(deg: number): number[] {
    const d = Math.floor(deg);
    const mins = (deg - d) * 60;
    const m = Math.floor(mins);
    let s = Math.round((mins - m) * 60);
    let mm = m;
    let dd = d;
    // Normalize any rollover (e.g. 08:29:60 -> 08:30:00)
    if (s === 60) {
      s = 0;
      mm += 1;
    }
    if (mm === 60) {
      mm = 0;
      dd += 1;
    }
    return [dd, mm, s];
  }

  /**
   * Convert Gregorian date to Julian Day Number
   */
  private gregorianToJd(date: PanchangaDate): number {
    const hour = date.hour ?? 0;
    const minute = date.minute ?? 0;
    const dayFraction = (hour + minute / 60) / 24;
    const cal = (date.calendar || 'gregorian').toLowerCase();
    if (cal === 'julian') {
      // Julian calendar flag 0
      return sweph.julday(date.year, date.month, date.day, dayFraction * 24, 0);
    }
    // Default Gregorian
    return sweph.julday(
      date.year,
      date.month,
      date.day,
      dayFraction * 24,
      SE_GREG_CAL,
    );
  }

  /**
   * Convert Julian Day Number to Gregorian date
   */
  private jdToGregorian(jd: number): PanchangaDate {
    const result = sweph.revjul(jd, SE_GREG_CAL);
    return {
      year: result.year,
      month: result.month,
      day: result.day,
    };
  }

  /**
   * Get solar longitude at given Julian Day
   */
  private solarLongitude(jd: number): number {
    try {
      const result = sweph.calc_ut(jd, SE_SUN, SEFLG_SWIEPH);
      if (result.error && !result.data) {
        console.error('Solar longitude calculation error:', result.error);
        return 0;
      }
      // sweph returns data as array where data[0] is longitude
      return result.data?.[0] || 0;
    } catch (error) {
      console.error('Error in solarLongitude:', error);
      return 0;
    }
  }

  /**
   * Get lunar longitude at given Julian Day
   */
  private lunarLongitude(jd: number): number {
    try {
      const result = sweph.calc_ut(jd, SE_MOON, SEFLG_SWIEPH);
      if (result.error && !result.data) {
        console.error('Lunar longitude calculation error:', result.error);
        return 0;
      }
      // sweph returns data as array where data[0] is longitude
      return result.data?.[0] || 0;
    } catch (error) {
      console.error('Error in lunarLongitude:', error);
      return 0;
    }
  }

  /**
   * Get lunar latitude at given Julian Day
   */
  private lunarLatitude(jd: number): number {
    try {
      const result = sweph.calc_ut(jd, SE_MOON, SEFLG_SWIEPH);
      if (result.error && !result.data) {
        console.error('Lunar latitude calculation error:', result.error);
        return 0;
      }
      // sweph returns data as array where data[1] is latitude
      return result.data?.[1] || 0;
    } catch (error) {
      console.error('Error in lunarLatitude:', error);
      return 0;
    }
  }

  /**
   * Calculate sunrise time
   */
  private sunrise(jd: number, location: Location): number[] {
    const { latitude, longitude, timezone } = location;
    const result = sweph.rise_trans(
      jd - timezone / 24,
      SE_SUN,
      '',
      SEFLG_SWIEPH,
      SE_CALC_RISE,
      [longitude, latitude, 0],
      1013.25,
      15,
    );

    if (result.error)
      throw new Error(`Sunrise calculation error: ${result.error}`);

    const rise = result.data; // JD (UT)
    const localHours = (rise - jd) * 24 + timezone; // convert JD → local hours
    return this.toDms(localHours);
  }

  /**
   * Calculate sunset time
   */
  private sunset(jd: number, location: Location): number[] {
    const { latitude, longitude, timezone } = location;
    const result = sweph.rise_trans(
      jd - timezone / 24,
      SE_SUN,
      '',
      SEFLG_SWIEPH,
      SE_CALC_SET,
      [longitude, latitude, 0],
      1013.25,
      15,
    );

    if (result.error)
      throw new Error(`Sunset calculation error: ${result.error}`);

    const setting = result.data; // JD (UT)
    const localHours = (setting - jd) * 24 + timezone; // convert JD → local hours
    return this.toDms(localHours);
  }

  /**
   * Calculate moonrise time
   */
  private moonrise(jd: number, location: Location): number[] {
    const { latitude, longitude, timezone } = location;
    const result = sweph.rise_trans(
      jd - timezone / 24,
      SE_MOON,
      '',
      SEFLG_SWIEPH,
      SE_CALC_RISE,
      [longitude, latitude, 0],
      1013.25,
      15,
    );

    if (result.error) {
      return [0, 0, 0]; // Return zeros if moonrise doesn't occur
    }

    const rise = result.data;
    return this.toDms((rise - jd) * 24 + timezone);
  }

  /**
   * Calculate moonset time
   */
  private moonset(jd: number, location: Location): number[] {
    const { latitude, longitude, timezone } = location;
    const result = sweph.rise_trans(
      jd - timezone / 24,
      SE_MOON,
      '',
      SEFLG_SWIEPH,
      SE_CALC_SET,
      [longitude, latitude, 0],
      1013.25,
      15,
    );

    if (result.error) {
      return [0, 0, 0]; // Return zeros if moonset doesn't occur
    }

    const setting = result.data;
    return this.toDms((setting - jd) * 24 + timezone);
  }

  /**
   * Calculate lunar phase (moon's position relative to sun)
   */
  private lunarPhase(jd: number): number {
    const solarLong = this.solarLongitude(jd);
    const lunarLong = this.lunarLongitude(jd);
    return (lunarLong - solarLong + 360) % 360;
  }

  /**
   * Unwrap angles to ensure ascending order
   */
  private unwrapAngles(angles: number[]): number[] {
    const result = [...angles];
    for (let i = 1; i < result.length; i++) {
      if (result[i] < result[i - 1]) {
        result[i] += 360;
      }
    }
    return result;
  }

  /**
   * Inverse Lagrange interpolation
   */
  private inverseLagrange(x: number[], y: number[], ya: number): number {
    let total = 0;
    for (let i = 0; i < x.length; i++) {
      let numer = 1;
      let denom = 1;
      for (let j = 0; j < x.length; j++) {
        if (j !== i) {
          numer *= ya - y[j];
          denom *= y[i] - y[j];
        }
      }
      total += (numer * x[i]) / denom;
    }
    return total;
  }

  /**
   * Calculate Tithi (lunar day)
   */
  calculateTithi(jd: number, location: Location): TithiResult[] {
    const { timezone } = location;

    // Determine base local midnight UT for consistent absolute end clock time
    const jdLocalMidnight = Math.floor(jd - 0.5) + 0.5; // JD at previous 00:00 UT baseline
    const localMidnightUt = jdLocalMidnight - timezone / 24; // shift by timezone to approximate local midnight in UT

    const phaseNow = this.lunarPhase(jd);
    const currentTithi = Math.floor(phaseNow / 12) + 1; // 1..30
    const targetDeg = currentTithi * 12; // degrees at boundary

    // Step forward in 30 minute increments until we cross the boundary
    let hi = jd;
    let phaseHi = phaseNow;
    const maxForward = jd + 2; // safety (tithi never longer than ~1.9 days)
    while (phaseHi < targetDeg && hi < maxForward) {
      hi += 0.0208333333; // 30 minutes
      phaseHi = this.lunarPhase(hi);
      if (phaseHi < phaseNow) {
        // Wrapped around 360 -> add 360 to keep monotonic for search
        phaseHi += 360;
      }
    }
    // Binary refine between jd (lo) and hi where boundary lies
    let lo = jd;
    let iterations = 0;
    // refine to < 1 minute
    while (hi - lo > 1 / (24 * 60) && iterations < 40) {
      const mid = (lo + hi) / 2;
      let phaseMid = this.lunarPhase(mid);
      if (phaseMid < phaseNow) phaseMid += 360;
      if (phaseMid >= targetDeg) {
        hi = mid;
        phaseHi = phaseMid;
      } else {
        lo = mid;
      }
      iterations++;
    }
    const endJd = hi; // boundary UT

    // Convert to absolute local clock hours since local midnight (can exceed 24)
    let hoursSinceLocalMidnight = (endJd - localMidnightUt) * 24;
    // Ensure non-negative (if numerical drift)
    while (hoursSinceLocalMidnight < 0) hoursSinceLocalMidnight += 24;

    // Determine paksha
    const paksha = currentTithi <= 15 ? 'Shukla' : 'Krishna';

    return [
      {
        number: currentTithi,
        name: this.getTithiName(currentTithi),
        endTime: this.toDms(hoursSinceLocalMidnight),
        paksha,
      },
    ];
  }

  /**
   * Calculate Nakshatra (lunar mansion)
   */
  calculateNakshatra(jd: number, location: Location): NakshatraResult[] {
    sweph.set_sid_mode(SE_SIDM_LAHIRI, 0, 0);
    const { timezone } = location;
    const jdLocalMidnight = Math.floor(jd - 0.5) + 0.5;
    const localMidnightUt = jdLocalMidnight - timezone / 24;

    const offsets = [0, 1 / 24, 2 / 24, 3 / 24, 4 / 24]; // 1-hour steps for better stability
    const longitudes = offsets.map((t) => {
      const lunarLong = this.lunarLongitude(jd + t);
      const ayanamsa = sweph.get_ayanamsa_ut(jd + t);
      return (lunarLong - ayanamsa + 360) % 360;
    });
    const current = Math.floor((longitudes[0] * 27) / 360) + 1; // 1..27
    const targetDeg = current * (360 / 27);
    const y = this.unwrapAngles(longitudes);
    const x = offsets;
    let approx = this.inverseLagrange(x, y, targetDeg);
    if (!isFinite(approx) || approx < 0) approx = 0; // safety
    const endJd = jd + approx;
    let hoursSinceLocalMidnight = (endJd - localMidnightUt) * 24;
    while (hoursSinceLocalMidnight < 0) hoursSinceLocalMidnight += 24;

    return [
      {
        number: current,
        name: this.getNakshatraName(current),
        endTime: this.toDms(hoursSinceLocalMidnight),
      },
    ];
  }

  /**
   * Calculate Yoga
   */
  calculateYoga(jd: number, location: Location): YogaResult[] {
    sweph.set_sid_mode(SE_SIDM_LAHIRI, 0, 0);
    const { timezone } = location;
    const jdLocalMidnight = Math.floor(jd - 0.5) + 0.5;
    const localMidnightUt = jdLocalMidnight - timezone / 24;

    const ayanamsa = sweph.get_ayanamsa_ut(jd);
    const lunarLong = (this.lunarLongitude(jd) - ayanamsa + 360) % 360;
    const solarLong = (this.solarLongitude(jd) - ayanamsa + 360) % 360;
    const total = (lunarLong + solarLong) % 360;
    const current = Math.floor((total * 27) / 360) + 1;
    const targetDeg = current * (360 / 27);

    // Estimate end time using motion over next few hours
    const offsets = [0, 1 / 24, 2 / 24, 3 / 24, 4 / 24];
    const motions = offsets.map((t) => {
      const ay = sweph.get_ayanamsa_ut(jd + t);
      const ll = (this.lunarLongitude(jd + t) - ay + 360) % 360;
      const sl = (this.solarLongitude(jd + t) - ay + 360) % 360;
      return (ll + sl) % 360;
    });
    const y = this.unwrapAngles(motions);
    let approx = this.inverseLagrange(offsets, y, targetDeg);
    if (!isFinite(approx) || approx < 0) approx = 0;
    const endJd = jd + approx;
    let hoursSinceLocalMidnight = (endJd - localMidnightUt) * 24;
    while (hoursSinceLocalMidnight < 0) hoursSinceLocalMidnight += 24;

    return [
      {
        number: current,
        name: this.getYogaName(current),
        endTime: this.toDms(hoursSinceLocalMidnight),
      },
    ];
  }

  /**
   * Calculate Karana (half lunar day)
   */

  calculateKarana(jd: number): KaranaResult {
    const solarLong = this.solarLongitude(jd);
    const lunarLong = this.lunarLongitude(jd);

    const moonPhase = (lunarLong - solarLong + 360) % 360; // 0–360°
    const karanaIndex = Math.floor(moonPhase / 6) + 1; // 1 to 60 in a lunar month

    return {
      number: karanaIndex,
      name: this.getKaranaName(karanaIndex),
    };
  }

  /**
   * Calculate weekday (Vaara) from Gregorian date
   * 0 = Sunday, 1 = Monday, ... 6 = Saturday
   * Uses Tomohiko Sakamoto's algorithm for reliability.
   */
  private calculateVaaraFromDate(date: PanchangaDate): number {
    const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    let y = date.year;
    const m = date.month;
    const d = date.day;
    if (m < 3) y -= 1;
    const w =
      (y +
        Math.floor(y / 4) -
        Math.floor(y / 100) +
        Math.floor(y / 400) +
        t[m - 1] +
        d) %
      7;
    return w;
  }

  /**
   * Calculate lunar month (Masa)
   */
  calculateMasa(jd: number, location: Location): MasaResult {
    // Get sunrise JD (not just hour)
    const { latitude, longitude, timezone } = location;
    const result = sweph.rise_trans(
      jd - timezone / 24,
      SE_SUN,
      '',
      SEFLG_SWIEPH,
      SE_CALC_RISE,
      [longitude, latitude, 0],
      1013.25,
      15,
    );

    if (result.error) throw new Error(`Sunrise JD calc error: ${result.error}`);

    const sunriseJd = result.data; // JD of sunrise (UT)

    const ti = this.calculateTithi(sunriseJd, location)[0].number;

    const lastNewMoon = this.newMoon(sunriseJd, ti, -1);
    const nextNewMoon = this.newMoon(sunriseJd, ti, 1);

    const thisSolarMonth = this.raasi(lastNewMoon);
    const nextSolarMonth = this.raasi(nextNewMoon);
    const isLeapMonth = thisSolarMonth === nextSolarMonth;

    let maasa = thisSolarMonth + 1;
    if (maasa > 12) maasa = maasa % 12;

    return {
      number: maasa,
      name: this.getMasaName(maasa),
      isAdhika: isLeapMonth,
    };
  }

  /**
   * Calculate day duration
   */
  calculateDayDuration(jd: number, location: Location): number[] {
    const sriseHrs = this.sunrise(jd, location); // [hh, mm, ss]
    const ssetHrs = this.sunset(jd, location); // [hh, mm, ss]

    // Convert [hh, mm, ss] → total hours
    const srise = sriseHrs[0] + sriseHrs[1] / 60 + sriseHrs[2] / 3600;
    const sset = ssetHrs[0] + ssetHrs[1] / 60 + ssetHrs[2] / 3600;

    const diff = sset - srise;
    return this.toDms(diff);
  }

  /**
   * Find new moon
   */
  private newMoon(jd: number, tithi: number, opt: number): number {
    let start: number;
    if (opt === -1) {
      start = jd - tithi;
    } else if (opt === 1) {
      start = jd + (30 - tithi);
    } else {
      start = jd; // Default fallback
    }

    const x = Array.from({ length: 17 }, (_, i) => -2 + i / 4);
    const y = x.map((i) => this.lunarPhase(start + i));
    const yUnwrapped = this.unwrapAngles(y);
    const y0 = this.inverseLagrange(x, yUnwrapped, 360);
    return start + y0;
  }

  /**
   * Calculate Raasi (zodiac sign)
   */
  private raasi(jd: number): number {
    sweph.set_sid_mode(SE_SIDM_LAHIRI, 0, 0);
    const solarLong = this.solarLongitude(jd);
    const ayanamsa = sweph.get_ayanamsa_ut(jd);
    const solarNirayana = (solarLong - ayanamsa + 360) % 360;
    return Math.ceil(solarNirayana / 30);
  }

  /**
   * Get complete Panchanga for a given date and location
   */
  getPanchanga(date: PanchangaDate, location: Location): PanchangaResult {
    // Base JD for the date at 00:00 local
    const baseDate: PanchangaDate = {
      year: date.year,
      month: date.month,
      day: date.day,
    };
    const jdDate = this.gregorianToJd(baseDate);
    // JD for provided time (local) if hour/min provided
    const hasTime = date.hour !== undefined && date.minute !== undefined;
    const jdWithTime = hasTime ? this.gregorianToJd(date) : jdDate;
    // Convert provided local time JD to UT anchor (subtract timezone hours)
    const anchorUt = jdWithTime - location.timezone / 24;

    const result: PanchangaResult = {
      date,
      location,
      tithi: this.calculateTithi(anchorUt, location),
      nakshatra: this.calculateNakshatra(anchorUt, location),
      yoga: this.calculateYoga(anchorUt, location),
      karana: this.calculateKarana(anchorUt),
      masa: this.calculateMasa(jdDate, location), // Masa traditionally at sunrise
      vaara: this.calculateVaaraFromDate(baseDate),
      sunrise: this.sunrise(jdDate, location),
      sunset: this.sunset(jdDate, location),
      moonrise: this.moonrise(jdDate, location),
      moonset: this.moonset(jdDate, location),
      dayDuration: this.calculateDayDuration(jdDate, location),
    };

    const refined = this.aiRefinement.refine(result);
    if (!refined.aiMeta) {
      refined.aiMeta = { applied: false, notes: 'AI refinement (no-op)' };
    }
    return refined;
  }

  /**
   * Find all Gregorian dates within a range where the sunrise Tithi equals targetTithi (1..30)
   * Strategy: iterate day by day, compute sunrise JD and Tithi at sunrise.
   */

  // Helper methods for names
  private getTithiName(number: number): string {
    const names = [
      '',
      'Pratipad',
      'Dwitiya',
      'Tritiya',
      'Chaturthi',
      'Panchami',
      'Shashthi',
      'Saptami',
      'Ashtami',
      'Navami',
      'Dashami',
      'Ekadashi',
      'Dwadashi',
      'Trayodashi',
      'Chaturdashi',
      'Purnima',
      'Pratipad',
      'Dwitiya',
      'Tritiya',
      'Chaturthi',
      'Panchami',
      'Shashthi',
      'Saptami',
      'Ashtami',
      'Navami',
      'Dashami',
      'Ekadashi',
      'Dwadashi',
      'Trayodashi',
      'Chaturdashi',
      'Amavasya',
    ];
    return names[number] || `Tithi ${number}`;
  }

  private getNakshatraName(number: number): string {
    const names = [
      '',
      'Ashwini',
      'Bharani',
      'Krittika',
      'Rohini',
      'Mrigashira',
      'Ardra',
      'Punarvasu',
      'Pushya',
      'Ashlesha',
      'Magha',
      'Purva Phalguni',
      'Uttara Phalguni',
      'Hasta',
      'Chitra',
      'Swati',
      'Vishakha',
      'Anuradha',
      'Jyeshtha',
      'Mula',
      'Purva Ashadha',
      'Uttara Ashadha',
      'Shravana',
      'Dhanishta',
      'Shatabhisha',
      'Purva Bhadrapada',
      'Uttara Bhadrapada',
      'Revati',
    ];
    return names[number] || `Nakshatra ${number}`;
  }

  private getYogaName(number: number): string {
    const names = [
      '',
      'Vishkambha',
      'Priti',
      'Ayushman',
      'Saubhagya',
      'Shobhana',
      'Atiganda',
      'Sukarma',
      'Dhriti',
      'Shula',
      'Ganda',
      'Vriddhi',
      'Dhruva',
      'Vyaghata',
      'Harshana',
      'Vajra',
      'Siddhi',
      'Vyatipata',
      'Variyan',
      'Parigha',
      'Shiva',
      'Siddha',
      'Sadhya',
      'Shubha',
      'Shukla',
      'Brahma',
      'Indra',
      'Vaidhriti',
    ];
    return names[number] || `Yoga ${number}`;
  }

  private getKaranaName(number: number): string {
    const names = [
      '',
      'Bava',
      'Balava',
      'Kaulava',
      'Taitila',
      'Gara',
      'Vanija',
      'Vishti',
      'Shakuni',
      'Chatushpada',
      'Naga',
      'Kimstughna',
    ];

    if (number <= 7) {
      return names[number] || `Karana ${number}`;
    } else if (number >= 57 && number <= 60) {
      return names[number - 48] || `Karana ${number}`;
    } else {
      const cyclic = ((number - 1) % 7) + 1;
      return names[cyclic] || `Karana ${number}`;
    }
  }

  private getMasaName(number: number): string {
    const names = [
      '',
      'Chaitra',
      'Vaisakha',
      'Jyeshtha',
      'Ashadha',
      'Shravana',
      'Bhadrapada',
      'Ashwin',
      'Kartik',
      'Margashirsha',
      'Pausha',
      'Magha',
      'Phalguna',
    ];
    return names[number] || `Masa ${number}`;
  }

public findMatchingDates(
  baseDate: PanchangaDate,
  location: Location,
  range: number,
): MatchingDate[] {
  const matches: MatchingDate[] = [];

  const basePanchanga = this.getPanchanga(baseDate, location);

  const baseTithi = basePanchanga.tithi[0].number;
  const basePaksha = basePanchanga.tithi[0].paksha;
  const baseMasa = basePanchanga.masa.number;

  // Use current year as base for range calculation, not the user's selected date
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - range;
  const endYear = currentYear + range;

  for (let year = startYear; year <= endYear; year++) {
    let foundInYear = false;

    // ✅ Focused search window: ±2 months around base month
    const searchStartMonth = Math.max(1, baseDate.month - 2);
    const searchEndMonth = Math.min(12, baseDate.month + 2);

    for (let month = searchStartMonth; month <= searchEndMonth; month++) {
      const daysInMonth = new Date(year, month, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        try {
          const testDate: PanchangaDate = {
            year,
            month,
            day,
            calendar: baseDate.calendar || 'gregorian',
          };

          const panchanga = this.getPanchanga(testDate, location);

          const isTithiMatch = panchanga.tithi.some(
            (t) => t.number === baseTithi && t.paksha === basePaksha,
          );

          const isMasaMatch = panchanga.masa.number === baseMasa;

          if (isTithiMatch && isMasaMatch) {
            matches.push({
              date: testDate,
              fields: {
                tithi: baseTithi,
                paksha: basePaksha,
                nakshatra: panchanga.nakshatra[0].number,
                yoga: panchanga.yoga[0].number,
                karana: panchanga.karana.number,
                masa: baseMasa,
                vaara: panchanga.vaara,
              },
            });

            foundInYear = true;
            break; // ✅ stop days
          }
        } catch {
          continue;
        }
      }

      if (foundInYear) break; // ✅ stop months
    }

    // 🔹 Adjacent Month Correction (only if not found in main window)
    if (!foundInYear) {
      // November–December of previous year
      for (let month = 11; month <= 12 && !foundInYear; month++) {
        const prevYear = year - 1;
        const daysInMonth = new Date(prevYear, month, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
          try {
            const testDate: PanchangaDate = {
              year: prevYear,
              month,
              day,
              calendar: baseDate.calendar || 'gregorian',
            };

            const panchanga = this.getPanchanga(testDate, location);

            const isTithiMatch = panchanga.tithi.some(
              (t) => t.number === baseTithi && t.paksha === basePaksha,
            );
            const isMasaMatch = panchanga.masa.number === baseMasa;

            if (isTithiMatch && isMasaMatch) {
              matches.push({
                date: { ...testDate, year }, // show as target year
                fields: {
                  tithi: baseTithi,
                  paksha: basePaksha,
                  nakshatra: panchanga.nakshatra[0].number,
                  yoga: panchanga.yoga[0].number,
                  karana: panchanga.karana.number,
                  masa: baseMasa,
                  vaara: panchanga.vaara,
                },
              });
              foundInYear = true;
              break;
            }
          } catch {
            continue;
          }
        }
      }

      // January–February of next year
      for (let month = 1; month <= 2 && !foundInYear; month++) {
        const nextYear = year + 1;
        const daysInMonth = new Date(nextYear, month, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
          try {
            const testDate: PanchangaDate = {
              year: nextYear,
              month,
              day,
              calendar: baseDate.calendar || 'gregorian',
            };

            const panchanga = this.getPanchanga(testDate, location);

            const isTithiMatch = panchanga.tithi.some(
              (t) => t.number === baseTithi && t.paksha === basePaksha,
            );
            const isMasaMatch = panchanga.masa.number === baseMasa;

            if (isTithiMatch && isMasaMatch) {
              matches.push({
                date: { ...testDate, year }, // show as target year
                fields: {
                  tithi: baseTithi,
                  paksha: basePaksha,
                  nakshatra: panchanga.nakshatra[0].number,
                  yoga: panchanga.yoga[0].number,
                  karana: panchanga.karana.number,
                  masa: baseMasa,
                  vaara: panchanga.vaara,
                },
              });
              foundInYear = true;
              break;
            }
          } catch {
            continue;
          }
        }
      }
    }

    if (!foundInYear) {
      console.warn(`No matching date found for year ${year}`);
    }
  }

  // ✅ Sort final results
  matches.sort((a, b) => {
    const dateA = new Date(a.date.year, a.date.month - 1, a.date.day);
    const dateB = new Date(b.date.year, b.date.month - 1, b.date.day);
    return dateA.getTime() - dateB.getTime();
  });

  return matches;
  }

  // public async findMatchingDatesForRange(
  //   tithi: number,
  //   nakshatra: number,
  //   yearRange: number = 1,
  //   year?: number,
  //   month?: number,
  // ): Promise<Date[]> {
  //   const currentDate = new Date();
  //   const currentYear = currentDate.getFullYear();
  //   const targetYear = year || currentYear;
  //   const startYear = targetYear - yearRange;
  //   const endYear = targetYear + yearRange;
  //   const matchingDates: Date[] = [];

  //   // Process years in order: current year first, then surrounding years
  //   const yearsToCheck = [targetYear];
  //   for (let i = 1; i <= yearRange; i++) {
  //     yearsToCheck.push(targetYear + i);
  //     yearsToCheck.push(targetYear - i);
  //   }

  //   for (const checkYear of yearsToCheck) {
  //     if (checkYear < startYear || checkYear > endYear) continue;

  //     const startMonth = month ? month - 1 : 0;
  //     const endMonth = month ? month - 1 : 11;
  //     const startDay = 1;
  //     const endDay = month ? new Date(checkYear, month, 0).getDate() : 31;

  //     const checkDate = new Date(checkYear, startMonth, startDay);
  //     const endDate = new Date(checkYear, endMonth, endDay);

  //     while (checkDate <= endDate) {
  //       const testDate: PanchangaDate = {
  //         year: checkDate.getFullYear(),
  //         month: checkDate.getMonth() + 1,
  //         day: checkDate.getDate(),
  //       };
  //       const panchanga = this.getPanchanga(testDate, {
  //         latitude: 0,
  //         longitude: 0,
  //         timezone: 0,
  //       });
  //       if (
  //         panchanga.tithi[0].number === tithi &&
  //         panchanga.nakshatra[0].number === nakshatra
  //       ) {
  //         matchingDates.push(new Date(checkDate));
  //       }
  //       checkDate.setDate(checkDate.getDate() + 1);
  //     }
  //   }

  //   return matchingDates;
  // }
}
