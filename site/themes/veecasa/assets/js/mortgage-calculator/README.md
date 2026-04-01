# Mortgage Calculator — VeeCasa First-Party Implementation

Replaces the third-party `mortgagecalculator.org` iframe embed at `https://veecasa.com/calculator/` with a fully owned, privacy-preserving calculator.

---

## File Structure

```
site/themes/veecasa/assets/
│
├── js/mortgage-calculator/
│   ├── mortgageMath.js            Pure formula engine (PMT, PMI, costs)
│   ├── amortization.js            Monthly & yearly schedule generators
│   ├── biweekly.js                Bi-weekly payment schedule & savings
│   ├── formatters.js              Currency, percent, and date formatters
│   ├── mortgageCalculator.js      Orchestration — single entry point
│   ├── mortgageCalculatorUI.js    DOM/browser binding layer
│   └── mortgageCalculator.test.js Unit tests (run with Node.js, no deps)
│
├── css/
│   └── mortgage-calculator.css    All styles, scoped to .vc-calc
│
└── mortgage-calculator.html       Standalone page template
```

The React chat-widget integration lives separately:

```
integrations/aws-rasa-voice/frontend/src/
├── services/mortgageCalculator.ts          TypeScript calculation service
└── components/chat/MortgageCalculatorCard.tsx   Full React component
```

---

## Formula Sources

| Feature | Formula / Rule |
|---------|----------------|
| Monthly P&I | Standard PMT: `M = P × [r(1+r)^n] / [(1+r)^n − 1]` where r = monthly rate, n = total payments |
| PMI trigger | Active when `loanAmount / homeValue > 0.80` (LTV > 80%) |
| PMI removal | Disabled when `endingBalance / homeValue ≤ 0.80` |
| Bi-weekly payment | `monthlyPI / 2`, paid 26 times/year |
| Bi-weekly rate | `annualRate / 100 / 26` |
| Property tax | `propertyTaxAnnual / 12` |
| Home insurance | `homeInsuranceAnnual / 12` |
| PMI cost | `(loanAmount × pmiRateAnnual / 100) / 12` |

### Test Fixture (from spec)

```
homeValue:            200000
downPaymentAmount:     10000   (5%)
interestRate:              6   (6% annual)
loanTermYears:            30
propertyTaxAnnual:     12000
pmiRateAnnual:             4   (4% annual)
homeInsuranceAnnual:    1500
hoaMonthly:                0
startMonth:                3   (March)
startYear:              2026
```

Expected outputs: loanAmount=$190,000 · monthly P&I≈$1,139.15 · totalMonthly≈$2,897 · PMI ends when balance ≤ $160,000 · bi-weekly pays off ~5 years early.

---

## Running Unit Tests

```powershell
cd C:\Users\Owner\Documents\mortgage-rasa-chatbot\site\themes\veecasa\assets\js\mortgage-calculator
node mortgageCalculator.test.js
```

No npm install required — the test file uses Node's built-in `assert` equivalent and only `require()`s the sibling JS modules.

---

## WordPress Integration

### 1. Enqueue the scripts (add to `functions.php`)

```php
function veecasa_mortgage_calc_assets() {
    // Only load on the calculator page
    if ( ! is_page( 'calculator' ) ) return;

    $base = get_template_directory_uri() . '/assets/js/mortgage-calculator/';
    $v    = '1.0.0';

    wp_enqueue_script( 'vc-mortgage-math',    $base . 'mortgageMath.js',       [],          $v, true );
    wp_enqueue_script( 'vc-amortization',     $base . 'amortization.js',       ['vc-mortgage-math'], $v, true );
    wp_enqueue_script( 'vc-biweekly',         $base . 'biweekly.js',           ['vc-mortgage-math'], $v, true );
    wp_enqueue_script( 'vc-formatters',       $base . 'formatters.js',         [],          $v, true );
    wp_enqueue_script( 'vc-mortgage-calc',    $base . 'mortgageCalculator.js', ['vc-amortization','vc-biweekly','vc-formatters'], $v, true );
    wp_enqueue_script( 'vc-mortgage-calc-ui', $base . 'mortgageCalculatorUI.js',['vc-mortgage-calc'], $v, true );

    wp_enqueue_style( 'vc-mortgage-calc-css',
        get_template_directory_uri() . '/assets/css/mortgage-calculator.css',
        [], $v );
}
add_action( 'wp_enqueue_scripts', 'veecasa_mortgage_calc_assets' );
```

> **Load order matters**: math → amortization + biweekly → formatters → mortgageCalculator → mortgageCalculatorUI. UI must be last.

### 2. Create the page template

Copy `mortgage-calculator.html` to `site/themes/veecasa/page-calculator.php` and:

1. Add the WordPress PHP header:
   ```php
   <?php /* Template Name: Mortgage Calculator */ get_header(); ?>
   ```
2. Replace every `assets/` path with:
   ```php
   <?php echo get_template_directory_uri(); ?>/assets/
   ```
3. Remove the `<link>` and `<script>` tags — WordPress enqueues those via `functions.php`.
4. Add `<?php get_footer(); ?>` at the end.

### 3. Assign the template to the Calculator page

In WordPress admin: **Pages → Calculator → Page Attributes → Template → Mortgage Calculator**.

---

## React Chat-Widget Integration

The React component (`MortgageCalculatorCard.tsx`) renders inside the VeeCasa chat panel sidebar. It uses the TypeScript service (`mortgageCalculator.ts`) directly — no browser globals needed.

To display the calculator in the chat widget, emit a Rasa intent that triggers the `SHOW_MORTGAGE_CALCULATOR` action from the socket layer. The `ChatWidget.tsx` conditionally renders `<MortgageCalculatorCard />` when that flag is set.

---

## CSS Namespace

All styles are scoped to `.vc-calc` to prevent conflicts with the WordPress theme. Do **not** remove this class from the root `<div>` in the HTML template.

---

## Key Input Fields

| Field | ID (HTML) | Notes |
|-------|-----------|-------|
| Home value | `vc-home-value` | Dollar input |
| Down payment $ | `vc-down-amount` | Syncs with % and slider |
| Down payment % | `vc-down-percent` | Syncs with $ and slider |
| Down payment slider | `vc-down-slider` | 0–100% range |
| Loan amount | `vc-loan-amount` | Read-only, auto-calculated |
| Interest rate | `vc-interest-rate` | % input |
| Interest rate slider | `vc-rate-slider` | 0–15% range |
| Loan term | `vc-loan-term` | `<select>` 10/15/20/25/30 yr |
| Start month | `vc-start-month` | `<select>` 1–12 |
| Start year | `vc-start-year` | `<select>` current to +5 |
| Property tax | `vc-property-tax` | Annual $ |
| PMI rate | `vc-pmi-rate` | Annual % |
| PMI slider | `vc-pmi-slider` | 0–5% range |
| Home insurance | `vc-home-insurance` | Annual $ |
| HOA fees | `vc-hoa` | Monthly $ |
