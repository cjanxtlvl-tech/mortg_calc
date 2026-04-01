const assert = require("assert");
const { calculateMortgage } = require("./mortgageCalculator");

const result = calculateMortgage({
  homeValue: 400000,
  downPayment: 80000,
  interestRate: 6.8,
  loanTermYears: 30,
  propertyTaxYear: 2700,
  insuranceYear: 1500,
  pmiMonth: 0,
  hoaMonth: 0
});

assert.strictEqual(result.loanAmount, 320000);
assert.ok(result.principalInterest > 2000 && result.principalInterest < 2100);
assert.strictEqual(result.taxMonthly, 225);
assert.strictEqual(result.insuranceMonthly, 125);
assert.ok(result.totalMonthly > 2400 && result.totalMonthly < 2500);

const zeroRate = calculateMortgage({
  homeValue: 100000,
  downPayment: 0,
  interestRate: 0,
  loanTermYears: 10,
  propertyTaxYear: 0,
  insuranceYear: 0,
  pmiMonth: 0,
  hoaMonth: 0
});

assert.strictEqual(zeroRate.principalInterest, 833.33);

console.log("mortgageCalculator tests passed");
