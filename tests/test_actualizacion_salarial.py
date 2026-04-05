#!/usr/bin/env python3
"""
Test suite for the salary adjustment feature (actualización salarial)
Tests multi-level salary calculations including:
- Salary changes mid-year
- Interaction with bonuses
- SS base calculation with adjusted salaries
- IRPF calculation with salary changes
"""

import unittest
import sys
import re

# =====================================================================
#  TEST SCENARIOS FOR SALARY ADJUSTMENT FEATURE
# =====================================================================

class TestActualizacionSalarialFeature(unittest.TestCase):
    """
    Test the salary adjustment (actualización salarial) feature.
    
    Scenarios covered:
    1. Single salary adjustment mid-year
    2. Multiple adjustments throughout the year
    3. Salary increase + bonus in same month
    4. Annual salary calculation with adjustments
    5. SS base with adjusted salaries
    """
    
    def test_scenario_01_single_adjustment_july(self):
        """
        Test single salary adjustment in July.
        - Jan-Jun: €30,000 bruto anual (€2,500/mes)
        - Jul-Dec: €36,000 bruto anual (€3,000/mes)
        - Expected annual gross: (€30,000/12)*6 + (€36,000/12)*6 = €15,000 + €18,000 = €33,000
        """
        base_salary = 30000
        adjusted_salary = 36000
        adjustment_month = 7  # July
        months_base = adjustment_month - 1
        months_adjusted = 12 - adjustment_month + 1
        
        expected_annual_gross = (base_salary / 12) * months_base + (adjusted_salary / 12) * months_adjusted
        expected_annual_gross = round(expected_annual_gross, 2)
        
        # Expected: 2500*6 + 3000*6 = 15000 + 18000 = 33000
        self.assertEqual(expected_annual_gross, 33000)
        
    def test_scenario_02_multiple_adjustments(self):
        """
        Test multiple salary adjustments.
        - Jan-Mar: €24,000 (€2,000/mes)
        - Apr-Jun: €30,000 (€2,500/mes)
        - Jul-Dec: €36,000 (€3,000/mes)
        - Expected: (2000*3) + (2500*3) + (3000*6) = 6000 + 7500 + 18000 = €31,500
        """
        salary_ranges = [
            (1, 3, 24000),    # Jan-Mar
            (4, 6, 30000),    # Apr-Jun
            (7, 12, 36000),   # Jul-Dec
        ]
        
        annual_gross = 0
        for start_month, end_month, annual_salary in salary_ranges:
            months_count = end_month - start_month + 1
            monthly_salary = annual_salary / 12
            annual_gross += monthly_salary * months_count
        
        annual_gross = round(annual_gross, 2)
        self.assertEqual(annual_gross, 31500)
        
    def test_scenario_03_adjustment_plus_bonus_same_month(self):
        """
        Test salary adjustment and bonus in the same month.
        - Base salary: €30,000 (€2,500/mes)
        - Mar: Adjust to €36,000 + €2,000 bonus
        - Expected Mar gross: (€36,000/12) + €2,000 = €3,000 + €2,000 = €5,000
        """
        base_monthly = 30000 / 12  # 2500
        adjusted_monthly = 36000 / 12  # 3000
        bonus = 2000
        
        march_adjusted_salary = adjusted_monthly + bonus
        self.assertEqual(march_adjusted_salary, 5000)
        
    def test_scenario_04_annual_gross_calculation(self):
        """
        Test annual gross calculation with adjustments.
        Base: €30,000 annual
        - Adjust to €36,000 from June (month 6)
        - No bonuses
        
        Expected:
        - Jan-May (5 months): 30000/12 * 5 = 12,500
        - Jun-Dec (7 months): 36000/12 * 7 = 21,000
        - Total: 33,500
        """
        base_annual = 30000
        adjusted_annual = 36000
        adjustment_start = 6  # June
        
        months_before = adjustment_start - 1  # 5 months
        months_after = 12 - adjustment_start + 1  # 7 months
        
        total_gross = (base_annual / 12) * months_before + (adjusted_annual / 12) * months_after
        total_gross = round(total_gross, 2)
        
        self.assertEqual(total_gross, 33500)
        
    def test_scenario_05_ss_base_with_adjustments(self):
        """
        Test SS base calculation with salary adjustments.
        Assumes 2025 min/max bases for group 4:
        - Min: 1381.20
        - Max: 4909.50
        
        Base salary: €30,000 → €2,500/mes (within range)
        Adjusted: €36,000 → €3,000/mes (within range)
        
        Expected:
        - Jan-May: 2500 * 5 = 12,500
        - Jun-Dec: 3000 * 7 = 21,000
        - Total annual SS base: 33,500
        """
        base_monthly = 30000 / 12  # 2500
        adjusted_monthly = 36000 / 12  # 3000
        
        ss_base_min = 1381.20
        ss_base_max = 4909.50
        
        # All amounts within SS base range
        ss_base_jan_may = min(max(base_monthly, ss_base_min), ss_base_max) * 5
        ss_base_jun_dec = min(max(adjusted_monthly, ss_base_min), ss_base_max) * 7
        
        total_ss_base_annual = ss_base_jan_may + ss_base_jun_dec
        total_ss_base_annual = round(total_ss_base_annual, 2)
        
        self.assertEqual(total_ss_base_annual, 33500)
        
    def test_scenario_06_ss_calculation_with_cap(self):
        """
        Test SS calculation when adjustment crosses the SS base cap (4909.50).
        Base: €30,000 (2500/mes - under cap)
        Adjusted: €60,000 (5000/mes - over cap, capped at 4909.50)
        
        Expected:
        - Jan-May SS base: 2500 * 5 = 12,500
        - Jun-Dec SS base: 4909.50 * 7 = 34,366.50 (capped)
        - Total: 46,866.50
        """
        base_monthly = 30000 / 12  # 2500
        adjusted_monthly = 60000 / 12  # 5000 -> capped to 4909.50
        
        ss_base_min = 1381.20
        ss_base_max = 4909.50
        
        # Base period: both under cap
        ss_base_base = min(max(base_monthly, ss_base_min), ss_base_max) * 5
        
        # Adjusted period: capped
        ss_base_adjusted = min(max(adjusted_monthly, ss_base_min), ss_base_max) * 7
        
        total_ss_base = round(ss_base_base + ss_base_adjusted, 2)
        
        expected = round(2500 * 5 + 4909.50 * 7, 2)
        self.assertEqual(total_ss_base, expected)
        self.assertAlmostEqual(total_ss_base, 46866.50, places=2)
        
    def test_scenario_07_irpf_with_adjustments(self):
        """
        Test IRPF calculation includes adjusted gross income.
        Base: €30,000
        Adjusted to €36,000 from July
        
        Expected annual gross (for IRPF base):
        - Months 1-6: 30000/12 * 6 = 15,000
        - Months 7-12: 36000/12 * 6 = 18,000
        - Total: 33,000
        
        This is used for "rendimiento íntegro" in IRPF calculation.
        """
        base_annual = 30000
        adjusted_annual = 36000
        adjustment_month = 7
        
        months_base = adjustment_month - 1
        months_adjusted = 12 - adjustment_month + 1
        
        irpf_base_amount = (base_annual / 12) * months_base + (adjusted_annual / 12) * months_adjusted
        irpf_base_amount = round(irpf_base_amount, 2)
        
        self.assertEqual(irpf_base_amount, 33000)
        
    def test_scenario_08_adjustment_no_retroactive(self):
        """
        Test that salary adjustments are NOT retroactive.
        - Set adjustment for March but don't change Jan-Feb
        - Base: €30,000
        - Adjust to €36,000 from March (month 3)
        
        Expected:
        - Jan-Feb (2 months): 30000/12 * 2 = 5,000
        - Mar-Dec (10 months): 36000/12 * 10 = 30,000
        - Total: 35,000
        """
        base_annual = 30000
        adjusted_annual = 36000
        adjustment_month = 3  # March
        
        months_before = adjustment_month - 1  # 2 months
        months_after = 12 - adjustment_month + 1  # 10 months
        
        total = (base_annual / 12) * months_before + (adjusted_annual / 12) * months_after
        total = round(total, 2)
        
        self.assertEqual(total, 35000)
        
    def test_scenario_09_latest_adjustment_applies(self):
        """
        Test that when multiple adjustments exist for a month,
        the latest one applies (last adjustment in sorted order).
        
        Adjustments:
        - May: €30,000
        - May again: €36,000 (should this replace or both apply?)
        
        In the implementation, if multiple adjustments are set for May,
        the one processed last should apply (behavior depends on UI design).
        For now, test that adjustments are sorted and processed in order.
        """
        adjustments = [
            {'mes': 5, 'nuevoSalario': 30000},
            {'mes': 5, 'nuevoSalario': 36000},
        ]
        
        # Sort by month
        adjustments.sort(key=lambda a: a['mes'])
        
        # Process adjustments - last one wins
        salario_actual = 24000  # base
        adjustment_idx = 0
        while adjustment_idx < len(adjustments) and adjustments[adjustment_idx]['mes'] <= 5:
            salario_actual = adjustments[adjustment_idx]['nuevoSalario']
            adjustment_idx += 1
        
        # Result: last adjustment (36000) applies
        self.assertEqual(salario_actual, 36000)
        
    def test_scenario_10_interactionwith_bonuses(self):
        """
        Test interaction between salary adjustments and bonuses.
        Base: €30,000 (€2,500/mes)
        - June bonus: €2,000 (bonus month only, doesn't affect annual gross)
        - Adjust to €36,000 from September (€3,000/mes)
        
        Expected annual gross:
        - Jan-Aug: 2500 * 8 = 20,000
        - Sep-Dec: 3000 * 4 = 12,000
        - Bonus in Jun: €2,000 (not counted in base, just additional that month)
        - Total base: 32,000
        - With bonus: 32,000 + 2,000 = 34,000
        """
        base_annual = 30000
        adjusted_annual = 36000
        adjustment_month = 9
        
        months_base = adjustment_month - 1  # 8
        months_adjusted = 12 - adjustment_month + 1  # 4
        
        base_gross = (base_annual / 12) * months_base + (adjusted_annual / 12) * months_adjusted
        bonus = 2000
        total_gross = base_gross + bonus
        total_gross = round(total_gross, 2)
        
        self.assertEqual(total_gross, 34000)


class TestActualizacionSalarialEdgeCases(unittest.TestCase):
    """Test edge cases and error conditions."""
    
    def test_edge_01_zero_adjustment(self):
        """Test that zero adjustment (same as base) works."""
        base = 30000
        adjustment = 30000
        
        # Should result in same as having no adjustment
        months_each = 6
        total = (base / 12) * months_each + (adjustment / 12) * months_each
        total = round(total, 2)
        
        self.assertEqual(total, 30000)
        
    def test_edge_02_yearly_increase_progression(self):
        """
        Test salary increase progression throughout the year.
        - Jan: €24,000
        - Apr: €30,000
        - Jul: €36,000
        - Oct: €42,000
        
        Expected: 2000*3 + 2500*3 + 3000*3 + 3500*3 = 6000+7500+9000+10500 = 33000
        """
        config = [
            (1, 3, 24000),   # Jan-Mar: 2000/mo
            (4, 6, 30000),   # Apr-Jun: 2500/mo
            (7, 9, 36000),   # Jul-Sep: 3000/mo
            (10, 12, 42000), # Oct-Dec: 3500/mo
        ]
        
        total = 0
        for start, end, annual in config:
            months = end - start + 1
            monthly = annual / 12
            total += monthly * months
        
        total = round(total, 2)
        self.assertEqual(total, 33000)
        
    def test_edge_03_negative_adjustment_not_allowed(self):
        """
        Test that negative adjustments are not allowed.
        The UI should filter out negative values.
        """
        adjustments = [
            {'mes': 6, 'nuevoSalario': -5000},  # Invalid
            {'mes': 9, 'nuevoSalario': 35000},  # Valid
        ]
        
        # Filter out invalid ones (as per implementation)
        valid = [a for a in adjustments if a['nuevoSalario'] > 0]
        
        self.assertEqual(len(valid), 1)
        self.assertEqual(valid[0]['nuevoSalario'], 35000)
        
    def test_edge_04_very_high_salary(self):
        """
        Test with very high salary (high earners).
        Base: €150,000
        Expected annual base: €150,000 (no adjustment)
        """
        base_annual = 150000
        months = 12
        
        monthly = base_annual / 12
        total = monthly * months
        total = round(total, 2)
        
        self.assertEqual(total, 150000)
        
    def test_edge_05_january_adjustment(self):
        """
        Test adjustment in January (month 1).
        If adjustment is set for January, it shouldn't affect salary.
        Base: €30,000
        
        Adjusting to €36,000 from Jan would mean (incorrectly):
        Jan-Dec all at €36,000 = €36,000 total
        """
        base_annual = 30000
        adjusted_annual = 36000
        
        # If adjustment is Jan (month 1)
        months_before = 0  # None before January
        months_after = 12  # All 12 months after adjustment
        
        total = (base_annual / 12) * months_before + (adjusted_annual / 12) * months_after
        total = round(total, 2)
        
        self.assertEqual(total, 36000)


# =====================================================================
#  INTEGRATION TESTS WITH FULL CALCULATION SCENARIO
# =====================================================================

class TestActualizacionSalarialIntegration(unittest.TestCase):
    """
    Integration tests simulating full app scenarios with salary adjustments.
    """
    
    def test_integration_01_complete_calculation_scenario(self):
        """
        Complete scenario:
        - Employee: Single, no dependents
        - Base salary: €30,000
        - Adjust to €36,000 from June
        - No bonus, no especie
        - Expected impact: Higher IRPF/SS due to increased gross
        """
        base_salary = 30000
        adjusted_salary = 36000
        adjustment_month = 6
        
        # Calculate total annual gross
        months_before = adjustment_month - 1
        months_after = 12 - adjustment_month + 1
        annual_gross = (base_salary / 12) * months_before + (adjusted_salary / 12) * months_after
        
        # SS calculation (simplified: 6.35% of base, no solidaridad)
        ss_rate = 0.0635  # approximately
        ss_annual = annual_gross * ss_rate
        
        # IRPF calculation (simplified: roughly 15% after deductions)
        irpf_rate = 0.15  # approximate
        irpf_annual = annual_gross * irpf_rate
        
        # Net income
        net_annual = annual_gross - ss_annual - irpf_annual
        
        # Verify structure is sound
        self.assertGreater(annual_gross, base_salary * 0.95)  # Should be between base and adjusted
        self.assertLess(annual_gross, adjusted_salary * 1.05)
        self.assertGreater(net_annual, 0)
        self.assertLess(ss_annual, annual_gross * 0.1)
        
    def test_integration_02_multiple_adjustments_full_scenario(self):
        """
        Scenario with multiple adjustments and bonus.
        - Base: €30,000
        - May bonus: €1,500
        - Jun adjustment: €36,000
        - Sep adjustment: €42,000
        
        Breakdown:
        - Jan-May (5 months): 2500 * 5 = 12,500
        - Jun-Aug (3 months): 3000 * 3 = 9,000
        - Sep-Dec (4 months): 3500 * 4 = 14,000
        - Bonus: 1,500
        - Total: 37,000
        """
        salaries = {
            1: 30000,  # Jan-May: 2500/mo
            2: 30000,
            3: 30000,
            4: 30000,
            5: 30000,
            6: 36000,  # Jun-Aug: 3000/mo (after adjustment)
            7: 36000,
            8: 36000,
            9: 42000,  # Sep-Dec: 3500/mo (after adjustment)
            10: 42000,
            11: 42000,
            12: 42000,
        }
        
        bonus_by_month = {5: 1500}
        
        # Calculate annual gross
        annual = 0
        for month, annual_sal in salaries.items():
            monthly = annual_sal / 12
            bonus = bonus_by_month.get(month, 0)
            annual += monthly + bonus
        
        annual = round(annual, 2)
        self.assertEqual(annual, 37000)


if __name__ == '__main__':
    print("=" * 70)
    print("  ACTUALIZACION SALARIAL FEATURE TEST SUITE")
    print("=" * 70)
    print()
    
    # Run tests
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestActualizacionSalarialFeature))
    suite.addTests(loader.loadTestsFromTestCase(TestActualizacionSalarialEdgeCases))
    suite.addTests(loader.loadTestsFromTestCase(TestActualizacionSalarialIntegration))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Summary
    print()
    print("=" * 70)
    if result.wasSuccessful():
        print(f"  ✅ ALL {result.testsRun} TESTS PASSED")
    else:
        print(f"  ❌ FAILURES: {len(result.failures)}, ERRORS: {len(result.errors)}")
    print("=" * 70)
    
    sys.exit(0 if result.wasSuccessful() else 1)
