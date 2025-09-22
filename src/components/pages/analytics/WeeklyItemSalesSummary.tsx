import React, { useMemo } from 'react';
import { getWeeksInRange, isDateInWeek } from '../../../lib/utils';
import { DateFilterOption } from '../../molecules/DateFilters';

interface WeeklyItemSalesSummaryProps {
  filteredSales: any[];
  dateFilter: DateFilterOption;
}

export function WeeklyItemSalesSummary({ filteredSales, dateFilter }: WeeklyItemSalesSummaryProps) {
  const weeklySummary = useMemo(() => {
    // Determine date range based on filter
    let startDate: Date, endDate: Date;

    if (dateFilter === 'current-month') {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    } else if (dateFilter === 'previous-month') {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
    } else {
      // For 'overall', use the existing logic
      if (filteredSales.length === 0) return [];
      startDate = new Date(Math.min(...filteredSales.map(s => new Date(s.createdAt).getTime())));
      endDate = new Date(Math.max(...filteredSales.map(s => new Date(s.createdAt).getTime())));
    }

    const weeks = getWeeksInRange(startDate, endDate);

    const weeklyData = weeks.map(week => {
      const weekSales = filteredSales.filter(sale =>
        isDateInWeek(sale.createdAt, week.start, week.end)
      );

      const totalItems = weekSales.reduce(
        (acc, sale) =>
          acc + sale.lines.reduce((lineAcc: number, line: any) => lineAcc + line.quantity, 0),
        0
      );
      const salesCount = weekSales.length;
      const averageItemsPerSale = salesCount > 0 ? totalItems / salesCount : 0;

      return {
        weekStart: week.start,
        weekEnd: week.end,
        totalItems,
        salesCount,
        averageItemsPerSale,
      };
    });

    // For month views, show all weeks including those with zero sales
    // For overall view, only show weeks with sales
    if (dateFilter === 'overall') {
      return weeklyData.filter(week => week.salesCount > 0);
    }
    return weeklyData;
  }, [filteredSales, dateFilter]);

  const formatWeekRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.toLocaleDateString('en-US', options);
    return `${startStr} - ${endStr}`;
  };

  if (weeklySummary.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Weekly Items Sales Summary</div>
        <div className="text-gray-500">No sales data available</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">Weekly Items Sales Summary</div>
      <div className="weekly-summary-container">
        {weeklySummary.map((week, index) => (
          <div key={index} className="weekly-summary-item">
            <div className="week-range">{formatWeekRange(week.weekStart, week.weekEnd)}</div>
            <div className="week-stats">
              <div className="stat">
                <span className="stat-label">Sales:</span>
                <span className="stat-value">{week.salesCount}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Items:</span>
                <span className="stat-value green">{week.totalItems}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Avg/Sale:</span>
                <span className="stat-value">{week.averageItemsPerSale.toFixed(1)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
