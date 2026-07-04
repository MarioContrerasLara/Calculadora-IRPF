'use strict';

/* =============================================================
   UI enhancements
   - Tab switching in the advanced panel
   - Tab switching in the results breakdown (SS/IRPF/Mensual/Distribución)
   - Number formatting as you type in the main salary input
   - Quick-pick salary buttons
   - Active state on quick-picks based on bruto value
   - Animation: brief flash on result hero when it changes
   - Track advanced-panel configuration count for the badge
   ============================================================= */

(function () {
    /* ─── Tabs (advanced panel) ─────────────────────────── */
    const tabs = document.querySelectorAll('.tabs .tab');
    const panels = document.querySelectorAll('.tab-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => {
                t.classList.toggle('active', t === tab);
                t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
            });
            panels.forEach(p => {
                p.classList.toggle('active', p.dataset.panel === target);
            });
        });
    });

    /* ─── Tabs (results breakdown) ──────────────────────── */
    // Parallel to the advanced panel, but for the new results-tabs
    // (Seguridad Social / IRPF / Mensual / Distribución).
    const resultTabs = document.querySelectorAll('.results-tab');
    const resultPanels = document.querySelectorAll('.results-panel');

    resultTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            resultTabs.forEach(t => {
                t.classList.toggle('active', t === tab);
                t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
            });
            resultPanels.forEach(p => {
                p.classList.toggle('active', p.dataset.panel === target);
            });
            // When the Distribución tab opens, the iceberg becomes visible.
            // Re-run its render so the labels get correct positions (the
            // layout cache skips itself when the SVG is hidden).
            if (target === 'distribucion' && typeof window.repositionIceberg === 'function') {
                window.repositionIceberg();
            }
            // When the Mensual tab opens, re-render the chart so it picks
            // up the now-visible container width for responsive sizing.
            if (target === 'mensual' && typeof window._rerenderMonthlyChart === 'function') {
                window._rerenderMonthlyChart();
            }
        });
    });

    /* ─── Number formatting as you type ─────────────────── */
    // The app.js parser handles "30,50", "30.000,50" and "30000" but treats
    // "30.000" (no comma) as 30. So we add thousand separators AFTER a comma
    // is present, or never for the integer part alone. Format: "30000,50" → "30.000,50".
    const brutoInput = document.getElementById('bruto');
    if (brutoInput) {
        brutoInput.addEventListener('input', () => {
            const cursorPos = brutoInput.selectionStart;
            const oldLength = brutoInput.value.length;

            // Strip everything except digits and one comma
            let raw = brutoInput.value.replace(/[^\d,]/g, '');
            const firstComma = raw.indexOf(',');
            if (firstComma !== -1) {
                raw = raw.slice(0, firstComma + 1) + raw.slice(firstComma + 1).replace(/,/g, '');
            }

            // If the user hasn't typed a decimal comma yet, store the raw digits
            // (avoiding a ".000" that the parser would treat as 30).
            // Once they type a comma, reformat the integer part with dots.
            const [intPart, decPart] = raw.split(',');
            const intDigits = intPart || '';
            let display;
            if (decPart === undefined && !raw.endsWith(',')) {
                // No decimal typed → just keep raw integer digits, no separator
                display = intDigits;
            } else {
                // Decimal was typed → reformat integer part with thousand dots
                display = (intDigits ? intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '') + ',' + (decPart || '');
            }

            brutoInput.value = display;

            // Restore cursor position
            const newLength = display.length;
            const diff = newLength - oldLength;
            const newPos = Math.max(0, Math.min(display.length, cursorPos + diff));
            try { brutoInput.setSelectionRange(newPos, newPos); } catch (_) {}

            updateQuickPickActive();
        });

        brutoInput.addEventListener('blur', () => {
            // On blur, format the integer part with thousand separators ONLY if
            // a decimal part exists (the parser needs the comma to interpret "30.000"
            // as 30 thousand). Without a comma, leave the raw digits.
            const v = brutoInput.value;
            const [intPart, decPart] = v.split(',');
            if (intPart && decPart !== undefined && !v.endsWith(',')) {
                brutoInput.value = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + decPart;
            }
            updateQuickPickActive();
        });
    }

    /* ─── Quick-pick buttons ────────────────────────────── */
    const quickPicks = document.querySelectorAll('.quick-pick');
    quickPicks.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.dataset.value;
            if (brutoInput && val) {
                brutoInput.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                brutoInput.dispatchEvent(new Event('input', { bubbles: true }));
                updateQuickPickActive();
            }
        });
    });

    function updateQuickPickActive() {
        const current = (brutoInput?.value || '').replace(/[^\d]/g, '');
        if (!current) {
            quickPicks.forEach(b => b.classList.remove('active'));
            return;
        }
        quickPicks.forEach(b => {
            const matches = b.dataset.value === current;
            b.classList.toggle('active', matches);
        });
    }

    /* ─── Advanced count badge ──────────────────────────── */
    const advancedDetails = document.getElementById('advancedDetails');
    const advancedCount = document.getElementById('advancedCount');

    function recomputeAdvancedCount() {
        if (!advancedCount) return;
        const bonusCount = document.querySelectorAll('#bonusList .especie-custom-row').length;
        const actualizacionCount = document.querySelectorAll('#actualizacionList .especie-custom-row').length;
        const especieCount = document.querySelectorAll('#espCustomList .especie-custom-row').length;
        const total = bonusCount + actualizacionCount + especieCount;
        advancedCount.textContent = total > 0 ? String(total) : '';
        advancedCount.dataset.count = String(total);
    }

    // Patch dynamic add functions to recompute count after each add/remove
    const originalAddBonus = window.addBonus;
    window.addBonus = function () {
        const r = originalAddBonus.apply(this, arguments);
        recomputeAdvancedCount();
        return r;
    };
    const originalAddActualizacion = window.addActualizacionSalarial;
    window.addActualizacionSalarial = function () {
        const r = originalAddActualizacion.apply(this, arguments);
        recomputeAdvancedCount();
        return r;
    };
    const originalAddEspecie = window.addEspecieCustom;
    window.addEspecieCustom = function () {
        const r = originalAddEspecie.apply(this, arguments);
        recomputeAdvancedCount();
        return r;
    };

    // Hook into the remove buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-especie')) {
            setTimeout(recomputeAdvancedCount, 0);
        }
    });

    /* ─── Smooth scroll to results ──────────────────────── */
    const linkResultados = document.getElementById('linkResultados');
    if (linkResultados) {
        linkResultados.addEventListener('click', (e) => {
            e.preventDefault();
            const results = document.getElementById('results');
            if (results && results.classList.contains('show')) {
                results.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                document.getElementById('bruto').focus();
            }
        });
    }

    /* ─── Theme toggle ──────────────────────────────────── */
    // The no-flash bootstrap script in <head> sets data-theme before paint.
    // This handler persists the user's choice and flips the attribute.
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const root = document.documentElement;
            const current = root.getAttribute('data-theme');
            // If no explicit attribute, infer from system preference
            const isDark = current === 'dark'
                || (current === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
            const next = isDark ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            try { localStorage.setItem('theme', next); } catch (e) {}
        });
    }

    /* ─── Year input: keep the header year + document title in sync ─── */
    const anioInput = document.getElementById('anio');
    if (anioInput) {
        anioInput.addEventListener('input', () => {
            let y = anioInput.value.replace(/\D/g, '').slice(0, 4);
            if (y !== anioInput.value) anioInput.value = y;
            y = y || '2026';
            const n = parseInt(y, 10);
            if (n >= 2023 && n <= 2045) {
                document.getElementById('headerAnio').textContent = y;
                document.title = 'Calculadora IRPF + Seguridad Social ' + y + ' — Andalucía';
            }
        });
    }

    /* ─── Static "add row" buttons in the advanced panel ─── */
    [
        ['btnAddBonus',          'addBonus'],
        ['btnAddActualizacion',  'addActualizacionSalarial'],
        ['btnAddEspecie',        'addEspecieCustom'],
    ].forEach(([id, fn]) => {
        const el = document.getElementById(id);
        if (el && typeof window[fn] === 'function') {
            el.addEventListener('click', () => window[fn]());
        }
    });

    /* ─── Main calculate button ─── */
    const btnCalculate = document.getElementById('btnCalculate');
    if (btnCalculate && typeof window.calcular === 'function') {
        btnCalculate.addEventListener('click', () => window.calcular(true));
    }

    /* ─── Ticket monthly/annual mode toggles ─── */
    ['espTicketRest', 'espTransporte'].forEach(name => {
        const toggle = document.getElementById(name + 'ModeToggle');
        if (toggle && typeof window.toggleTicketMode === 'function') {
            toggle.addEventListener('change', () => window.toggleTicketMode(name));
        }
    });

    /* ─── Initialize ────────────────────────────────────── */
    recomputeAdvancedCount();
    updateQuickPickActive();
})();
