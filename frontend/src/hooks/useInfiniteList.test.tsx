import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInfiniteList } from "./useInfiniteList";

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;
let observers: Array<{ callback: ObserverCallback; disconnected: boolean }> = [];

/** Fires every live observer as if the sentinel scrolled into view */
const scrollSentinelIntoView = () =>
  act(() => {
    observers.filter((o) => !o.disconnected).forEach((o) => o.callback([{ isIntersecting: true }]));
  });

function List({ items }: { items: number[] }) {
  const { visibleItems, hasMore, loadingMore, sentinelRef } = useInfiniteList(items, 24, 450);
  return (
    <div>
      <span data-testid="count">{visibleItems.length}</span>
      {loadingMore && <span>loading</span>}
      {hasMore && <div ref={sentinelRef} />}
    </div>
  );
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("useInfiniteList", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    observers = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        private entry: { callback: ObserverCallback; disconnected: boolean };
        constructor(callback: ObserverCallback) {
          this.entry = { callback, disconnected: false };
          observers.push(this.entry);
        }
        observe() {}
        disconnect() {
          this.entry.disconnected = true;
        }
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the loader, then the next page, until every item is visible", () => {
    render(<List items={range(60)} />);
    expect(screen.getByTestId("count").textContent).toBe("24");

    scrollSentinelIntoView();
    expect(screen.getByText("loading")).toBeTruthy();
    act(() => vi.advanceTimersByTime(450));
    expect(screen.getByTestId("count").textContent).toBe("48");
    expect(screen.queryByText("loading")).toBeNull();

    scrollSentinelIntoView();
    act(() => vi.advanceTimersByTime(450));
    expect(screen.getByTestId("count").textContent).toBe("60");
    expect(screen.queryByText("loading")).toBeNull();
  });

  it("starts from the first page again when the list changes (filters)", () => {
    const { rerender } = render(<List items={range(60)} />);
    scrollSentinelIntoView();
    act(() => vi.advanceTimersByTime(450));
    expect(screen.getByTestId("count").textContent).toBe("48");

    rerender(<List items={range(30)} />);
    expect(screen.getByTestId("count").textContent).toBe("24");
  });

  it("does not show a loader when everything fits on one page", () => {
    render(<List items={range(10)} />);
    expect(screen.getByTestId("count").textContent).toBe("10");
    scrollSentinelIntoView();
    expect(screen.queryByText("loading")).toBeNull();
  });
});
