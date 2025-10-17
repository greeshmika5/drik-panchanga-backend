import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { PanchangaService } from './panchanga.service';
import type {
  PanchangaDate,
  Location,
  PanchangaResult,
  TithiDatesResponse,
} from './interfaces/panchanga.interface';

export class GetPanchangaDto {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  latitude: number;
  longitude: number;
  timezone: number;
  calendar?: string;
}

export class GetTithiDatesDto {
  tithi: number; // 1..30
  latitude: number;
  longitude: number;
  timezone: number;
  calendar?: string; // for interpreting start/end boundaries
  // Optional explicit range; defaults to last 5 and next 10 years from today
  startYear?: number;
  endYear?: number;
}

@Controller('panchanga')
export class PanchangaController {
  constructor(private readonly panchangaService: PanchangaService) {}

  @Get()
  getPanchanga(@Query() query: GetPanchangaDto): PanchangaResult {
    const date: PanchangaDate = {
      year: Number(query.year),
      month: Number(query.month),
      day: Number(query.day),
      hour: query.hour !== undefined ? Number(query.hour) : undefined,
      minute: query.minute !== undefined ? Number(query.minute) : undefined,
      calendar: query.calendar,
    };

    const location: Location = {
      latitude: Number(query.latitude),
      longitude: Number(query.longitude),
      timezone: Number(query.timezone),
    };

    return this.panchangaService.getPanchanga(date, location);
  }

  @Post()
  getPanchangaPost(@Body() body: GetPanchangaDto): PanchangaResult {
    const date: PanchangaDate = {
      year: body.year,
      month: body.month,
      day: body.day,
      hour: body.hour,
      minute: body.minute,
      calendar: body.calendar,
    };

    const location: Location = {
      latitude: body.latitude,
      longitude: body.longitude,
      timezone: body.timezone,
    };

    return this.panchangaService.getPanchanga(date, location);
  }

  @Get('tithi')
  getTithi(@Query() query: GetPanchangaDto) {
    const date: PanchangaDate = {
      year: Number(query.year),
      month: Number(query.month),
      day: Number(query.day),
      hour: query.hour !== undefined ? Number(query.hour) : undefined,
      minute: query.minute !== undefined ? Number(query.minute) : undefined,
      calendar: query.calendar,
    };

    const location: Location = {
      latitude: Number(query.latitude),
      longitude: Number(query.longitude),
      timezone: Number(query.timezone),
    };

    const jd = this.panchangaService['gregorianToJd'](date);
    return this.panchangaService.calculateTithi(jd, location);
  }

  @Get('nakshatra')
  getNakshatra(@Query() query: GetPanchangaDto) {
    const date: PanchangaDate = {
      year: Number(query.year),
      month: Number(query.month),
      day: Number(query.day),
      hour: query.hour !== undefined ? Number(query.hour) : undefined,
      minute: query.minute !== undefined ? Number(query.minute) : undefined,
      calendar: query.calendar,
    };

    const location: Location = {
      latitude: Number(query.latitude),
      longitude: Number(query.longitude),
      timezone: Number(query.timezone),
    };

    const jd = this.panchangaService['gregorianToJd'](date);
    return this.panchangaService.calculateNakshatra(jd, location);
  }

  @Get('yoga')
  getYoga(@Query() query: GetPanchangaDto) {
    const date: PanchangaDate = {
      year: Number(query.year),
      month: Number(query.month),
      day: Number(query.day),
      hour: query.hour !== undefined ? Number(query.hour) : undefined,
      minute: query.minute !== undefined ? Number(query.minute) : undefined,
      calendar: query.calendar,
    };

    const location: Location = {
      latitude: Number(query.latitude),
      longitude: Number(query.longitude),
      timezone: Number(query.timezone),
    };

    const jd = this.panchangaService['gregorianToJd'](date);
    return this.panchangaService.calculateYoga(jd, location);
  }

  @Get('health')
  getHealth() {
    return { status: 'OK', service: 'Drik Panchanga NestJS' };
  }

  @Get('tithi-dates')
  async getTithiDates(
    @Query() query: GetTithiDatesDto,
  ): Promise<TithiDatesResponse> {
    const tithi = Number(query.tithi);
    const location: Location = {
      latitude: Number(query.latitude),
      longitude: Number(query.longitude),
      timezone: Number(query.timezone),
    };

    const today = new Date();
    const startYear = query.startYear
      ? Number(query.startYear)
      : today.getFullYear() - 5;
    const endYear = query.endYear
      ? Number(query.endYear)
      : today.getFullYear() + 10;

// ...existing code...
    const startDate: PanchangaDate = {
      year: startYear,
      month: 1,
      day: 1,
      calendar: query.calendar || 'gregorian',
    };

    // Calculate range as the number of years between startYear and endYear
    const range = endYear - startYear + 1;

    // Get matches and transform them to expected response format
    const matches = this.panchangaService.findMatchingDates(
      startDate,
      location,
      range
    );
// ...existing code...
    return {
      tithiNumber: tithi,
      tithiName: this.panchangaService['getTithiName'](tithi),
      location,
      range: {
        start: { year: startYear, month: 1, day: 1 },
        end: { year: endYear, month: 12, day: 31 },
      },
      dates: matches.map((m) => ({
        year: m.date.year,
        month: m.date.month,
        day: m.date.day,
      })),
      count: matches.length,
    };
  }

@Post('matching-dates')
async getMatchingDatesFromPayload(
  @Body() body: {
    year: number;
    month: number;
    day: number;
    latitude: number;
    longitude: number;
    timezone: number;
    range?: number;
    calendar?: string;
  },
): Promise<PanchangaResult[]> {
  try {
    const baseYear = parseInt(body.year.toString());
    const range = body.range !== undefined ? Math.abs(Number(body.range)) : 1;

    const location: Location = {
      latitude: parseFloat(body.latitude.toString()),
      longitude: parseFloat(body.longitude.toString()),
      timezone: parseFloat(body.timezone.toString()),
    };

    if (
      isNaN(baseYear) ||
      isNaN(Number(body.month)) ||
      isNaN(Number(body.day)) ||
      isNaN(location.latitude) ||
      isNaN(location.longitude) ||
      isNaN(location.timezone)
    ) {
      throw new Error('Invalid input parameters');
    }

    const date: PanchangaDate = {
      year: baseYear,
      month: parseInt(body.month.toString()),
      day: parseInt(body.day.toString()),
      calendar: body.calendar || 'gregorian',
    };

    // Pass range to service
    const matches = this.panchangaService.findMatchingDates(
      date,
      location,
      range,
    );

    return matches.map((match) =>
      this.panchangaService.getPanchanga(match.date, location),
    );
  } catch (error) {
    console.error('Error finding matching dates:', error);
    throw new Error(`Failed to find matching dates: ${error.message}`);
  }
}


  // @Get('matching-dates')
  // async findMatchingDates(
  //   @Query('tithi') tithi: string,
  //   @Query('nakshatra') nakshatra: string,
  //   @Query('yearRange') yearRange?: string,
  //   @Query('year') year?: string,
  //   @Query('month') month?: string,
  // ) {
  //   return this.panchangaService.findMatchingDatesForRange(
  //     parseInt(tithi, 10),
  //     parseInt(nakshatra, 10),
  //     yearRange ? parseInt(yearRange, 10) : 1,
  //     year ? parseInt(year, 10) : undefined,
  //     month ? parseInt(month, 10) : undefined,
  //   );
  // }
}
