(function () {
  var tag = document.getElementById('buildTag');
  function set(s) { if (tag) { tag.textContent = 'build v145 · ' + s; } }
  try {
    var item = document.querySelector('.color-scheme-item');
    var legend = document.getElementById('monthlyChartLegend');
    var panel = document.querySelector('.results-panel[data-panel="mensual"]');
    var activePanel = document.querySelector('.results-panel.active');
    var chart = document.getElementById('monthlyChart');
    var swatch = item ? item.querySelector('.scheme-swatch') : null;
    function info(el) {
      if (!el) return 'NULL';
      var r = el.getBoundingClientRect();
      var cs = getComputedStyle(el);
      return Math.round(r.width) + 'x' + Math.round(r.height) + ' disp=' + cs.display + ' vis=' + cs.visibility;
    }
    function swInfo(el) {
      if (!el) return 'NULL';
      var r = el.getBoundingClientRect();
      var cs = getComputedStyle(el);
      return Math.round(r.width) + 'x' + Math.round(r.height) + ' disp=' + cs.display + ' bg=' + cs.backgroundColor;
    }
    set('theme=' + (document.documentElement.getAttribute('data-theme') || 'auto') +
        ' · activePanel=' + (activePanel ? activePanel.getAttribute('data-panel') : 'none') +
        ' · mensual=' + info(panel) +
        ' · chart=' + info(chart) +
        ' · legend=' + info(legend) +
        ' · item=' + info(item) +
        ' · swatch=' + swInfo(swatch));
  } catch (e) {
    set('JS ERROR: ' + e.message);
  }
})();
