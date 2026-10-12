declare module 'date-fns' {
  export function differenceInSeconds(dateLeft: Date | number, dateRight: Date | number): number;
}

declare module 'date-fns-tz' {
  export function toZonedTime(date: Date | string | number, timeZone: string): Date;
  export function formatInTimeZone(date: Date | string | number, timeZone: string, format: string): string;
}
