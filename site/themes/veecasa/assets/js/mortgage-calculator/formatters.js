/**
 * formatters.js
 * Display-only helpers for currency, percentages, and dates.
 * Never used inside math/formula modules — formatting is presentation only.
 */

"use strict";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Format a number as USD currency (e.g. $1,234.56).
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
function formatCurrency(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number as a short currency (e.g. $1.2M, $320K).
 * Used for summary panels where space is limited.
 * @param {number} value
 * @returns {string}
 */
function formatCurrencyShort(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return formatCurrency(value);
}

/**
 * Format a decimal as a percentage string (e.g. 0.0512 → "5.12%").
 * @param {number} value  Ratio (0–1)
 * @param {number} [decimals=2]
 * @returns {string}
 */
function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return "0.00%";
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a raw percentage number as a string (e.g. 5 → "5.00%").
 * @param {number} value  Already in percent form (e.g. 6 for 6%)
 * @param {number} [decimals=2]
 * @returns {string}
 */
function formatPercentRaw(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return "0.00%";
  return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Format a month/year object as "Month, YYYY" (e.g. "Mar, 2026").
 * @param {{ month: number, year: number } | null} date
 * @returns {string}
 */
function formatMonthYear(date) {
  if (!date) return "N/A";
  return `${MONTH_NAMES[date.month - 1]}, ${date.year}`;
}

/**
 * Format a month/year object as "Month YYYY" (e.g. "March 2026").
 * @param {{ month: number, year: number } | null} date
 * @returns {string}
 */
function formatMonthYearFull(date) {
  if (!date) return "N/A";
  return `${MONTH_NAMES_FULL[date.month - 1]} ${date.year}`;
}

/**
 * Format a plain number with thousands separators (e.g. 12000 → "12,000").
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ─── CommonJS / browser dual export ────────────────────────────────────────
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    formatCurrency,
    formatCurrencyShort,
    formatPercent,
    formatPercentRaw,
    formatMonthYear,
    formatMonthYearFull,
    formatNumber,
    MONTH_NAMES_FULL,
  };
}
