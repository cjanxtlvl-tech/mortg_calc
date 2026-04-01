/**
 * mortgageMath.js
 * Pure mortgage formula functions — no side effects, no DOM access.
 * All inputs are plain numbers. All outputs are plain numbers (full precision).
 */

"use strict";

/**
 * Validate all calculator inputs. Returns an array of error strings.
 * An empty array means the inputs are valid.
 * @param {Object} input
 * @returns {string[]}
 */
function validateInput(input) {
  const errors = [];
  if (!input.homeValue || input.homeValue <= 0)
    errors.push("Home value must be greater than 0.");
  if (input.downPaymentAmount < 0)
    errors.push("Down payment cannot be negative.");
  if (input.downPaymentAmount > input.homeValue)
    errors.push("Down payment cannot exceed home value.");
  if (input.interestRate < 0)
    errors.push("Interest rate cannot be negative.");
  if (!input.loanTermYears || input.loanTermYears <= 0)
    errors.push("Loan term must be greater than 0.");
  if (input.propertyTaxAnnual < 0)
    errors.push("Property tax cannot be negative.");
  if (input.pmiRateAnnual < 0)
    errors.push("PMI rate cannot be negative.");
  if (input.homeInsuranceAnnual < 0)
    errors.push("Home insurance cannot be negative.");
  if (input.hoaMonthly < 0)
    errors.push("HOA cannot be negative.");
  return errors;
}

/**
 * Sync down payment fields when the percent field changes.
 * @param {number} homeValue
 * @param {number} downPaymentPercent
 * @returns {{ downPaymentAmount: number, downPaymentPercent: number }}
 */
function normalizeDownPaymentFromPercent(homeValue, downPaymentPercent) {
  const amount = homeValue * (downPaymentPercent / 100);
  return { downPaymentAmount: amount, downPaymentPercent };
}

/**
 * Sync down payment fields when the dollar amount field changes.
 * @param {number} homeValue
 * @param {number} downPaymentAmount
 * @returns {{ downPaymentAmount: number, downPaymentPercent: number }}
 */
function normalizeDownPaymentFromAmount(homeValue, downPaymentAmount) {
  const percent = homeValue > 0 ? (downPaymentAmount / homeValue) * 100 : 0;
  return { downPaymentAmount, downPaymentPercent: percent };
}

/**
 * loanAmount = homeValue - downPaymentAmount
 * @param {number} homeValue
 * @param {number} downPaymentAmount
 * @returns {number}
 */
function calculateLoanAmount(homeValue, downPaymentAmount) {
  return Math.max(0, homeValue - downPaymentAmount);
}

/**
 * Standard fixed-rate PMT formula for monthly principal + interest.
 * @param {number} loanAmount
 * @param {number} interestRate  Annual rate as a percentage (e.g. 6 for 6%)
 * @param {number} loanTermYears
 * @returns {number}
 */
function calculateMonthlyPI(loanAmount, interestRate, loanTermYears) {
  const monthlyRate = interestRate / 100 / 12;
  const n = loanTermYears * 12;
  if (monthlyRate === 0) {
    return loanAmount / n;
  }
  return (
    loanAmount *
    (monthlyRate * Math.pow(1 + monthlyRate, n)) /
    (Math.pow(1 + monthlyRate, n) - 1)
  );
}

/**
 * Calculate all monthly cost components.
 * @param {Object} params
 * @param {number} params.propertyTaxAnnual
 * @param {number} params.homeInsuranceAnnual
 * @param {number} params.hoaMonthly
 * @param {number} params.loanAmount
 * @param {number} params.homeValue
 * @param {number} params.pmiRateAnnual  Annual PMI rate as a percentage
 * @returns {{ monthlyTax: number, monthlyInsurance: number, monthlyPMI: number, hoaMonthly: number }}
 */
function calculateMonthlyCosts({
  propertyTaxAnnual,
  homeInsuranceAnnual,
  hoaMonthly,
  loanAmount,
  homeValue,
  pmiRateAnnual,
}) {
  const monthlyTax = propertyTaxAnnual / 12;
  const monthlyInsurance = homeInsuranceAnnual / 12;
  const ltv = homeValue > 0 ? loanAmount / homeValue : 0;
  const monthlyPMI =
    ltv > 0.8 ? (loanAmount * (pmiRateAnnual / 100)) / 12 : 0;
  return { monthlyTax, monthlyInsurance, monthlyPMI, hoaMonthly };
}

/**
 * Total monthly payment = PI + tax + insurance + PMI + HOA.
 * @param {number} monthlyPI
 * @param {Object} costs  Result of calculateMonthlyCosts
 * @returns {number}
 */
function calculateTotalMonthlyPayment(monthlyPI, costs) {
  return (
    monthlyPI +
    costs.monthlyTax +
    costs.monthlyInsurance +
    costs.monthlyPMI +
    costs.hoaMonthly
  );
}

// ─── CommonJS / browser dual export ────────────────────────────────────────
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    validateInput,
    normalizeDownPaymentFromPercent,
    normalizeDownPaymentFromAmount,
    calculateLoanAmount,
    calculateMonthlyPI,
    calculateMonthlyCosts,
    calculateTotalMonthlyPayment,
  };
}
