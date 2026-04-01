/**
 * mortgageCalculatorUI.js
 * Browser-only UI binding layer.
 * Reads DOM inputs → calls calculateMortgageSummary() → writes results back.
 *
 * Loaded AFTER mortgageMath.js, amortization.js, biweekly.js, formatters.js,
 * and mortgageCalculator.js in the page template.
 */

"use strict";

/* global calculateMortgageSummary, normalizeDownPaymentFromPercent,
          normalizeDownPaymentFromAmount, calculateLoanAmount,
          formatCurrency, formatCurrencyShort, formatPercentRaw,
          formatMonthYear, formatNumber, MONTH_NAMES_FULL */

// ─── Debounce ───────────────────────────────────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ─── Read all inputs from the form ──────────────────────────────────────────
function readInput() {
  const v = (id) => parseFloat(document.getElementById(id)?.value) || 0;
  const s = (id) => document.getElementById(id)?.value || "";

  const startMonthEl = document.getElementById("vc-start-month");
  const startMonthVal = startMonthEl
    ? parseInt(startMonthEl.value, 10)
    : new Date().getMonth() + 1;

  return {
    homeValue: v("vc-home-value"),
    downPaymentAmount: v("vc-down-payment-amount"),
    downPaymentPercent: v("vc-down-payment-percent"),
    interestRate: v("vc-interest-rate"),
    loanTermYears: v("vc-loan-term"),
    propertyTaxAnnual: v("vc-property-tax"),
    pmiRateAnnual: v("vc-pmi"),
    homeInsuranceAnnual: v("vc-home-insurance"),
    hoaMonthly: v("vc-hoa"),
    startMonth: startMonthVal,
    startYear: parseInt(s("vc-start-year"), 10) || new Date().getFullYear(),
  };
}

// ─── Sync down payment fields ────────────────────────────────────────────────
function bindDownPaymentSync() {
  const amtEl = document.getElementById("vc-down-payment-amount");
  const pctEl = document.getElementById("vc-down-payment-percent");
  const sliderEl = document.getElementById("vc-down-payment-slider");
  const homeEl = document.getElementById("vc-home-value");

  function syncFromAmount() {
    const homeValue = parseFloat(homeEl.value) || 0;
    const amount = parseFloat(amtEl.value) || 0;
    const { downPaymentPercent } = normalizeDownPaymentFromAmount(homeValue, amount);
    pctEl.value = downPaymentPercent.toFixed(2);
    if (sliderEl) {
      sliderEl.value = downPaymentPercent.toFixed(2);
      updateSliderFill(sliderEl);
    }
    updateLoanAmountDisplay(homeValue, amount);
    recalculate();
  }

  function syncFromPercent() {
    const homeValue = parseFloat(homeEl.value) || 0;
    const pct = parseFloat(pctEl.value) || 0;
    const { downPaymentAmount } = normalizeDownPaymentFromPercent(homeValue, pct);
    amtEl.value = downPaymentAmount.toFixed(2);
    if (sliderEl) {
      sliderEl.value = pct.toFixed(2);
      updateSliderFill(sliderEl);
    }
    updateLoanAmountDisplay(homeValue, downPaymentAmount);
    recalculate();
  }

  function syncFromSlider() {
    const homeValue = parseFloat(homeEl.value) || 0;
    const pct = parseFloat(sliderEl.value) || 0;
    const { downPaymentAmount } = normalizeDownPaymentFromPercent(homeValue, pct);
    pctEl.value = pct.toFixed(2);
    amtEl.value = downPaymentAmount.toFixed(2);
    updateSliderFill(sliderEl);
    updateLoanAmountDisplay(homeValue, downPaymentAmount);
    recalculate();
  }

  if (amtEl) amtEl.addEventListener("input", debounce(syncFromAmount, 300));
  if (pctEl) pctEl.addEventListener("input", debounce(syncFromPercent, 300));
  if (sliderEl) sliderEl.addEventListener("input", syncFromSlider);
  if (homeEl) homeEl.addEventListener("input", debounce(syncFromAmount, 300));
}

function updateLoanAmountDisplay(homeValue, downPaymentAmount) {
  const el = document.getElementById("vc-loan-amount");
  if (el) el.value = Math.max(0, homeValue - downPaymentAmount).toFixed(0);
}

// ─── Slider fill gradient ────────────────────────────────────────────────────
function updateSliderFill(slider) {
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 100;
  const val = parseFloat(slider.value) || 0;
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, #0e90d2 ${pct}%, #dde3eb ${pct}%)`;
}

function initSliders() {
  document.querySelectorAll(".vc-range-slider").forEach((slider) => {
    updateSliderFill(slider);
    slider.addEventListener("input", () => updateSliderFill(slider));
  });
}

// ─── Interest rate slider ────────────────────────────────────────────────────
function bindRateSlider() {
  const rateInput = document.getElementById("vc-interest-rate");
  const rateSlider = document.getElementById("vc-interest-rate-slider");
  if (!rateInput || !rateSlider) return;

  rateSlider.addEventListener("input", () => {
    rateInput.value = rateSlider.value;
    updateSliderFill(rateSlider);
    recalculate();
  });

  rateInput.addEventListener("input", debounce(() => {
    rateSlider.value = rateInput.value;
    updateSliderFill(rateSlider);
    recalculate();
  }, 300));
}

// ─── PMI slider ──────────────────────────────────────────────────────────────
function bindPMISlider() {
  const pmiInput = document.getElementById("vc-pmi");
  const pmiSlider = document.getElementById("vc-pmi-slider");
  if (!pmiInput || !pmiSlider) return;

  pmiSlider.addEventListener("input", () => {
    pmiInput.value = pmiSlider.value;
    updateSliderFill(pmiSlider);
    recalculate();
  });

  pmiInput.addEventListener("input", debounce(() => {
    pmiSlider.value = pmiInput.value;
    updateSliderFill(pmiSlider);
    recalculate();
  }, 300));
}

// ─── Render results ──────────────────────────────────────────────────────────
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderResults(result) {
  if (result.errors && result.errors.length) {
    setText("vc-error-msg", result.errors.join(" "));
    document.getElementById("vc-error-msg")?.classList.remove("vc-hidden");
    return;
  }
  document.getElementById("vc-error-msg")?.classList.add("vc-hidden");

  const { biweekly, chartData } = result;

  // Summary panel
  setText("vc-result-monthly-payment", formatCurrency(result.monthlyPayment));
  setText("vc-result-pmi", formatCurrency(result.costs.monthlyPMI));
  setText("vc-result-monthly-tax", formatCurrency(result.costs.monthlyTax));
  setText("vc-result-monthly-insurance", formatCurrency(result.costs.monthlyInsurance));
  setText("vc-result-pmi-end-date", formatMonthYear(result.pmiEndDate));
  setText("vc-result-pmi-payments", result.totalPMIPayments || "N/A");
  setText("vc-result-payment-after-pmi",
    result.monthlyPaymentAfterPMI
      ? formatCurrency(result.monthlyPaymentAfterPMI)
      : formatCurrency(result.monthlyPI + result.costs.monthlyTax + result.costs.monthlyInsurance + result.costs.hoaMonthly)
  );

  // Mortgage details card
  setText("vc-detail-loan-amount", formatCurrency(result.loanAmount));
  setText("vc-detail-down-payment",
    `${formatCurrency(result.downPaymentAmount)} (${result.downPaymentPercent.toFixed(2)}%)`
  );
  setText("vc-detail-total-interest", formatCurrency(result.totalInterestPaid));
  setText("vc-detail-total-pmi",
    result.totalPMIPaid > 0
      ? `$0.00 to ${formatMonthYear(result.pmiEndDate)}`
      : "$0.00"
  );
  setText("vc-detail-total-tax", formatCurrency(result.totalTaxPaid));
  setText("vc-detail-total-insurance", formatCurrency(result.totalHomeInsurancePaid));
  setText("vc-detail-total-payments",
    `$${formatNumber(result.totalOfAllPayments)} (${result.monthlyAmortization.length} payments)`
  );
  setText("vc-detail-payoff", formatMonthYear(result.payoffDate));

  // Bar widths for mortgage detail percentages
  const total = result.totalOfAllPayments || 1;
  setBarWidth("vc-bar-loan",      result.loanAmount / total);
  setBarWidth("vc-bar-interest",  result.totalInterestPaid / total);
  setBarWidth("vc-bar-pmi",       result.totalPMIPaid / total);
  setBarWidth("vc-bar-tax",       result.totalTaxPaid / total);
  setBarWidth("vc-bar-insurance", result.totalHomeInsurancePaid / total);

  // Bi-weekly card
  setText("vc-biweekly-monthly-payment",   formatCurrency(result.monthlyPayment));
  setText("vc-biweekly-payment",           formatCurrency(biweekly.biweeklyPayment));
  setText("vc-biweekly-monthly-payoff",    formatMonthYear(result.payoffDate));
  setText("vc-biweekly-payoff",            formatMonthYear(biweekly.biweeklyPayoffDate));
  setText("vc-biweekly-monthly-interest",  formatCurrency(result.totalInterestPaid));
  setText("vc-biweekly-total-interest",    formatCurrency(biweekly.biweeklyTotalInterest));
  setText("vc-biweekly-savings",           formatCurrency(biweekly.totalInterestSavings));

  // Donut chart
  renderDonutChart(chartData);

  // Amortization tables
  renderYearlyTable(result.yearlyAmortization);
}

function setBarWidth(id, ratio) {
  const el = document.getElementById(id);
  if (el) {
    const pct = Math.min(100, Math.max(0, ratio * 100));
    el.style.width = pct.toFixed(2) + "%";
    const label = el.nextElementSibling;
    if (label) label.textContent = pct.toFixed(2) + "%";
  }
}

// ─── Donut chart (vanilla Canvas) ───────────────────────────────────────────
function renderDonutChart(chartData) {
  const canvas = document.getElementById("vc-donut-chart");
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(cx, cy) - 10;
  const innerRadius = radius * 0.55;

  const segments = [
    { label: "Principal", value: chartData.principal, color: "#1565c0" },
    { label: "Interest",  value: chartData.interest,  color: "#0e90d2" },
    { label: "Tax",       value: chartData.tax,        color: "#4caf50" },
    { label: "HOA & Ins", value: chartData.insurance + chartData.hoa, color: "#ff9800" },
    { label: "Downpayt.", value: chartData.downPayment, color: "#9c27b0" },
  ].filter((s) => s.value > 0);

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let startAngle = -Math.PI / 2;
  for (const seg of segments) {
    const slice = (seg.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    startAngle += slice;
  }

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

// ─── Yearly amortization table ───────────────────────────────────────────────
function renderYearlyTable(yearlyRows) {
  const tbody = document.getElementById("vc-yearly-amort-body");
  if (!tbody) return;

  tbody.innerHTML = "";
  for (const row of yearlyRows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.year}</td>
      <td>${formatNumber(row.totalInterest)}</td>
      <td class="vc-principal">${formatNumber(row.totalPrincipal)}</td>
      <td>${formatNumber(row.endingBalance)}</td>
    `;
    tbody.appendChild(tr);
  }
}

// ─── Monthly amortization table (toggled by button) ──────────────────────────
let _cachedMonthlyRows = [];

function renderMonthlyTable(rows) {
  const tbody = document.getElementById("vc-monthly-amort-body");
  if (!tbody) return;

  tbody.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.paymentNumber}</td>
      <td>${formatMonthYear(row.paymentDate)}</td>
      <td>${formatCurrency(row.beginningBalance)}</td>
      <td>${formatCurrency(row.principalAndInterestPayment)}</td>
      <td>${formatCurrency(row.interestPaid)}</td>
      <td>${formatCurrency(row.principalPaid)}</td>
      <td>${row.pmiActive ? formatCurrency(row.pmiPaid) : "$0.00"}</td>
      <td>${formatCurrency(row.totalPayment)}</td>
      <td>${formatCurrency(row.endingBalance)}</td>
    `;
    fragment.appendChild(tr);
  }
  tbody.appendChild(fragment);
}

// ─── Toggle amortization panel ───────────────────────────────────────────────
function bindAmortizationToggle() {
  const btn = document.getElementById("vc-show-amort-btn");
  const panel = document.getElementById("vc-amort-panel");
  if (!btn || !panel) return;

  btn.addEventListener("click", () => {
    const isHidden = panel.classList.contains("vc-hidden");
    if (isHidden) {
      renderMonthlyTable(_cachedMonthlyRows);
      panel.classList.remove("vc-hidden");
      btn.textContent = "Hide Amortization Table";
    } else {
      panel.classList.add("vc-hidden");
      btn.textContent = "Show Amortization Table";
    }
  });
}

// ─── Core recalculate ────────────────────────────────────────────────────────
function recalculate() {
  const input = readInput();
  const result = calculateMortgageSummary(input);
  if (result && !result.errors?.length) {
    _cachedMonthlyRows = result.monthlyAmortization;
  }
  renderResults(result);
}

// ─── Bind remaining inputs that just trigger recalculate ────────────────────
function bindOtherInputs() {
  const ids = [
    "vc-interest-rate",
    "vc-loan-term",
    "vc-start-month",
    "vc-start-year",
    "vc-property-tax",
    "vc-home-insurance",
    "vc-hoa",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", debounce(recalculate, 300));
  });
}

// ─── Populate the start year dropdown ────────────────────────────────────────
function populateStartYear() {
  const el = document.getElementById("vc-start-year");
  if (!el) return;
  el.innerHTML = "";
  const current = new Date().getFullYear();
  for (let y = current; y <= current + 5; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === current) opt.selected = true;
    el.appendChild(opt);
  }
}

// ─── Populate start month dropdown ──────────────────────────────────────────
function populateStartMonth() {
  const el = document.getElementById("vc-start-month");
  if (!el) return;
  el.innerHTML = "";
  MONTH_NAMES_FULL.forEach((name, i) => {
    const opt = document.createElement("option");
    opt.value = i + 1;
    opt.textContent = name;
    if (i + 1 === new Date().getMonth() + 1) opt.selected = true;
    el.appendChild(opt);
  });
}

// ─── Yearly amortization collapsible toggle ─────────────────────────────────
function bindYearlyAmortToggle() {
  var btn = document.getElementById("vc-yearly-amort-toggle");
  var wrap = document.getElementById("vc-yearly-amort-body-wrap");
  if (!btn || !wrap) return;

  btn.addEventListener("click", function () {
    var expanded = btn.getAttribute("aria-expanded") === "true";
    if (expanded) {
      wrap.classList.add("vc-hidden");
      btn.setAttribute("aria-expanded", "false");
    } else {
      wrap.classList.remove("vc-hidden");
      btn.setAttribute("aria-expanded", "true");
    }
  });
}

// ─── Init ────────────────────────────────────────────────────────────────────
function initMortgageCalculator() {
  populateStartMonth();
  populateStartYear();
  initSliders();
  bindDownPaymentSync();
  bindRateSlider();
  bindPMISlider();
  bindOtherInputs();
  bindAmortizationToggle();
  bindYearlyAmortToggle();
  recalculate(); // initial render with defaults
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMortgageCalculator);
} else {
  initMortgageCalculator();
}
