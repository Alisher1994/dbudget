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
    let labels, data, colors, sums, legend;
    if (role === 'admin') {
        labels = ['Бюджет', 'Приход', 'Потрачено', 'Остаток', 'Недостача', 'Экономия'];
        data = [1000000, 800000, 600000, 200000, 0, 200000];
        colors = ['#0071e3', '#34c759', '#ff3b30', '#ffd600', '#ff9500', '#30d158'];
        legend = ['Бюджет', 'Приход', 'Потрачено', 'Остаток', 'Недостача', 'Экономия'];
    } else {
        labels = ['Бюджет', 'Передано', 'Потрачено', 'Долг'];
        data = [1000000, 800000, 600000, 200000];
        colors = ['#0071e3', '#34c759', '#ff3b30', '#ff9500'];
        legend = ['Бюджет', 'Передано', 'Потрачено', 'Долг'];
    }
    sums = data.map(formatSum);
    // Суммы сверху
    const sumsRow = document.getElementById('financeSumsRow');
    if (sumsRow) {
        sumsRow.innerHTML = labels.map((l, i) => `<span class="analysis-sum-item"><b>${l}:</b> ${sums[i]}</span>`).join('');
    }
    // Легенда
    const legendDiv = document.getElementById('financeChartLegend');
    if (legendDiv) {
        legendDiv.innerHTML = labels.map((l, i) => `<span class="chart-legend-item"><span class="chart-legend-color" style="background:${colors[i]}"></span>${l}</span>`).join('');
    }
    // Горизонтальный bar chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Финансы',
                data,
                backgroundColor: colors,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            responsive: true,
            scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
        }
    });
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
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['План', 'Факт'],
            datasets: [{
                label,
                data: [plan, fact],
                backgroundColor: ['#0071e3', '#34c759'],
                borderRadius: 8
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            responsive: true,
            scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
        }
    });
}

function renderResourceGaugeChart(ctx, label, plan, fact, i) {
    const over = fact > plan;
    const factColor = over ? '#ff9500' : '#34c759';
    const planColor = '#e0e0e0';
    // Название сверху
    new Chart(ctx, {
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
    // Суммы под чартом
    const sumBlock = document.getElementById('resourceSumsBlock' + i);
    if (sumBlock) {
        sumBlock.innerHTML = `<div class=\"resource-sum-plan\">План: <span>${formatSum(plan)}</span></div><div class=\"resource-sum-fact\">Факт: <span>${formatSum(fact)}</span></div>`;
    }
}

window.renderAnalysisCharts = function(role) {
    // Финансы
    const financeCtx = document.getElementById('financeBarChart').getContext('2d');
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
