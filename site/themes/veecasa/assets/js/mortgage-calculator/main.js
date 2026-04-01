(function () {
  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(value);
  }

  function toNumber(id) {
    const element = document.getElementById(id);
    return Number(element.value || 0);
  }

  function render(result) {
    document.getElementById("loanAmount").textContent = formatMoney(result.loanAmount);
    document.getElementById("principalInterest").textContent = formatMoney(result.principalInterest);
    document.getElementById("taxMonthly").textContent = formatMoney(result.taxMonthly);
    document.getElementById("insuranceMonthly").textContent = formatMoney(result.insuranceMonthly);
    document.getElementById("pmiMonthly").textContent = formatMoney(result.pmiMonthly);
    document.getElementById("hoaMonthly").textContent = formatMoney(result.hoaMonthly);
    document.getElementById("totalMonthly").textContent = formatMoney(result.totalMonthly);
    document.getElementById("totalInterest").textContent = formatMoney(result.totalInterest);
    document.getElementById("payoffYear").textContent = String(result.payoffYear);
  }

  function collectInputs() {
    return {
      homeValue: toNumber("homeValue"),
      downPayment: toNumber("downPayment"),
      interestRate: toNumber("interestRate"),
      loanTermYears: toNumber("loanTermYears"),
      propertyTaxYear: toNumber("propertyTaxYear"),
      insuranceYear: toNumber("insuranceYear"),
      pmiMonth: toNumber("pmiMonth"),
      hoaMonth: toNumber("hoaMonth")
    };
  }

  function handleSubmit(event) {
    event.preventDefault();
    const result = window.calculateMortgage(collectInputs());
    render(result);
  }

  const form = document.getElementById("mortgage-form");
  if (!form || !window.calculateMortgage) {
    return;
  }

  form.addEventListener("submit", handleSubmit);
  render(window.calculateMortgage(collectInputs()));
})();