/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hall } from '../types';

export interface KnapsackItem {
  hallId: string;
  name: string;
  capacity: number; // Value in knapsack
  cost: number;     // Weight / operational burden
}

export interface KnapsackResult {
  dpTable: number[][]; // [items + 1][capacity + 1]
  items: KnapsackItem[];
  capacityLimit: number;
  maxCapacityAchieved: number;
  totalCostIncurred: number;
  selectedHalls: KnapsackItem[];
  steps: string[];
  formula: string;
}

/**
 * 0/1 Knapsack Dynamic Programming for Exam Hall Resource Optimization
 * Recurrence:
 * DP[i][w] = DP[i-1][w]                                    if weight[i-1] > w
 * DP[i][w] = max(DP[i-1][w], DP[i-1][w - weight[i-1]] + val[i-1]) otherwise
 */
export function solve01Knapsack(
  halls: Hall[],
  capacityBudget: number = 10
): KnapsackResult {
  const steps: string[] = [];
  const items: KnapsackItem[] = halls.map((h) => {
    const usableSeats = h.seats.filter((s) => s.status !== 'aisle').length;
    return {
      hallId: h.id,
      name: h.name,
      capacity: usableSeats,
      cost: Math.max(1, Math.round(h.costWeight)), // normalized weight in budget units
    };
  });

  const n = items.length;
  const W = Math.max(1, capacityBudget);

  // Initialize DP table (n + 1) rows, (W + 1) columns
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));

  steps.push(
    `Initialized DP Table size (${n + 1} x ${W + 1}) for ${n} candidate examination halls under operational budget constraint ${W}.`
  );

  // Fill DP Table
  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    for (let w = 0; w <= W; w++) {
      if (item.cost <= w) {
        const includeVal = dp[i - 1][w - item.cost] + item.capacity;
        const excludeVal = dp[i - 1][w];

        if (includeVal > excludeVal) {
          dp[i][w] = includeVal;
        } else {
          dp[i][w] = excludeVal;
        }
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  // Backtrack to find selected halls
  const selectedHalls: KnapsackItem[] = [];
  let remainingW = W;
  let totalCostIncurred = 0;

  for (let i = n; i > 0 && remainingW > 0; i--) {
    if (dp[i][remainingW] !== dp[i - 1][remainingW]) {
      const selected = items[i - 1];
      selectedHalls.push(selected);
      totalCostIncurred += selected.cost;
      remainingW -= selected.cost;
      steps.push(
        `Selected ${selected.name}: Added capacity ${selected.capacity} for cost ${selected.cost}. Remaining budget: ${remainingW}.`
      );
    }
  }

  return {
    dpTable: dp,
    items,
    capacityLimit: W,
    maxCapacityAchieved: dp[n][W],
    totalCostIncurred,
    selectedHalls,
    steps,
    formula: 'DP[i][w] = max(DP[i-1][w], DP[i-1][w - cost[i]] + capacity[i])',
  };
}
