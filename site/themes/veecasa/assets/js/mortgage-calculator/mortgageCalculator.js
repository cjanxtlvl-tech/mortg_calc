/**
 * mortgageCalculator.js
 * Orchestration layer — ties together all sub-modules into a single
 * calculateMortgageSummary() call plus a UI binding helper.
 *
 * Dependencies (must be loaded before this file in the browser, or required
 * in Node.js):
 *   mortgageMath.js
 *   amortization.js
 *   biweekly.js
 *   formatters.js
 */

"use strict";

// ─── Module imports (Node) / globals (browser) ─────────────────────────────
let _math, _amort, _biweekly, _fmt;
if (typeof require !== "undefined") {
  _math = require("./mortgageMath");
  _amort = require("./amortization");
  _biweekly = require("./biweekly");
  _fmt = require("./formatters");
} else {
  _math = window._mortgageMath;
  _amort = window._mortgageAmortization;
  _biweekly = window._mortgageBiweekly;
  _fmt = window._mortgageFormatters;
}

// eslint-disable-next-line no-var
var {
  validateInput,
  normalizeDownPaymentFromPercent,
  normalizeDownPaymentFromAmount,
  calculateLoanAmount,
  calculateMonthlyPI,
  calculateMonthlyCosts,
  calculateTotalMonthlyPayment,
} = _math;

// eslint-disable-next-line no-var
var {
  generateMonthlyAmortization,
  generateYearlyAmortization,
  calculatePmiEnd,
} = _amort;

// eslint-disable-next-line no-var
var { generateBiweeklySchedule } = _biweekly;
// eslint-disable-next-line no-var
var { formatMonthYear } = _fmt;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Compute the complete mortgage summary from user inputs.
 *
 * @param {Object} input
 * @param {number} input.homeValue
 * @param {number} input.downPaymentAmount
 * @param {number} input.downPaymentPercent
 * @param {number} input.interestRate        Annual % (e.g. 6)
 * @param {number} input.loanTermYears
 * @param {number} input.propertyTaxAnnual
 * @param {number} input.pmiRateAnnual
 * @param {number} input.homeInsuranceAnnual
 * @param {number} input.hoaMonthly
 * @param {number} input.startMonth          1-based
 * @param {number} input.startYear
 *
 * @returns {{
 *   errors: string[],
 *   loanAmount: number,
 *   downPaymentAmount: number,
 *   downPaymentPercent: number,
 *   monthlyPI: number,
 *   monthlyPayment: number,
 *   monthlyPaymentAfterPMI: number | null,
 *   costs: Object,
 *   pmiEndDate: Object | null,
 *   totalPMIPayments: number,
 *   payoffDate: Object,
 *   totalInterestPaid: number,
 *   totalPMIPaid: number,
 *   totalTaxPaid: number,
 *   totalHomeInsurancePaid: number,
 *   totalHoaPaid: number,
 *   totalOfAllPayments: number,
 *   monthlyAmortization: Array,
 *   yearlyAmortization: Array,
 *   biweekly: Object,
 *   chartData: Object
 * }}
 */
function calculateMortgageSummary(input) {
  // --- Validate ---
  const errors = validateInput(input);
  if (errors.length) {
    return { errors };
  }

  // --- Core values ---
  const loanAmount = calculateLoanAmount(input.homeValue, input.downPaymentAmount);
  const { downPaymentPercent } = normalizeDownPaymentFromAmount(
    input.homeValue,
    input.downPaymentAmount
  );

  const monthlyPI = calculateMonthlyPI(
    loanAmount,
    input.interestRate,
    input.loanTermYears
  );

  const costs = calculateMonthlyCosts({
    propertyTaxAnnual: input.propertyTaxAnnual,
    homeInsuranceAnnual: input.homeInsuranceAnnual,
    hoaMonthly: input.hoaMonthly,
    loanAmount,
    homeValue: input.homeValue,
    pmiRateAnnual: input.pmiRateAnnual,
  });

  const monthlyPayment = calculateTotalMonthlyPayment(monthlyPI, costs);

  // --- Amortization ---
  const enrichedInput = {
    ...input,
    loanAmount,
  };

  const monthlyAmortization = generateMonthlyAmortization(enrichedInput);
  const yearlyAmortization = generateYearlyAmortization(monthlyAmortization);

  // --- PMI end ---
  const pmiInfo = calculatePmiEnd(monthlyAmortization, input.homeValue);

  // --- Totals ---
  let totalInterestPaid = 0;
  let totalPMIPaid = 0;
  let totalTaxPaid = 0;
  let totalHomeInsurancePaid = 0;
  let totalHoaPaid = 0;
  let totalOfAllPayments = 0;

  for (const row of monthlyAmortization) {
    totalInterestPaid += row.interestPaid;
    totalPMIPaid += row.pmiPaid;
    totalTaxPaid += row.taxPaid;
    totalHomeInsurancePaid += row.insurancePaid;
    totalHoaPaid += row.hoaPaid;
    totalOfAllPayments += row.totalPayment;
  }

  const lastRow = monthlyAmortization[monthlyAmortization.length - 1];
  const payoffDate = lastRow ? lastRow.paymentDate : null;

  // --- Bi-weekly ---
  const biweekly = generateBiweeklySchedule({
    loanAmount,
    interestRate: input.interestRate,
    loanTermYears: input.loanTermYears,
    monthlyTotalInterest: totalInterestPaid,
    startMonth: input.startMonth,
    startYear: input.startYear,
  });

  // --- Breakdown chart data (donut segments) ---
  const totalForChart =
    loanAmount + totalInterestPaid + totalTaxPaid + totalHomeInsurancePaid + totalPMIPaid + totalHoaPaid + input.downPaymentAmount;

  const chartData = {
    principal: loanAmount,
    interest: totalInterestPaid,
    tax: totalTaxPaid,
    insurance: totalHomeInsurancePaid,
    pmi: totalPMIPaid,
    hoa: totalHoaPaid,
    downPayment: input.downPaymentAmount,
    principalPercent: loanAmount / totalForChart,
    interestPercent: totalInterestPaid / totalForChart,
    taxPercent: totalTaxPaid / totalForChart,
    insurancePercent: totalHomeInsurancePaid / totalForChart,
    pmiPercent: totalPMIPaid / totalForChart,
    hoaPercent: (totalHoaPaid + input.downPaymentAmount) / totalForChart,
  };

  return {
    errors: [],
    loanAmount,
    downPaymentAmount: input.downPaymentAmount,
    downPaymentPercent,
    monthlyPI,
    monthlyPayment,
    monthlyPaymentAfterPMI: pmiInfo.monthlyPaymentAfterPMI,
    costs,
    pmiEndDate: pmiInfo.pmiEndDate,
    totalPMIPayments: pmiInfo.totalPMIPayments,
    payoffDate,
    totalInterestPaid,
    totalPMIPaid,
    totalTaxPaid,
    totalHomeInsurancePaid,
    totalHoaPaid,
    totalOfAllPayments,
    monthlyAmortization,
    yearlyAmortization,
    biweekly,
    chartData,
  };
}

// ─── CommonJS / browser dual export ────────────────────────────────────────
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calculateMortgageSummary,
    normalizeDownPaymentFromPercent,
    normalizeDownPaymentFromAmount,
    calculateLoanAmount,
  };
}
