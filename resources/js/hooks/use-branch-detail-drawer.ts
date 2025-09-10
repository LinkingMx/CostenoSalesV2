import { useState, useCallback, useRef } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { BranchDetailData } from '@/types/branch-detail';

interface UseBranchDetailDrawerState {
  isOpen: boolean;
  branchData: BranchDetailData | null;
  dateRange: DateRange | undefined;
}

interface UseBranchDetailDrawerOptions {
  defaultDateRange?: DateRange;
  onBranchChange?: (branchData: BranchDetailData | null) => void;
}

export function useBranchDetailDrawer(options: UseBranchDetailDrawerOptions = {}) {
  const { 
    defaultDateRange = {
      from: startOfDay(subDays(new Date(), 7)),
      to: endOfDay(new Date())
    },
    onBranchChange
  } = options;

  const [state, setState] = useState<UseBranchDetailDrawerState>({
    isOpen: false,
    branchData: null,
    dateRange: defaultDateRange
  });

  // Keep track of the last opened branch to maintain state
  const lastBranchRef = useRef<string | null>(null);
  const stateHistoryRef = useRef<Map<string, Partial<UseBranchDetailDrawerState>>>(new Map());

  const openDrawer = useCallback((branchData: BranchDetailData, dashboardDateRange?: DateRange) => {
    const branchKey = `${branchData.branchName}_${branchData.storeId}`;
    const isSameBranch = lastBranchRef.current === branchKey;
    
    // Use dashboard filter as initial value, or restore previous state for same branch
    const initialDateRange = dashboardDateRange || defaultDateRange;
    const restoredState = isSameBranch 
      ? stateHistoryRef.current.get(branchKey) || {}
      : { dateRange: initialDateRange };

    setState(prevState => ({
      ...prevState,
      isOpen: true,
      branchData,
      ...restoredState
    }));

    lastBranchRef.current = branchKey;
    onBranchChange?.(branchData);
  }, [defaultDateRange, onBranchChange]);

  const closeDrawer = useCallback(() => {
    // Save current state before closing
    if (state.branchData && lastBranchRef.current) {
      const branchKey = lastBranchRef.current;
      stateHistoryRef.current.set(branchKey, {
        dateRange: state.dateRange
      });
    }

    setState(prevState => ({
      ...prevState,
      isOpen: false
    }));

    onBranchChange?.(null);
  }, [state.branchData, state.dateRange, onBranchChange]);

  const updateDateRange = useCallback((newDateRange: DateRange | undefined) => {
    setState(prevState => ({
      ...prevState,
      dateRange: newDateRange
    }));
  }, []);


  // Reset function to clear all saved states (useful for debugging or cache clearing)
  const resetStates = useCallback(() => {
    stateHistoryRef.current.clear();
    lastBranchRef.current = null;
  }, []);

  return {
    isOpen: state.isOpen,
    branchData: state.branchData,
    dateRange: state.dateRange,
    openDrawer,
    closeDrawer,
    updateDateRange,
    resetStates
  };
}