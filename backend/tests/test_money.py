from decimal import Decimal as D

from app.services.money import compute_totals, line_total


def test_brief_check_two_times_fifty_minus_ten_plus_ten_percent_is_99() -> None:
    totals = compute_totals([(D("2"), D("50"))], discount=D("10"), tax_rate_percent=D("10"))
    assert totals.subtotal == D("100.00")
    assert totals.discount == D("10.00")
    assert totals.tax == D("9.00")
    assert totals.total == D("99.00")


def test_each_line_is_rounded_half_up_before_summing() -> None:
    # 0.333 x 0.15 = 0.04995 -> 0.05 per line; rounding the sum instead would give 0.10.
    assert line_total(D("0.333"), D("0.15")) == D("0.05")
    totals = compute_totals([(D("0.333"), D("0.15"))] * 2, D("0"), D("0"))
    assert totals.subtotal == D("0.10")


def test_half_cent_rounds_up() -> None:
    assert line_total(D("1"), D("0.005")) == D("0.01")
    assert line_total(D("3"), D("0.335")) == D("1.01")  # 1.005


def test_tax_is_calculated_after_discount_and_rounded() -> None:
    # (19.99 - 0) x 8.875% = 1.77411... -> 1.77
    totals = compute_totals([(D("1"), D("19.99"))], D("0"), D("8.875"))
    assert totals.tax == D("1.77")
    assert totals.total == D("21.76")


def test_discount_equal_to_subtotal_gives_zero_total() -> None:
    totals = compute_totals([(D("1"), D("40"))], D("40"), D("20"))
    assert totals.total == D("0.00")


def test_no_lines() -> None:
    totals = compute_totals([], D("0"), D("10"))
    assert totals.subtotal == totals.tax == totals.total == D("0.00")
