// CSL SLA working-day and status utility functions

/**
 * Normalizes a date input to a Date object.
 */
export function toDate(d: Date | string | number): Date {
    return new Date(d);
}

/**
 * Checks if a given date is a weekend (Saturday or Sunday).
 */
export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Checks if a given date matches any holiday in the YYYY-MM-DD formatted array.
 */
export function isHoliday(date: Date, holidays: string[]): boolean {
    const formatted = date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
        String(date.getDate()).padStart(2, '0');
    return holidays.includes(formatted);
}

/**
 * Adds a specific number of working days to a start date, excluding weekends and holidays.
 */
export function addWorkingDays(startDate: Date | string, workingDays: number, holidays: string[] = []): Date {
    let current = toDate(startDate);
    let daysToAdd = workingDays;

    while (daysToAdd > 0) {
        current.setDate(current.getDate() + 1);
        if (!isWeekend(current) && !isHoliday(current, holidays)) {
            daysToAdd--;
        }
    }
    return current;
}

/**
 * Calculates the number of working days between two dates, excluding weekends and holidays.
 * Returns negative if end is before start.
 */
export function getWorkingDaysDifference(startDate: Date | string, endDate: Date | string, holidays: string[] = []): number {
    const start = toDate(startDate);
    const end = toDate(endDate);
    
    // Normalize times to midnight to calculate pure days
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    
    if (s.getTime() === e.getTime()) return 0;
    
    const isNegative = s.getTime() > e.getTime();
    let current = isNegative ? new Date(e) : new Date(s);
    const target = isNegative ? new Date(s) : new Date(e);
    let count = 0;

    while (current.getTime() < target.getTime()) {
        current.setDate(current.getDate() + 1);
        if (!isWeekend(current) && !isHoliday(current, holidays)) {
            count++;
        }
    }

    return isNegative ? -count : count;
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
    return date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
        String(date.getDate()).padStart(2, '0');
}

/**
 * Determines the SLA status of a request.
 */
export type SLAStatus = 'ON_TRACK' | 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'COMPLETED_ON_TIME' | 'COMPLETED_LATE';

export function getSlaStatus(
    dueDate: Date | string,
    status: string,
    completedAt?: Date | string | null,
    holidays: string[] = []
): SLAStatus {
    const due = toDate(dueDate);
    const resolved = completedAt ? toDate(completedAt) : null;
    
    // If ticket is completed/closed
    if (status === 'COMPLETED' || status === 'CLOSED' || status === 'RESPONDED') {
        const checkDate = resolved || new Date();
        return checkDate.getTime() <= due.getTime() ? 'COMPLETED_ON_TIME' : 'COMPLETED_LATE';
    }

    const now = new Date();
    const todayStr = formatDateString(now);
    const dueStr = formatDateString(due);

    // Normalize to dates
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    if (todayDate.getTime() > dueDateOnly.getTime()) {
        return 'OVERDUE';
    }

    if (todayStr === dueStr) {
        return 'DUE_TODAY';
    }

    // Check if due in 1 working day
    const workingDaysLeft = getWorkingDaysDifference(now, due, holidays);
    if (workingDaysLeft <= 1) {
        return 'DUE_SOON';
    }

    return 'ON_TRACK';
}

/**
 * Gets human-readable elapsed, remaining, or overdue time metrics in working days.
 */
export interface SLAMetrics {
    elapsedDays: number;
    remainingDays: number;
    overdueDays: number;
    percentTimeUsed: number;
}

export function calculateSlaMetrics(
    createdAt: Date | string,
    dueDate: Date | string,
    status: string,
    completedAt?: Date | string | null,
    holidays: string[] = []
): SLAMetrics {
    const created = toDate(createdAt);
    const due = toDate(dueDate);
    const resolved = completedAt ? toDate(completedAt) : null;
    const now = new Date();

    const endDateForElapsed = resolved || now;
    
    // Calculate elapsed working days
    let elapsedDays = getWorkingDaysDifference(created, endDateForElapsed, holidays);
    if (elapsedDays < 0) elapsedDays = 0;

    // Total target working days
    const totalTargetDays = Math.max(1, getWorkingDaysDifference(created, due, holidays));

    let remainingDays = 0;
    let overdueDays = 0;

    const currentCheck = endDateForElapsed;
    
    if (currentCheck.getTime() > due.getTime()) {
        // Overdue
        overdueDays = getWorkingDaysDifference(due, currentCheck, holidays);
        if (overdueDays < 0) overdueDays = 0;
        remainingDays = 0;
    } else {
        // On Track
        remainingDays = getWorkingDaysDifference(currentCheck, due, holidays);
        if (remainingDays < 0) remainingDays = 0;
        overdueDays = 0;
    }

    const percentTimeUsed = Math.min(100, Math.round((elapsedDays / totalTargetDays) * 100));

    return {
        elapsedDays,
        remainingDays,
        overdueDays,
        percentTimeUsed
    };
}
