function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

function calculateMortgage(inputs) {
  const loanAmount = Math.max(inputs.homeValue - inputs.downPayment, 0);
  const months = Math.max(inputs.loanTermYears * 12, 1);
  const monthlyRate = (inputs.interestRate / 100) / 12;

  let principalInterest = 0;
  if (monthlyRate === 0) {
    principalInterest = loanAmount / months;
  } else {
    const factor = Math.pow(1 + monthlyRate, months);
    principalInterest = (loanAmount * monthlyRate * factor) / (factor - 1);
  }

  const taxMonthly = inputs.propertyTaxYear / 12;
  const insuranceMonthly = inputs.insuranceYear / 12;
  const pmiMonthly = inputs.pmiMonth;
  const hoaMonthly = inputs.hoaMonth;

  const totalMonthly = principalInterest + taxMonthly + insuranceMonthly + pmiMonthly + hoaMonthly;
  const totalInterest = (principalInterest * months) - loanAmount;
  const payoffYear = new Date().getFullYear() + inputs.loanTermYears;

  return {
    loanAmount: roundCurrency(loanAmount),
    principalInterest: roundCurrency(principalInterest),
    taxMonthly: roundCurrency(taxMonthly),
    insuranceMonthly: roundCurrency(insuranceMonthly),
    pmiMonthly: roundCurrency(pmiMonthly),
    hoaMonthly: roundCurrency(hoaMonthly),
    totalMonthly: roundCurrency(totalMonthly),
    totalInterest: roundCurrency(totalInterest),
    payoffYear
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    calculateMortgage
  };
}

if (typeof window !== "undefined") {
  window.calculateMortgage = calculateMortgage;
}
