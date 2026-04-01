/**
 * mortgageCalculator.test.js
 * Unit tests for the VeeCasa mortgage calculator formula engine.
 *
 * Run with: node mortgageCalculator.test.js
 * (No test framework required — uses a tiny assert wrapper.)
 *
 * Fixture from spec:
 *   homeValue:            200000
 *   downPaymentAmount:     10000
 *   interestRate:              6   (6%)
 *   loanTermYears:            30
 *   propertyTaxAnnual:     12000
 *   pmiRateAnnual:             4   (4%)
 *   homeInsuranceAnnual:    1500
 *   hoaMonthly:                0
 *   startMonth:                3   (March)
 *   startYear:              2026
 */

"use strict";

const {
  validateInput,
  normalizeDownPaymentFromAmount,
  normalizeDownPaymentFromPercent,
  calculateLoanAmount,
  calculateMonthlyPI,
  calculateMonthlyCosts,
  calculateTotalMonthlyPayment,
} = require("./mortgageMath");

const {
  generateMonthlyAmortization,
  generateYearlyAmortization,
  calculatePmiEnd,
} = require("./amortization");

const { generateBiweeklySchedule } = require("./biweekly");
const { calculateMortgageSummary }  = require("./mortgageCalculator");
const { formatCurrency, formatMonthYear } = require("./formatters");

// ─── Tiny test runner ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function assertClose(actual, expected, tolerance, message) {
  const ok = Math.abs(actual - expected) <= tolerance;
  assert(ok, `${message}  (expected ≈${expected}, got ${actual.toFixed(4)})`);
}

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

// ─── Spec fixture ────────────────────────────────────────────────────────────

const FIXTURE = {
  homeValue:            200000,
  downPaymentAmount:     10000,
  downPaymentPercent:        5,
  interestRate:              6,
  loanTermYears:            30,
  propertyTaxAnnual:     12000,
  pmiRateAnnual:             4,
  homeInsuranceAnnual:    1500,
  hoaMonthly:                0,
  startMonth:                3,
  startYear:              2026,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("validateInput()", () => {
  assert(validateInput(FIXTURE).length === 0, "Valid fixture passes validation");

  const badHome = { ...FIXTURE, homeValue: 0 };
  assert(validateInput(badHome).length > 0, "homeValue=0 fails validation");

  const bigDown = { ...FIXTURE, downPaymentAmount: 300000 };
  assert(validateInput(bigDown).length > 0, "downPayment > homeValue fails");

  const negRate = { ...FIXTURE, interestRate: -1 };
  assert(validateInput(negRate).length > 0, "Negative interest rate fails");
});

describe("normalizeDownPayment*()", () => {
  const fromPct = normalizeDownPaymentFromPercent(200000, 5);
  assertClose(fromPct.downPaymentAmount, 10000, 0.01,
    "5% of $200k = $10,000");

  const fromAmt = normalizeDownPaymentFromAmount(200000, 10000);
  assertClose(fromAmt.downPaymentPercent, 5, 0.001,
    "$10k / $200k = 5%");
});

describe("calculateLoanAmount()", () => {
  assert(calculateLoanAmount(200000, 10000) === 190000,
    "loanAmount = homeValue - downPayment = $190,000");
});

describe("calculateMonthlyPI()", () => {
  const mPI = calculateMonthlyPI(190000, 6, 30);
  // Standard PMT: ≈ $1,139.15 (from spec fixture)
  assertClose(mPI, 1139.15, 0.10,
    "Monthly P&I ≈ $1,139.15 for $190k @ 6% / 30yr");

  // Edge: 0% interest
  const zeroRate = calculateMonthlyPI(120000, 0, 10);
  assertClose(zeroRate, 1000, 0.01,
    "0% interest: payment = loanAmount / (term * 12)");
});

describe("calculateMonthlyCosts()", () => {
  const costs = calculateMonthlyCosts({
    propertyTaxAnnual:   12000,
    homeInsuranceAnnual:  1500,
    hoaMonthly:              0,
    loanAmount:         190000,
    homeValue:          200000,
    pmiRateAnnual:           4,
  });
  assertClose(costs.monthlyTax,       1000, 0.01, "monthlyTax = $12,000/12 = $1,000");
  assertClose(costs.monthlyInsurance,  125, 0.01, "monthlyInsurance = $1,500/12 = $125");
  assertClose(costs.monthlyPMI,    633.33, 0.50,  "monthlyPMI = (190000 * 4%) / 12 ≈ $633");
  assert(costs.hoaMonthly === 0,                  "hoaMonthly = $0 when HOA=0");
});

describe("calculateTotalMonthlyPayment()", () => {
  const costs = calculateMonthlyCosts({
    propertyTaxAnnual: 12000, homeInsuranceAnnual: 1500, hoaMonthly: 0,
    loanAmount: 190000, homeValue: 200000, pmiRateAnnual: 4,
  });
  const mPI = calculateMonthlyPI(190000, 6, 30);
  const total = calculateTotalMonthlyPayment(mPI, costs);
  // ≈ 1139.15 + 1000 + 125 + 633.33 ≈ $2,897.48
  assertClose(total, 2897, 2, "Total monthly payment ≈ $2,897 (fixture)");
});

describe("generateMonthlyAmortization()", () => {
  const rows = generateMonthlyAmortization({ ...FIXTURE, loanAmount: 190000 });

  assert(rows.length > 0, "Schedule has rows");
  assert(rows.length <= 360, "30-yr loan has ≤ 360 payments");

  const last = rows[rows.length - 1];
  assertClose(last.endingBalance, 0, 0.01, "Final balance reaches $0");

  const first = rows[0];
  assert(first.pmiActive === true, "PMI active on first payment (LTV > 80%)");
  assert(first.paymentDate.month === 3 && first.paymentDate.year === 2026,
    "First payment date = March 2026");

  // Verify PMI eventually stops
  const pmiStop = rows.findIndex((r) => !r.pmiActive);
  assert(pmiStop > 0, "PMI stops at some point during the schedule");
});

describe("generateYearlyAmortization()", () => {
  const monthly = generateMonthlyAmortization({ ...FIXTURE, loanAmount: 190000 });
  const yearly  = generateYearlyAmortization(monthly);

  assert(yearly.length > 0, "Yearly summary has rows");
  assert(yearly[0].year === 2026, "First yearly row is 2026");

  const last = yearly[yearly.length - 1];
  assertClose(last.endingBalance, 0, 0.01, "Final yearly balance is $0");
});

describe("calculatePmiEnd()", () => {
  const monthly = generateMonthlyAmortization({ ...FIXTURE, loanAmount: 190000 });
  const { pmiEndDate, totalPMIPayments, monthlyPaymentAfterPMI } =
    calculatePmiEnd(monthly, FIXTURE.homeValue);

  assert(pmiEndDate !== null, "PMI end date is set");
  assert(totalPMIPayments > 0, "Total PMI payments > 0");
  assert(monthlyPaymentAfterPMI !== null, "Payment after PMI is set");
  assert(
    monthlyPaymentAfterPMI !== null && monthlyPaymentAfterPMI < 2897,
    "Payment after PMI < initial payment (no PMI component)"
  );
});

describe("generateBiweeklySchedule()", () => {
  const monthly = generateMonthlyAmortization({ ...FIXTURE, loanAmount: 190000 });
  const totalMonthlyInterest = monthly.reduce((s, r) => s + r.interestPaid, 0);

  const bw = generateBiweeklySchedule({
    loanAmount:           190000,
    interestRate:              6,
    loanTermYears:            30,
    monthlyTotalInterest: totalMonthlyInterest,
    startMonth:                3,
    startYear:              2026,
  });

  assert(bw.biweeklyPayment > 0, "Bi-weekly payment > 0");
  assert(bw.biweeklyTotalInterest < totalMonthlyInterest,
    "Bi-weekly total interest < monthly total interest (pays off faster)");
  assert(bw.totalInterestSavings > 0, "Interest savings > 0");

  // Payoff should be earlier than 2056
  assert(
    bw.biweeklyPayoffDate.year < 2056,
    `Bi-weekly payoff (${bw.biweeklyPayoffDate.year}) is before monthly payoff (2056)`
  );
});

describe("calculateMortgageSummary() — full orchestration", () => {
  const result = calculateMortgageSummary(FIXTURE);

  assert(result.errors.length === 0, "No validation errors on fixture");
  assert(result.loanAmount === 190000, "loanAmount = $190,000");
  assertClose(result.downPaymentPercent, 5, 0.001, "downPaymentPercent = 5%");
  assertClose(result.monthlyPayment, 2897, 2, "monthlyPayment ≈ $2,897");
  assert(result.pmiEndDate !== null, "PMI end date is populated");
  assert(result.payoffDate !== null, "Payoff date is populated");
  assert(result.monthlyAmortization.length > 0, "Monthly amortization populated");
  assert(result.yearlyAmortization.length > 0, "Yearly amortization populated");
  assert(result.biweekly.biweeklyPayment > 0, "Bi-weekly payment > 0");
  assert(result.biweekly.totalInterestSavings > 0, "Bi-weekly savings > 0");
  assert(result.chartData.principal === 190000, "chartData.principal = $190,000");
});

describe("formatCurrency()", () => {
  assert(formatCurrency(1234.5) === "$1,234.50", "formatCurrency($1234.50)");
  assert(formatCurrency(0) === "$0.00", "formatCurrency($0)");
});

describe("formatMonthYear()", () => {
  assert(formatMonthYear({ month: 3, year: 2026 }) === "Mar, 2026",
    "formatMonthYear({3, 2026}) = 'Mar, 2026'");
  assert(formatMonthYear(null) === "N/A", "formatMonthYear(null) = 'N/A'");
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
}
