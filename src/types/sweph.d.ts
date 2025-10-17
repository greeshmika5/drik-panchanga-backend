declare module 'sweph' {
  export interface CalcResult {
    flag: number;
    error?: string;
    data: number[]; // Array where data[0] is longitude, data[1] is latitude, etc.
  }

  export interface RiseTransResult {
    flag: number;
    error?: string;
    data: number;
  }

  export interface JulianResult {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  }

  // Constants
  export const SE_SUN: number;
  export const SE_MOON: number;
  export const SE_MERCURY: number;
  export const SE_VENUS: number;
  export const SE_MARS: number;
  export const SE_JUPITER: number;
  export const SE_SATURN: number;
  export const SE_URANUS: number;
  export const SE_NEPTUNE: number;
  export const SE_PLUTO: number;
  export const SE_MEAN_NODE: number;
  export const SE_TRUE_NODE: number;
  export const SE_MEAN_APOG: number;
  export const SE_OSCU_APOG: number;
  export const SE_EARTH: number;
  export const SE_CHIRON: number;
  export const SE_PHOLUS: number;
  export const SE_CERES: number;
  export const SE_PALLAS: number;
  export const SE_JUNO: number;
  export const SE_VESTA: number;
  export const SE_INTP_APOG: number;
  export const SE_INTP_PERG: number;

  // Flags
  export const SEFLG_JPLEPH: number;
  export const SEFLG_SWIEPH: number;
  export const SEFLG_MOSEPH: number;
  export const SEFLG_HELCTR: number;
  export const SEFLG_TRUEPOS: number;
  export const SEFLG_J2000: number;
  export const SEFLG_NONUT: number;
  export const SEFLG_SPEED3: number;
  export const SEFLG_SPEED: number;
  export const SEFLG_NOGDEFL: number;
  export const SEFLG_NOABERR: number;
  export const SEFLG_ASTROMETRIC: number;
  export const SEFLG_EQUATORIAL: number;
  export const SEFLG_XYZ: number;
  export const SEFLG_RADIANS: number;
  export const SEFLG_BARYCTR: number;
  export const SEFLG_TOPOCTR: number;
  export const SEFLG_ORBEL_AA: number;
  export const SEFLG_TROPICAL: number;
  export const SEFLG_SIDEREAL: number;
  export const SEFLG_ICRS: number;

  // Calendar
  export const SE_JUL_CAL: number;
  export const SE_GREG_CAL: number;

  // Rise/Transit flags
  export const SE_CALC_RISE: number;
  export const SE_CALC_SET: number;
  export const SE_CALC_MTRANSIT: number;
  export const SE_CALC_ITRANSIT: number;
  export const SE_BIT_DISC_CENTER: number;
  export const SE_BIT_DISC_BOTTOM: number;
  export const SE_BIT_GEOCTR_NO_ECL_LAT: number;
  export const SE_BIT_NO_REFRACTION: number;
  export const SE_BIT_CIVIL_TWILIGHT: number;
  export const SE_BIT_NAUTICAL_TWILIGHT: number;
  export const SE_BIT_ASTRO_TWILIGHT: number;
  export const SE_BIT_FIXED_DISC_SIZE: number;

  // Sidereal modes
  export const SE_SIDM_FAGAN_BRADLEY: number;
  export const SE_SIDM_LAHIRI: number;
  export const SE_SIDM_DELUCE: number;
  export const SE_SIDM_RAMAN: number;
  export const SE_SIDM_USHASHASHI: number;
  export const SE_SIDM_KRISHNAMURTI: number;
  export const SE_SIDM_DJWHAL_KHUL: number;
  export const SE_SIDM_YUKTESHWAR: number;
  export const SE_SIDM_JN_BHASIN: number;
  export const SE_SIDM_BABYL_KUGLER1: number;
  export const SE_SIDM_BABYL_KUGLER2: number;
  export const SE_SIDM_BABYL_KUGLER3: number;
  export const SE_SIDM_BABYL_HUBER: number;
  export const SE_SIDM_BABYL_ETPSC: number;
  export const SE_SIDM_ALDEBARAN_15TAU: number;
  export const SE_SIDM_HIPPARCHOS: number;
  export const SE_SIDM_SASSANIAN: number;
  export const SE_SIDM_GALCENT_0SAG: number;
  export const SE_SIDM_J2000: number;
  export const SE_SIDM_J1900: number;
  export const SE_SIDM_B1950: number;
  export const SE_SIDM_SURYASIDDHANTA: number;
  export const SE_SIDM_SURYASIDDHANTA_MSUN: number;
  export const SE_SIDM_ARYABHATA: number;
  export const SE_SIDM_ARYABHATA_MSUN: number;
  export const SE_SIDM_SS_REVATI: number;
  export const SE_SIDM_SS_CITRA: number;
  export const SE_SIDM_TRUE_CITRA: number;
  export const SE_SIDM_TRUE_REVATI: number;
  export const SE_SIDM_TRUE_PUSHYA: number;
  export const SE_SIDM_GALCENT_RGILBRAND: number;
  export const SE_SIDM_GALEQU_IAU1958: number;
  export const SE_SIDM_GALEQU_TRUE1997: number;
  export const SE_SIDM_GALEQU_MULA: number;
  export const SE_SIDM_GALALIGN_MARDYKS: number;
  export const SE_SIDM_TRUE_MULA: number;
  export const SE_SIDM_GALCENT_MULA_WILHELM: number;
  export const SE_SIDM_ARYABHATA_522: number;
  export const SE_SIDM_BABYL_BRITTON: number;
  export const SE_SIDM_TRUE_SHEORAN: number;
  export const SE_SIDM_GALCENT_COCHRANE: number;
  export const SE_SIDM_GALEQU_FIORENZA: number;
  export const SE_SIDM_VALENS_MOON: number;
  export const SE_SIDM_LAHIRI_1940: number;
  export const SE_SIDM_LAHIRI_VP285: number;
  export const SE_SIDM_KRISHNAMURTI_VP291: number;
  export const SE_SIDM_LAHIRI_ICRC: number;
  export const SE_SIDM_USER: number;

  // Functions
  export function set_ephe_path(path: string): void;
  export function set_sid_mode(mode: number, t0: number, ayan_t0: number): void;
  export function calc_ut(
    tjd_ut: number,
    ipl: number,
    iflag: number,
  ): CalcResult;
  export function julday(
    year: number,
    month: number,
    day: number,
    hour: number,
    gregflag: number,
  ): number;
  export function revjul(jd: number, gregflag: number): JulianResult;
  // Overloaded: some wrappers expect consolidated [lon, lat, alt] plus pressure & temp; adapt for runtime variant
  export function rise_trans(
    tjd_ut: number,
    ipl: number,
    starname: string,
    epheflag: number,
    rsmi: number,
    geo: [number, number, number],
    pressure: number,
    temperature: number,
  ): RiseTransResult;
  export function get_ayanamsa_ut(tjd_ut: number): number;
  export function close(): void;
  export function version(): string;
}
