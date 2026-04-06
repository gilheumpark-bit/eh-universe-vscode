// ============================================================
// PART 1 — Virtual List: calculateVisibleRange, getVirtualItems, DynamicVirtualList
// ============================================================

export interface VirtualRangeOptions {
  totalItems: number;
  containerHeight: number;
  estimatedItemHeight: number;
  overscan: number;
}

export interface VirtualRangeState {
  startIndex: number;
  endIndex: number;
  offsetTop: number;
  totalHeight: number;
  visibleCount: number;
}

/**
 * Calculate the visible range of items given a scroll position
 * and container/item dimensions.
 */
export function calculateVisibleRange(
  scrollTop: number,
  options: VirtualRangeOptions,
): VirtualRangeState {
  const { totalItems, containerHeight, estimatedItemHeight, overscan } = options;

  if (totalItems === 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      offsetTop: 0,
      totalHeight: 0,
      visibleCount: 0,
    };
  }

  const totalHeight = totalItems * estimatedItemHeight;
  const visibleCount = Math.ceil(containerHeight / estimatedItemHeight);

  const rawStart = Math.floor(scrollTop / estimatedItemHeight);
  const startIndex = Math.max(0, rawStart - overscan);
  const endIndex = Math.min(totalItems, rawStart + visibleCount + overscan);

  const offsetTop = startIndex * estimatedItemHeight;

  return {
    startIndex,
    endIndex,
    offsetTop,
    totalHeight,
    visibleCount: endIndex - startIndex,
  };
}

export interface VirtualItem {
  index: number;
  offsetTop: number;
}

/**
 * Generate virtual items from a visible range state.
 * Uses visibleCount to determine how many items to produce.
 */
export function getVirtualItems(
  state: VirtualRangeState,
  itemHeight: number,
): VirtualItem[] {
  const items: VirtualItem[] = [];
  for (let i = 0; i < state.visibleCount; i++) {
    items.push({
      index: state.startIndex + i,
      offsetTop: state.offsetTop + i * itemHeight,
    });
  }
  return items;
}

// ============================================================
// PART 2 — DynamicVirtualList class
// ============================================================

/**
 * A virtual list that supports per-item height overrides.
 */
export class DynamicVirtualList {
  private heights: number[];
  private defaultHeight: number;

  constructor(itemCount: number, estimatedItemHeight: number) {
    this.defaultHeight = estimatedItemHeight;
    this.heights = new Array(itemCount).fill(estimatedItemHeight);
  }

  getTotalHeight(): number {
    return this.heights.reduce((sum, h) => sum + h, 0);
  }

  setItemHeight(index: number, height: number): void {
    if (index >= 0 && index < this.heights.length) {
      this.heights[index] = height;
    }
  }

  resize(newCount: number): void {
    if (newCount > this.heights.length) {
      const extra = new Array(newCount - this.heights.length).fill(
        this.defaultHeight,
      );
      this.heights = [...this.heights, ...extra];
    } else {
      this.heights = this.heights.slice(0, newCount);
    }
  }

  getVisibleRange(
    scrollTop: number,
    containerHeight: number,
    overscan: number,
  ): VirtualRangeState {
    return calculateVisibleRange(scrollTop, {
      totalItems: this.heights.length,
      containerHeight,
      estimatedItemHeight: this.defaultHeight,
      overscan,
    });
  }
}

// IDENTITY_SEAL: PART-2 | role=virtual-list | inputs=scrollTop,dims | outputs=VirtualRangeState
