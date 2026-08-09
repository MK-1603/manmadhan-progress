export class ReadingPlanService {
  /**
   * Calculates the remaining pages to read.
   */
  static calculateRemainingPages(total: number, current: number): number {
    return Math.max(0, total - current);
  }

  /**
   * Calculates required pages per day to hit the target date.
   */
  static calculateRequiredPagesPerDay(remainingPages: number, targetDate: Date, startDate: Date = new Date()): number {
    if (remainingPages <= 0) return 0;
    const daysRemaining = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 0) return remainingPages; // Need to finish today
    return Math.ceil(remainingPages / daysRemaining);
  }

  /**
   * Calculates completion percentage.
   */
  static calculateCompletionPercentage(total: number, current: number): number {
    if (total === 0) return 0;
    return Math.min(100, Math.round((current / total) * 100));
  }

  /**
   * Calculates projected completion date based on daily pace.
   */
  static calculateProjectedCompletion(currentDate: Date, remainingPages: number, pacePerDay: number): Date {
    if (pacePerDay <= 0 || remainingPages <= 0) return currentDate;
    const daysNeeded = Math.ceil(remainingPages / pacePerDay);
    return new Date(currentDate.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
  }

  /**
   * Generates a status string based on pace vs target.
   */
  static calculateDeadlineStatus(currentDate: Date, projectedDate: Date, targetDate: Date): 'ON TRACK' | 'BEHIND' | 'AHEAD' {
    const projTime = projectedDate.getTime();
    const targTime = targetDate.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (projTime > targTime + oneDay) {
      return 'BEHIND';
    } else if (projTime < targTime - oneDay) {
      return 'AHEAD';
    } else {
      return 'ON TRACK';
    }
  }

  /**
   * Recalculates all fields for a book's reading plan.
   */
  static getFullPlan(book: { 
    pageCount: number | null; 
    currentPage: number; 
    targetDate: Date | null; 
    dailyPageTarget: number 
  }) {
    if (!book.pageCount) return null;

    const remainingPages = this.calculateRemainingPages(book.pageCount, book.currentPage);
    const completionPercent = this.calculateCompletionPercentage(book.pageCount, book.currentPage);
    
    let requiredPagesPerDay = book.dailyPageTarget;
    let status = 'ON TRACK';
    let daysRemaining = 0;
    let projectedDate = new Date();

    if (book.targetDate) {
      daysRemaining = Math.ceil((new Date(book.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      requiredPagesPerDay = this.calculateRequiredPagesPerDay(remainingPages, new Date(book.targetDate));
      projectedDate = this.calculateProjectedCompletion(new Date(), remainingPages, book.dailyPageTarget);
      status = this.calculateDeadlineStatus(new Date(), projectedDate, new Date(book.targetDate));
    } else {
      projectedDate = this.calculateProjectedCompletion(new Date(), remainingPages, book.dailyPageTarget);
    }

    return {
      total: book.pageCount,
      current: book.currentPage,
      remaining: remainingPages,
      completionPercent,
      daysRemaining: Math.max(0, daysRemaining),
      requiredPagesPerDay,
      userMinimum: book.dailyPageTarget,
      projectedDate,
      status
    };
  }
}
