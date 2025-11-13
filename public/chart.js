// Chart.js CDN loader
if (!window.Chart) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => {
        window.ChartLoaded = true;
    };
    document.head.appendChild(script);
}

function formatSum(val) {
    return new Intl.NumberFormat('ru-RU').format(val) + ' сум';
}

// Финансовый анализ
function renderFinanceChart(ctx, role) {
    // Проверяем, загружен ли Chart.js
    if (!window.Chart) {
        console.warn('Chart.js еще не загружен, ожидаем...');
        setTimeout(() => {
            if (window.Chart) {
                renderFinanceChart(ctx, role);
            } else {
                console.error('Chart.js не загрузился');
            }
        }, 100);
        return;
    }
    
    let labels, data, colors;
    // Берём реальные значения прихода с сервера, чтобы связать вкладку "Приход" с графиком
    let savedIncome = [];
    let incomeSum = 0;
    try {
        const response = await fetch('/api/income');
        if (response.ok) {
            savedIncome = await response.json();
            incomeSum = savedIncome.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
        }
    } catch (e) {
        console.error('Ошибка загрузки прихода для графика:', e);
    }

    if (role === 'admin') {
        labels = ['Бюджет', 'Приход', 'Потрачено', 'Остаток', 'Недостача', 'Экономия'];
        // Заменяем жестко закодированное значение прихода на сумму из записей
        data = [1000000, incomeSum || 0, 600000, 200000, 0, 200000];
        colors = ['#0071e3', '#34c759', '#ff3b30', '#ffd600', '#ff9500', '#30d158'];
    } else {
        labels = ['Бюджет', 'Передано', 'Потрачено', 'Долг'];
        data = [1000000, incomeSum || 0, 600000, 200000];
        colors = ['#0071e3', '#34c759', '#ff3b30', '#ff9500'];
    }

    // Суммы сверху
    const sumsRow = document.getElementById('financeSumsRow');
    if (sumsRow) {
        sumsRow.innerHTML = labels.map((l, i) => `<span class=\"analysis-sum-item\"><b>${l}:</b> ${formatSum(data[i])}</span>`).join('');
    }

    // Легенда + дополнительное разбиение по отправителям (место прихода)
    const financeLegendDiv = document.getElementById('financeChartLegend');
    if (financeLegendDiv) {
        financeLegendDiv.innerHTML = labels.map((l, i) => `<span class=\"chart-legend-item\"><span class=\"chart-legend-color\" style=\"background:${colors[i]}\"></span>${l}</span>`).join('');

        try {
            if (savedIncome.length) {
                const bySender = savedIncome.reduce((acc, it) => {
                    const key = (it.sender || 'Неизвестно').trim();
                    acc[key] = (acc[key] || 0) + (parseFloat(it.amount) || 0);
                    return acc;
                }, {});
                const keys = Object.keys(bySender);
                if (keys.length) {
                    const senderHtml = keys.map((k, i) => `<span class=\"chart-legend-item\" style=\"margin-left:12px\"><span class=\"chart-legend-color\" style=\"background:${i%2? '#2ecc71':'#27ae60'}\"></span> ${k}: ${formatSum(bySender[k])}</span>`).join('');
                    financeLegendDiv.innerHTML += `<div style=\"margin-top:8px;font-size:13px;color:var(--text-secondary)\"><b>Места прихода:</b> ${senderHtml}</div>`;
                }
            }
        } catch (e) {
            // ignore parsing errors
        }
    }
    // Убедимся, что старый чарт уничтожен перед созданием нового
    window.__charts = window.__charts || {};
    if (window.__charts.finance) {
        try { window.__charts.finance.destroy(); } catch (e) { /* ignore */ }
        window.__charts.finance = null;
    }

    // Горизонтальный bar chart: чуть скруглённые, прямоугольные линии
    const financeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderRadius: 7,
                borderSkipped: false,
                barPercentage: 0.7,
                categoryPercentage: 0.7,
                maxBarThickness: 38,
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                title: { display: false },
                datalabels: { display: false }
            },
            responsive: true,
            aspectRatio: 2.2,
            animation: false,
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: '#eee' },
                    ticks: { font: { size: 14 } }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 15, weight: 'bold' } }
                }
            }
        },
        plugins: [{
            id: 'barLabels',
            afterDatasetsDraw: chart => {
                const { ctx, chartArea, data } = chart;
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach((bar, i) => {
                    const value = formatSum(data.datasets[0].data[i]);
                    const x = bar.x - 16;
                    const y = bar.y;
                    ctx.save();
                    ctx.font = 'bold 15px Segoe UI';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#fff';
                    ctx.shadowColor = '#222';
                    ctx.shadowBlur = 2;
                    ctx.fillText(value, x, y);
                    ctx.restore();
                });
            }
        }]
    });
    window.__charts.finance = financeChart;
}

// Ресурсный анализ
function renderResourceColumnChart(ctx, label, plan, fact, i) {
    // Сумма сверху
    const sumDiv = document.getElementById('resourceSum' + i);
    if (sumDiv) {
        sumDiv.textContent = `План: ${formatSum(plan)}, Факт: ${formatSum(fact)}`;
    }
    // Название
    const labelDiv = document.getElementById('resourceLabel' + i);
    if (labelDiv) {
        labelDiv.textContent = label;
    }
    // Легенда
    const legendDiv = document.getElementById('resourceLegend' + i);
    if (legendDiv) {
        legendDiv.innerHTML = `<span class="chart-legend-item"><span class="chart-legend-color" style="background:#0071e3"></span>План</span><span class="chart-legend-item"><span class="chart-legend-color" style="background:#34c759"></span>Факт</span>`;
    }
    window.__charts = window.__charts || {};
    if (window.__charts['resource' + i]) {
        try { window.__charts['resource' + i].destroy(); } catch (e) {}
        window.__charts['resource' + i] = null;
    }
    const rc = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['План', 'Факт'],
            datasets: [{
                label,
                data: [plan, fact],
                backgroundColor: ['#0071e3', '#34c759'],
                borderRadius: 7
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            responsive: true,
            scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
        }
    });
    window.__charts['resource' + i] = rc;
}

function renderResourceGaugeChart(ctx, label, plan, fact, i) {
    const over = fact > plan;
    const factColor = over ? '#ff9500' : '#34c759';
    const planColor = '#e0e0e0';
    // Название сверху
    window.__charts = window.__charts || {};
    if (window.__charts['resource' + i]) {
        try { window.__charts['resource' + i].destroy(); } catch (e) {}
        window.__charts['resource' + i] = null;
    }
    const gauge = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [''],
            datasets: [
                {
                    label: 'План',
                    data: [plan],
                    backgroundColor: planColor,
                    borderRadius: 20,
                    barPercentage: 1.0,
                    categoryPercentage: 1.0,
                },
                {
                    label: 'Факт',
                    data: [Math.min(fact, plan)],
                    backgroundColor: factColor,
                    borderRadius: 20,
                    barPercentage: 1.0,
                    categoryPercentage: 1.0,
                }
            ]
        },
        options: {
            indexAxis: 'x',
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: label,
                    align: 'center',
                    color: '#222',
                    font: { size: 16, weight: 'bold' },
                    padding: { top: 10, bottom: 0 }
                }
            },
            responsive: true,
            aspectRatio: 4,
            animation: false,
            scales: {
                x: {
                    display: false,
                    stacked: true,
                    min: 0,
                    max: plan,
                },
                y: {
                    display: false,
                    stacked: true,
                }
            }
        }
    });
    window.__charts['resource' + i] = gauge;
    // Суммы под чартом
    const sumBlock = document.getElementById('resourceSumsBlock' + i);
    if (sumBlock) {
        sumBlock.innerHTML = `<div class=\"resource-sum-plan\">План: <span>${formatSum(plan)}</span></div><div class=\"resource-sum-fact\">Факт: <span>${formatSum(fact)}</span></div>`;
    }
}

function renderResourceChart(ctx, labels, data) {
    const colors = ['#0071e3', '#34c759', '#ff3b30', '#ffd600', '#ff9500', '#30d158'];
    // generic resource chart without index: try best-effort destroy if canvas has a chart
    try {
        const chartAtCanvas = Chart.getChart(ctx.canvas);
        if (chartAtCanvas) chartAtCanvas.destroy();
    } catch (e) {}

    const rchart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderRadius: 4,
                borderSkipped: false,
                barPercentage: 0.7,
                categoryPercentage: 0.7,
                maxBarThickness: 38,
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                title: { display: false },
                datalabels: { display: false }
            },
            responsive: true,
            aspectRatio: 2.2,
            animation: false,
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: '#eee' },
                    ticks: { font: { size: 14 } }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 15, weight: 'bold' } }
                }
            }
        }
    });
    // do not store generic charts globally
}

window.renderAnalysisCharts = function(role) {
    // Проверяем, загружен ли Chart.js
    if (!window.Chart) {
        console.warn('Chart.js еще не загружен, ожидаем...');
        setTimeout(() => {
            if (window.Chart) {
                window.renderAnalysisCharts(role);
            } else {
                console.error('Chart.js не загрузился');
            }
        }, 100);
        return;
    }
    
    // Финансы
    const financeCanvas = document.getElementById('financeBarChart');
    if (!financeCanvas) {
        console.warn('Canvas financeBarChart не найден');
        return;
    }
    const financeCtx = financeCanvas.getContext('2d');
    renderFinanceChart(financeCtx, role);
    // Ресурсы
    const resources = [
        { label: 'Трудозатраты', plan: 100, fact: 80 },
        { label: 'Материал', plan: 200, fact: 180 },
        { label: 'Оборудование', plan: 150, fact: 120 },
        { label: 'Доставка', plan: 50, fact: 60 },
        { label: 'Мебель', plan: 70, fact: 65 },
        { label: 'Питание', plan: 30, fact: 28 },
        { label: 'Коммуналка', plan: 40, fact: 38 },
        { label: 'Документация', plan: 20, fact: 18 },
        { label: 'Проект', plan: 60, fact: 55 }
    ];
    resources.forEach((res, i) => {
        const ctx = document.getElementById('resourceChart' + i).getContext('2d');
        renderResourceGaugeChart(ctx, res.label, res.plan, res.fact, i);
    });
};
