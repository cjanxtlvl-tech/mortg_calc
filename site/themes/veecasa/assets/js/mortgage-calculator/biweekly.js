/**
 * biweekly.js
 * Bi-weekly payment schedule and interest savings comparison.
 * Depends on mortgageMath.js (calculateMonthlyPI).
 */

"use strict";

// eslint-disable-next-line no-var
var { calculateMonthlyPI } =
  typeof require !== "undefined"
    ? require("./mortgageMath")
    : window._mortgageMath || {};

/**
 * Generate a bi-weekly amortization schedule and calculate savings
 * compared to a standard monthly schedule.
 *
 * Strategy:
 *   - biweeklyPayment = monthlyPI / 2
 *   - biweeklyRate    = annualRate / 100 / 26
 *   - 26 payments per year results in the equivalent of one extra monthly
 *     payment per year, paying down principal faster.
 *
 * @param {Object} input
 * @param {number} input.loanAmount
 * @param {number} input.interestRate      Annual % (e.g. 6)
 * @param {number} input.loanTermYears
 * @param {number} input.monthlyTotalInterest  Total interest on the monthly schedule
 * @param {number} input.startMonth        1-based
 * @param {number} input.startYear
 * @returns {Object}
 */
function generateBiweeklySchedule(input) {
  const {
    loanAmount,
    interestRate,
    loanTermYears,
    monthlyTotalInterest,
    startMonth = 1,
    startYear = new Date().getFullYear(),
  } = input;

  const biweeklyRate = interestRate / 100 / 26;
  const monthlyPI = calculateMonthlyPI(loanAmount, interestRate, loanTermYears);
  const biweeklyPayment = monthlyPI / 2;

  let balance = loanAmount;
  let totalInterest = 0;
  let paymentCount = 0;

  // Track the start date as a day-based offset to determine payoff date
  // Each bi-weekly period = 14 days
  const startDate = new Date(startYear, startMonth - 1, 1);
  let currentDate = new Date(startDate);

  while (balance > 0.005) {
    const interestPaid = balance * biweeklyRate;
    let principalPaid = biweeklyPayment - interestPaid;

    if (principalPaid > balance) {
      principalPaid = balance;
    }

    totalInterest += interestPaid;
    balance = Math.max(0, balance - principalPaid);
    paymentCount++;

    // Advance 14 days per payment
    currentDate = new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  }

  const interestSavings = monthlyTotalInterest - totalInterest;

  return {
    biweeklyPayment,
    biweeklyPayoffDate: {
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
    },
    biweeklyTotalInterest: totalInterest,
    biweeklyPaymentCount: paymentCount,
    totalInterestSavings: Math.max(0, interestSavings),
  };
}

// ─── CommonJS / browser dual export ────────────────────────────────────────
if (typeof module !== "undefined" && module.exports) {
  module.exports = { generateBiweeklySchedule };
}
