# Drik Panchanga NestJS

A NestJS implementation of the Drik Panchanga system - a Hindu luni-solar calendar calculation service that provides accurate astronomical calculations for Panchanga elements including Tithi, Nakshatra, Yoga, Karana, and Masa.

This project converts the original Python implementation to a modern TypeScript/NestJS REST API using the Swiss Ephemeris library for precise astronomical calculations.

## Features

- **Tithi Calculation**: Lunar day calculations with precise timing
- **Nakshatra Calculation**: Lunar mansion calculations  
- **Yoga Calculation**: Combined solar and lunar position calculations
- **Karana Calculation**: Half lunar day calculations
- **Masa Calculation**: Lunar month calculations with Adhika masa detection
- **Sunrise/Sunset Times**: Accurate solar event calculations
- **Moonrise/Moonset Times**: Lunar event calculations
- **Day Duration**: Calculation of day length

## API Endpoints

### Get Complete Panchanga
```
GET /panchanga?year=2025&month=8&day=13&latitude=12.9716&longitude=77.5946&timezone=5.5
POST /panchanga
```

### Individual Components
```
GET /panchanga/tithi?year=2025&month=8&day=13&latitude=12.9716&longitude=77.5946&timezone=5.5
GET /panchanga/nakshatra?year=2025&month=8&day=13&latitude=12.9716&longitude=77.5946&timezone=5.5
GET /panchanga/yoga?year=2025&month=8&day=13&latitude=12.9716&longitude=77.5946&timezone=5.5
```

### Health Check
```
GET /panchanga/health
```

## Parameters

- **year**: Gregorian calendar year
- **month**: Month (1-12)
- **day**: Day of month (1-31)
- **latitude**: Latitude in decimal degrees
- **longitude**: Longitude in decimal degrees  
- **timezone**: Timezone offset from UTC in hours

## Example Usage

### cURL Examples

```bash
# Get complete panchanga for Bangalore
curl "http://localhost:3000/panchanga?year=2025&month=8&day=13&latitude=12.9716&longitude=77.5946&timezone=5.5"

# Get only tithi information
curl "http://localhost:3000/panchanga/tithi?year=2025&month=8&day=13&latitude=12.9716&longitude=77.5946&timezone=5.5"

# POST request example
curl -X POST http://localhost:3000/panchanga \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2025,
    "month": 8,
    "day": 13,
    "latitude": 12.9716,
    "longitude": 77.5946,
    "timezone": 5.5
  }'
```

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Dependencies

- **@nestjs/core**: NestJS framework core
- **sweph**: Swiss Ephemeris bindings for Node.js - provides precise astronomical calculations

## Technical Details

### Swiss Ephemeris Package

This project uses the `sweph` package (version 2.10.3-b-1) which provides Node.js bindings for the Swiss Ephemeris library. Swiss Ephemeris is one of the most accurate astronomical calculation libraries available, used by professional astronomers and astrologers worldwide.

### Ayanamsa

The project uses the Lahiri Ayanamsa (SE_SIDM_LAHIRI) for sidereal calculations, which is the official ayanamsa used by the Government of India.

### Coordinate System

- All longitude and latitude values are in decimal degrees
- Timezone values are in hours offset from UTC (e.g., 5.5 for India Standard Time)
- Julian Day calculations use the Gregorian calendar system

### Accuracy

The calculations are accurate to within seconds for the time period 3000 BCE to 3000 CE, making them suitable for both historical research and future planning.

## Response Format

The API returns structured JSON data with timing information in both decimal hours and degrees-minutes-seconds format:

```json
{
  "date": {"year": 2025, "month": 8, "day": 13},
  "location": {"latitude": 12.9716, "longitude": 77.5946, "timezone": 5.5},
  "tithi": [{"number": 15, "name": "Purnima", "endTime": [6, 30, 45]}],
  "nakshatra": [{"number": 1, "name": "Ashwini", "endTime": [14, 22, 30]}],
  "yoga": [{"number": 12, "name": "Dhruva", "endTime": [18, 45, 15]}],
  "karana": {"number": 30, "name": "Amavasya"},
  "masa": {"number": 5, "name": "Shravana", "isAdhika": false},
  "vaara": 3,
  "sunrise": [6, 15, 30],
  "sunset": [18, 45, 20],
  "moonrise": [19, 30, 15],
  "moonset": [7, 20, 40],
  "dayDuration": [12, 29, 50]
}
```

## Support

For questions about astronomical calculations or API usage, please refer to the Swiss Ephemeris documentation or create an issue in this repository.

## License

This project is [MIT licensed](LICENSE).
