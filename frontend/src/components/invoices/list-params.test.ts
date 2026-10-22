import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATE,
  nextSort,
  pageRange,
  parseListState,
  toSearchParams,
} from "@/components/invoices/list-params";

describe("URL state", () => {
  it("round-trips non-default values", () => {
    const state = {
      q: "harbor",
      status: "overdue",
      sort: "total",
      direction: "asc",
      page: 3,
    } as const;
    expect(parseListState(toSearchParams(state))).toEqual(state);
    expect(toSearchParams(state).toString()).toBe(
      "q=harbor&status=overdue&sort=total&dir=asc&page=3",
    );
  });

  it("keeps default URLs empty", () => {
    expect(toSearchParams(DEFAULT_STATE).toString()).toBe("");
  });

  it("ignores unknown or malformed values", () => {
    const parsed = parseListState(
      new URLSearchParams("status=archived&sort=secret&dir=up&page=-2"),
    );
    expect(parsed).toEqual(DEFAULT_STATE);
    expect(parseListState(new URLSearchParams("page=2.5")).page).toBe(1);
  });
});

describe("nextSort", () => {
  it("flips the active column and starts new columns in their natural order", () => {
    expect(nextSort(DEFAULT_STATE, "issue_date")).toEqual({ sort: "issue_date", direction: "asc" });
    expect(nextSort(DEFAULT_STATE, "customer")).toEqual({ sort: "customer", direction: "asc" });
    expect(nextSort(DEFAULT_STATE, "total")).toEqual({ sort: "total", direction: "desc" });
  });
});

describe("pageRange", () => {
  it("lists every page when there are few", () => {
    expect(pageRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses long ranges around the current page", () => {
    expect(pageRange(1, 20)).toEqual([1, 2, null, 20]);
    expect(pageRange(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
    expect(pageRange(20, 20)).toEqual([1, null, 19, 20]);
  });

  it("shows a single skipped page instead of an ellipsis", () => {
    expect(pageRange(4, 20)).toEqual([1, 2, 3, 4, 5, null, 20]);
  });
});
