/**
 * amortization.js
 * Monthly and yearly amortization schedule generators.
 * Depends on mortgageMath.js being loaded first (or required).
 */

"use strict";

// eslint-disable-next-line no-var
var {
  calculateMonthlyPI,
  calculateMonthlyCosts,
} =
  typeof require !== "undefined"
    ? require("./mortgageMath")
    : window._mortgageMath || {};

/**
 * Build the full monthly amortization schedule.
 *
 * @param {Object} input
 * @param {number} input.homeValue
 * @param {number} input.downPaymentAmount
 * @param {number} input.loanAmount
 * @param {number} input.interestRate        Annual % (e.g. 6)
 * @param {number} input.loanTermYears
 * @param {number} input.propertyTaxAnnual
 * @param {number} input.pmiRateAnnual
 * @param {number} input.homeInsuranceAnnual
 * @param {number} input.hoaMonthly
 * @param {number} input.startMonth          1-based (1 = January)
 * @param {number} input.startYear
 * @returns {Array<Object>}  One row per payment month
 */
function generateMonthlyAmortization(input) {
  const {
    homeValue,
    loanAmount,
    interestRate,
    loanTermYears,
    propertyTaxAnnual,
    pmiRateAnnual,
    homeInsuranceAnnual,
    hoaMonthly,
    startMonth = 1,
    startYear = new Date().getFullYear(),
  } = input;

  const monthlyRate = interestRate / 100 / 12;
  const monthlyPI = calculateMonthlyPI(loanAmount, interestRate, loanTermYears);
  const costs = calculateMonthlyCosts({
    propertyTaxAnnual,
    homeInsuranceAnnual,
    hoaMonthly,
    loanAmount,
    homeValue,
    pmiRateAnnual,
  });

  const pmiCutoffBalance = homeValue * 0.8;
  const { monthlyTax, monthlyInsurance } = costs;
  const baseMonthlyPMI = (loanAmount * (pmiRateAnnual / 100)) / 12;

  const rows = [];
  let balance = loanAmount;
  let month = startMonth - 1; // 0-based for Date logic
  let year = startYear;
  let paymentNumber = 0;

  while (balance > 0.005) {
    paymentNumber++;
    const interestPaid = balance * monthlyRate;
    let principalPaid = monthlyPI - interestPaid;

    // Cap principal on the final payment
    if (principalPaid > balance) {
      principalPaid = balance;
    }

    const pmiActive = balance > pmiCutoffBalance;
    const pmiPaid = pmiActive ? baseMonthlyPMI : 0;
    const beginningBalance = balance;
    const endingBalance = balance - principalPaid;
    const totalPayment =
      principalPaid + interestPaid + pmiPaid + monthlyTax + monthlyInsurance + hoaMonthly;

    // Build payment date
    const payMonth = (month % 12) + 1;
    const payYear = year + Math.floor(month / 12);

    rows.push({
      paymentNumber,
      paymentDate: { month: payMonth, year: payYear },
      beginningBalance,
      scheduledPayment: monthlyPI + pmiPaid + monthlyTax + monthlyInsurance + hoaMonthly,
      principalAndInterestPayment: monthlyPI,
      interestPaid,
      principalPaid,
      pmiPaid,
      taxPaid: monthlyTax,
      insurancePaid: monthlyInsurance,
      hoaPaid: hoaMonthly,
      totalPayment,
      endingBalance: Math.max(0, endingBalance),
      pmiActive,
    });

    balance = Math.max(0, endingBalance);
    month++;
  }

  return rows;
}

/**
 * Collapse monthly rows into yearly summaries.
 * @param {Array<Object>} monthlyRows
 * @returns {Array<Object>}  One row per calendar year
 */
function generateYearlyAmortization(monthlyRows) {
  const yearMap = new Map();

  for (const row of monthlyRows) {
    const yr = row.paymentDate.year;
    if (!yearMap.has(yr)) {
      yearMap.set(yr, {
        year: yr,
        totalInterest: 0,
        totalPrincipal: 0,
        totalPMI: 0,
        endingBalance: 0,
      });
    }
    const entry = yearMap.get(yr);
    entry.totalInterest += row.interestPaid;
    entry.totalPrincipal += row.principalPaid;
    entry.totalPMI += row.pmiPaid;
    entry.endingBalance = row.endingBalance;
  }

  return Array.from(yearMap.values());
}

/**
 * Find the first monthly row where PMI ends (balance <= 80% of home value).
 * @param {Array<Object>} monthlyRows
 * @param {number} homeValue
 * @returns {{ pmiEndDate: {month:number, year:number} | null, totalPMIPayments: number, monthlyPaymentAfterPMI: number }}
 */
function calculatePmiEnd(monthlyRows, homeValue) {
  let pmiEndDate = null;
  let totalPMIPayments = 0;

  for (const row of monthlyRows) {
    if (row.pmiActive) {
      totalPMIPayments++;
    } else if (pmiEndDate === null) {
      pmiEndDate = row.paymentDate;
    }
  }

  // Monthly payment after PMI = PI + tax + insurance + HOA (no PMI)
  const afterRow = monthlyRows.find((r) => !r.pmiActive);
  const monthlyPaymentAfterPMI = afterRow
    ? afterRow.principalAndInterestPayment +
      afterRow.taxPaid +
      afterRow.insurancePaid +
      afterRow.hoaPaid
    : null;

  return { pmiEndDate, totalPMIPayments, monthlyPaymentAfterPMI };
}

// ─── CommonJS / browser dual export ────────────────────────────────────────
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    generateMonthlyAmortization,
    generateYearlyAmortization,
    calculatePmiEnd,
  };
}
