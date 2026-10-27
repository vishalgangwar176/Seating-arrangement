/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HeapType = 'MIN' | 'MAX';

export interface HeapItem<T> {
  priority: number;
  data: T;
  label?: string;
}

export class BinaryHeap<T> {
  private heap: HeapItem<T>[] = [];
  private type: HeapType;
  swapHistory: string[] = [];

  constructor(type: HeapType = 'MAX') {
    this.type = type;
  }

  private parentIndex(i: number): number {
    return Math.floor((i - 1) / 2);
  }

  private leftChildIndex(i: number): number {
    return 2 * i + 1;
  }

  private rightChildIndex(i: number): number {
    return 2 * i + 2;
  }

  private compare(a: number, b: number): boolean {
    if (this.type === 'MAX') {
      return a > b; // Parent should be greater than child
    } else {
      return a < b; // Parent should be less than child
    }
  }

  insert(data: T, priority: number, label?: string): void {
    const item: HeapItem<T> = { priority, data, label };
    this.heap.push(item);
    this.heapifyUp(this.heap.length - 1);
  }

  private heapifyUp(index: number): void {
    let curr = index;
    while (curr > 0) {
      const parent = this.parentIndex(curr);
      if (this.compare(this.heap[curr].priority, this.heap[parent].priority)) {
        this.swap(curr, parent);
        this.swapHistory.push(
          `Heapify-Up: Swapped index ${curr} (${this.heap[parent].label || this.heap[parent].priority}) with parent ${parent}`
        );
        curr = parent;
      } else {
        break;
      }
    }
  }

  extract(): HeapItem<T> | null {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop()!;

    const root = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.heapifyDown(0);
    return root;
  }

  private heapifyDown(index: number): void {
    let curr = index;
    const length = this.heap.length;

    while (this.leftChildIndex(curr) < length) {
      let targetChild = this.leftChildIndex(curr);
      const rightChild = this.rightChildIndex(curr);

      if (
        rightChild < length &&
        this.compare(this.heap[rightChild].priority, this.heap[targetChild].priority)
      ) {
        targetChild = rightChild;
      }

      if (this.compare(this.heap[targetChild].priority, this.heap[curr].priority)) {
        this.swap(curr, targetChild);
        this.swapHistory.push(
          `Heapify-Down: Swapped index ${curr} with child ${targetChild} (${this.heap[curr].label || this.heap[curr].priority})`
        );
        curr = targetChild;
      } else {
        break;
      }
    }
  }

  peek(): HeapItem<T> | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  getArray(): HeapItem<T>[] {
    return [...this.heap];
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}

/**
 * In-place Heap Sort demonstration
 * Complexity: O(N log N) time, O(1) auxiliary space
 */
export interface HeapSortStep {
  stepNumber: number;
  description: string;
  arrayState: number[];
}

export function runHeapSort(input: number[]): {
  sorted: number[];
  steps: HeapSortStep[];
  comparisons: number;
  swaps: number;
} {
  const arr = [...input];
  const steps: HeapSortStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  const n = arr.length;

  steps.push({
    stepNumber: 0,
    description: `Initial unsorted array of candidate counts / roll segments: [${arr.join(', ')}]`,
    arrayState: [...arr],
  });

  const heapify = (size: number, i: number) => {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;

    if (left < size) {
      comparisons++;
      if (arr[left] > arr[largest]) {
        largest = left;
      }
    }

    if (right < size) {
      comparisons++;
      if (arr[right] > arr[largest]) {
        largest = right;
      }
    }

    if (largest !== i) {
      swaps++;
      const temp = arr[i];
      arr[i] = arr[largest];
      arr[largest] = temp;
      heapify(size, largest);
    }
  };

  // Phase 1: Build max-heap (bottom up)
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i);
  }

  steps.push({
    stepNumber: 1,
    description: `Phase 1 Complete: Max-Heap constructed [${arr.join(', ')}]. Root (${arr[0]}) is the maximum element.`,
    arrayState: [...arr],
  });

  // Phase 2: Extract elements from heap one by one
  for (let i = n - 1; i > 0; i--) {
    swaps++;
    const temp = arr[0];
    arr[0] = arr[i];
    arr[i] = temp;

    steps.push({
      stepNumber: steps.length,
      description: `Swapped root ${arr[i]} with end position ${i}. Restoring heap property for size ${i}...`,
      arrayState: [...arr],
    });

    heapify(i, 0);
  }

  steps.push({
    stepNumber: steps.length,
    description: `Phase 2 Complete: Array fully sorted in ascending order: [${arr.join(', ')}]`,
    arrayState: [...arr],
  });

  return { sorted: arr, steps, comparisons, swaps };
}
