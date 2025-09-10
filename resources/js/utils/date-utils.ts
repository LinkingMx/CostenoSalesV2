import { format, isToday, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

/**
 * Checks if today's date is included in the given date range
 * @param startDate - Start date in YYYY-MM-DD format or Date object
 * @param endDate - End date in YYYY-MM-DD format or Date object (optional, defaults to startDate)
 * @returns true if today is within the date range (inclusive), false otherwise
 */
export function isTodayIncludedInRange(
    startDate: string | Date, 
    endDate?: string | Date
): boolean {
    try {
        const today = new Date();
        
        // Parse start date
        const start = typeof startDate === 'string' 
            ? parseISO(startDate) 
            : startDate;
        
        // Parse end date (default to start date if not provided)
        const end = endDate 
            ? (typeof endDate === 'string' ? parseISO(endDate) : endDate)
            : start;
        
        // Check if today is within the range (inclusive)
        return isWithinInterval(today, {
            start: startOfDay(start),
            end: endOfDay(end)
        });
    } catch (error) {
        // Return false if there's any parsing error
        console.warn('Error checking if today is included in range:', error);
        return false;
    }
}

/**
 * Formats a date string to a more readable format
 * @param dateString - Date in YYYY-MM-DD format
 * @param formatString - Format string (default: 'dd/MM/yyyy')
 * @returns Formatted date string
 */
export function formatDateString(
    dateString: string, 
    formatString: string = 'dd/MM/yyyy'
): string {
    try {
        const date = parseISO(dateString);
        return format(date, formatString);
    } catch (error) {
        console.warn('Error formatting date string:', error);
        return dateString;
    }
}

/**
 * Checks if a specific date is today
 * @param date - Date in YYYY-MM-DD format or Date object
 * @returns true if the date is today, false otherwise
 */
export function isDateToday(date: string | Date): boolean {
    try {
        const targetDate = typeof date === 'string' ? parseISO(date) : date;
        return isToday(targetDate);
    } catch (error) {
        console.warn('Error checking if date is today:', error);
        return false;
    }
}