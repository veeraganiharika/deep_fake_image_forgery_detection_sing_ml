/**
 * detect.js  –  Image Forgery Detection
 * Handles: upload, preview, analysis, progress animation, inline results,
 *          and the post-analysis POPUP showing classification + best models.
 */

'use strict';

// ─── DOM refs ──────────────────────────────────────────────────────────────
const uploadArea        = document.getElementById('uploadArea');
const fileInput         = document.getElementById('fileInput');
const previewContainer  = document.getElementById('previewContainer');
const imagePreview      = document.getElementById('imagePreview');
const analyzeBtn        = document.getElementById('analyzeBtn');
const cancelBtn         = document.getElementById('cancelBtn');
const loadingContainer  = document.getElementById('loadingContainer');
const progressFill      = document.getElementById('progressFill');
const progressText      = document.getElementById('progressText');
const resultsContainer  = document.getElementById('resultsContainer');
const primaryPrediction = document.getElementById('primaryPrediction');
const primaryConfidence = document.getElementById('primaryConfidence');
const resultIcon        = document.getElementById('resultIcon');
const modelsGrid        = document.getElementById('modelsGrid');
const comparisonChart   = document.getElementById('comparisonChart');
const newAnalysisBtn    = document.getElementById('newAnalysisBtn');
const downloadBtn       = document.getElementById('downloadBtn');

// popup
const resultPopup        = document.getElementById('resultPopup');
const popupVerdictBadge  = document.getElementById('popupVerdictBadge');
const popupVerdictIcon   = document.getElementById('popupVerdictIcon');
const popupVerdictText   = document.getElementById('popupVerdictText');
const popupVerdictSub    = document.getElementById('popupVerdictSub');
const popupBestModel     = document.getElementById('popupBestModel');
const bestModelName      = document.getElementById('bestModelName');
const bestModelConf      = document.getElementById('bestModelConf');
const popupSummaryChips  = document.getElementById('popupSummaryChips');
const popupModelsTable   = document.getElementById('popupModelsTableBody');
const popupCloseTop      = document.getElementById('popupCloseTop');
const popupCloseBtn      = document.getElementById('popupCloseBtn');
const popupNewBtn        = document.getElementById('popupNewBtn');

// ─── State ─────────────────────────────────────────────────────────────────
let selectedFile  = null;
let lastResults   = null;
let progressTimer = null;

// ─── Model meta (type tags) ─────────────────────────────────────────────────
const MODEL_META = {
    'MobileNet'         : { tag: 'DL',  tagClass: 'tag-dl'  },
    'SVM'               : { tag: 'ML',  tagClass: 'tag-ml'  },
    'Logistic Regression': { tag: 'ML', tagClass: 'tag-ml'  },
    'Decision Tree'     : { tag: 'ML',  tagClass: 'tag-ml'  },
    'KNN'               : { tag: 'ML',  tagClass: 'tag-ml'  },
    'Random Forest'     : { tag: 'ML',  tagClass: 'tag-ml'  },
    'Voting Classifier' : { tag: 'ENS', tagClass: 'tag-ens' },
};

// ─── Upload / Drag & Drop ──────────────────────────────────────────────────
['dragenter','dragover'].forEach(evt =>
    uploadArea.addEventListener(evt, e => { e.preventDefault(); uploadArea.classList.add('drag-over'); })
);
['dragleave','drop'].forEach(evt =>
    uploadArea.addEventListener(evt, e => { e.preventDefault(); uploadArea.classList.remove('drag-over'); })
);
uploadArea.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file && isImageFile(file)) handleFileSelect(file);
    else showToast('Please drop a valid image file (JPG, PNG, JPEG).', 'error');
});
fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFileSelect(fileInput.files[0]);
});

function isImageFile(file) {
    return /\.(jpg|jpeg|png)$/i.test(file.name);
}

function handleFileSelect(file) {
    if (file.size > 16 * 1024 * 1024) {
        showToast('File size exceeds 16 MB. Please choose a smaller image.', 'error');
        return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        imagePreview.src = e.target.result;
        show(previewContainer);
        hide(uploadArea.closest('.upload-container'));
        hide(resultsContainer);
    };
    reader.readAsDataURL(file);
}

cancelBtn.addEventListener('click', resetUI);
newAnalysisBtn.addEventListener('click', resetUI);

function resetUI() {
    selectedFile = null;
    lastResults  = null;
    fileInput.value = '';
    hide(previewContainer);
    hide(loadingContainer);
    hide(resultsContainer);
    show(uploadArea.closest('.upload-container') || uploadArea.parentElement);
    clearInterval(progressTimer);
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    closePopup();
}

// ─── Analyze ───────────────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    hide(previewContainer);
    show(loadingContainer);
    startProgress();

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        const resp = await fetch('/upload', { method: 'POST', body: formData });
        const data = await resp.json();

        finishProgress();
        await delay(400);
        hide(loadingContainer);

        if (data.error) {
            showToast(data.error, 'error');
            resetUI();
            return;
        }

        lastResults = data;
        renderInlineResults(data);
        show(resultsContainer);
        openPopup(data);

    } catch (err) {
        console.error(err);
        finishProgress();
        hide(loadingContainer);
        showToast('Network error – could not reach the server.', 'error');
        resetUI();
    }
});

// ─── Progress animation ────────────────────────────────────────────────────
function startProgress() {
    let pct = 0;
    const steps = [
        { target: 30, label: 'Extracting ELA features…' },
        { target: 60, label: 'Running MobileNet CNN…'   },
        { target: 85, label: 'Classifying with ML models…' },
        { target: 95, label: 'Ensemble voting…'          },
    ];
    let stepIdx = 0;
    const loadingText = loadingContainer.querySelector('p');

    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
        if (stepIdx < steps.length && pct >= steps[stepIdx].target - 1) {
            if (loadingText) loadingText.textContent = steps[stepIdx].label;
            stepIdx++;
        }
        if (pct < 95) {
            pct += Math.random() * 2;
            pct = Math.min(pct, 95);
            setProgress(pct);
        }
    }, 150);
}

function finishProgress() {
    clearInterval(progressTimer);
    setProgress(100);
}

function setProgress(pct) {
    const v = Math.round(pct);
    progressFill.style.width  = v + '%';
    progressText.textContent  = v + '%';
}

// ─── Inline results ────────────────────────────────────────────────────────
function renderInlineResults(data) {
    const allModels = buildModelList(data);
    const finalVerdict = getFinalVerdict(allModels);

    // Primary result block
    const isForged = finalVerdict.verdict === 'Forged';
    resultIcon.innerHTML  = `<i class="fas ${isForged ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>`;
    resultIcon.className  = `result-icon ${isForged ? 'forged' : 'authentic'}`;
    primaryPrediction.textContent = isForged ? '⚠ Image is FORGED' : '✓ Image is AUTHENTIC';
    primaryPrediction.style.color = isForged ? '#f87171' : '#34d399';
    primaryConfidence.textContent = `Ensemble Confidence: ${finalVerdict.confidence.toFixed(1)}%`;

    // Models grid
    modelsGrid.innerHTML = allModels.map(m => `
        <div class="model-result-card ${m.verdict.toLowerCase()}">
            <div class="model-result-header">
                <span class="model-result-name">${m.name}</span>
                <span class="model-result-badge ${m.verdict.toLowerCase()}">${m.verdict}</span>
            </div>
            <div class="model-result-confidence">
                <div class="conf-track">
                    <div class="conf-track-fill ${m.verdict.toLowerCase()}" style="width:${m.confidence}%"></div>
                </div>
                <span>${m.confidence.toFixed(1)}%</span>
            </div>
        </div>`).join('');

    // Comparison bars
    comparisonChart.innerHTML = allModels.map(m => `
        <div class="comparison-bar-row">
            <span class="comparison-label">${m.name}</span>
            <div class="comparison-bar-bg">
                <div class="comparison-bar-fill ${m.verdict.toLowerCase()}" style="width:${m.confidence}%"></div>
            </div>
            <span class="comparison-pct">${m.confidence.toFixed(1)}%</span>
        </div>`).join('');
}

// ─── POPUP ─────────────────────────────────────────────────────────────────
function openPopup(data) {
    const allModels   = buildModelList(data);
    const finalVerdict = getFinalVerdict(allModels);
    const bestModel   = getBestModel(allModels);
    const isForged    = finalVerdict.verdict === 'Forged';

    /* -- Verdict badge -- */
    popupVerdictBadge.className = `popup-verdict-badge ${isForged ? 'forged' : 'authentic'}`;
    popupVerdictIcon.className  = `fas ${isForged ? 'fa-exclamation-triangle' : 'fa-check-circle'}`;
    popupVerdictText.textContent = isForged ? 'FORGED IMAGE DETECTED' : 'AUTHENTIC IMAGE';
    popupVerdictSub.textContent  = isForged
        ? 'This image shows signs of digital manipulation.'
        : 'No signs of manipulation were detected.';

    /* -- Best model -- */
    const bestMeta = MODEL_META[bestModel.name] || { tag: 'ML', tagClass: 'tag-ml' };
    bestModelName.textContent = bestModel.name;
    bestModelConf.textContent = `${bestModel.confidence.toFixed(2)}% confidence  •  Verdict: ${bestModel.verdict}`;

    /* -- Summary chips -- */
    const forgedCount    = allModels.filter(m => m.verdict === 'Forged').length;
    const authenticCount = allModels.filter(m => m.verdict === 'Authentic').length;
    const topConf        = Math.max(...allModels.map(m => m.confidence));

    popupSummaryChips.innerHTML = `
        <div class="summary-chip chip-models">
            <div class="chip-num">${allModels.length}</div>
            <div class="chip-label">Models Used</div>
        </div>
        <div class="summary-chip chip-forged">
            <div class="chip-num">${forgedCount}</div>
            <div class="chip-label">Voted Forged</div>
        </div>
        <div class="summary-chip chip-auth">
            <div class="chip-num">${authenticCount}</div>
            <div class="chip-label">Voted Authentic</div>
        </div>
        <div class="summary-chip chip-top">
            <div class="chip-num">${topConf.toFixed(0)}%</div>
            <div class="chip-label">Peak Confidence</div>
        </div>`;

    /* -- Models table -- */
    popupModelsTable.innerHTML = allModels.map(m => {
        const isBest = m.name === bestModel.name;
        const meta   = MODEL_META[m.name] || { tag: 'ML', tagClass: 'tag-ml' };
        const barClass = m.verdict === 'Forged' ? 'forged' : 'authentic';
        return `
        <tr class="${isBest ? 'best-row' : ''}">
            <td>
                <div class="model-name-cell">
                    ${m.name}
                    <span class="model-type-tag ${meta.tagClass}">${meta.tag}</span>
                </div>
            </td>
            <td>
                <span class="verdict-pill ${m.verdict.toLowerCase()}">
                    <i class="fas ${m.verdict === 'Forged' ? 'fa-times-circle' : 'fa-check-circle'}"></i>
                    ${m.verdict}
                </span>
            </td>
            <td>
                <div class="conf-bar-wrap">
                    <div class="conf-bar-bg">
                        <div class="conf-bar-fill ${barClass}" style="width:${m.confidence}%"></div>
                    </div>
                    <span class="conf-pct">${m.confidence.toFixed(1)}%</span>
                </div>
            </td>
            <td>${isBest ? '<span class="star-icon">★ Best</span>' : '—'}</td>
        </tr>`;
    }).join('');

    /* -- Show -- */
    resultPopup.classList.add('active');
    document.body.style.overflow = 'hidden';

    /* -- Animate bars after render -- */
    requestAnimationFrame(() => {
        document.querySelectorAll('.conf-bar-fill').forEach(el => {
            const target = el.style.width;
            el.style.width = '0%';
            setTimeout(() => { el.style.width = target; }, 80);
        });
    });
}

function closePopup() {
    resultPopup.classList.remove('active');
    document.body.style.overflow = '';
}

popupCloseTop.addEventListener('click', closePopup);
popupCloseBtn.addEventListener('click', closePopup);
popupNewBtn.addEventListener('click', () => { closePopup(); resetUI(); });

// Close on overlay click
resultPopup.addEventListener('click', e => {
    if (e.target === resultPopup) closePopup();
});

// Close on Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && resultPopup.classList.contains('active')) closePopup();
});

// ─── Download report ───────────────────────────────────────────────────────
downloadBtn.addEventListener('click', () => {
    if (!lastResults) return;
    const allModels = buildModelList(lastResults);
    const finalVerdict = getFinalVerdict(allModels);
    const bestModel = getBestModel(allModels);

    let report = `IMAGE FORGERY DETECTION REPORT\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Date     : ${new Date().toLocaleString()}\n`;
    report += `File     : ${lastResults.filename || 'N/A'}\n\n`;
    report += `FINAL VERDICT : ${finalVerdict.verdict.toUpperCase()}\n`;
    report += `Confidence    : ${finalVerdict.confidence.toFixed(2)}%\n\n`;
    report += `BEST MODEL    : ${bestModel.name} (${bestModel.confidence.toFixed(2)}%)\n\n`;
    report += `${'─'.repeat(50)}\n`;
    report += `MODEL-BY-MODEL RESULTS\n`;
    report += `${'─'.repeat(50)}\n`;
    allModels.forEach(m => {
        report += `${m.name.padEnd(24)}: ${m.verdict.padEnd(12)} (${m.confidence.toFixed(2)}%)\n`;
    });
    report += `\n${'='.repeat(50)}\n`;
    report += `Generated by ImageGuard AI\n`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `forgery_report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
});

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Build a flat array of {name, verdict, confidence} from the server response.
 */
function buildModelList(data) {
    const models = [];

    // MobileNet (deep learning)
    if (data.mobilenet) {
        models.push({
            name      : 'MobileNet',
            verdict   : data.mobilenet.prediction,
            confidence: data.mobilenet.confidence,
        });
    }

    // Sklearn classifiers
    const DISPLAY_NAMES = {
        'svm'                : 'SVM',
        'lr'                 : 'Logistic Regression',
        'logistic_regression': 'Logistic Regression',
        'dt'                 : 'Decision Tree',
        'decision_tree'      : 'Decision Tree',
        'knn'                : 'KNN',
        'rf'                 : 'Random Forest',
        'random_forest'      : 'Random Forest',
        'voting'             : 'Voting Classifier',
        'voting_classifier'  : 'Voting Classifier',
    };

    if (data.classifiers) {
        Object.entries(data.classifiers).forEach(([key, val]) => {
            const name = DISPLAY_NAMES[key.toLowerCase()] ||
                         key.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
            models.push({
                name,
                verdict   : val.prediction,
                confidence: val.confidence,
            });
        });
    }

    return models;
}

/**
 * Determine ensemble final verdict by majority vote.
 * Ties go to Forged (conservative).
 */
function getFinalVerdict(models) {
    if (!models.length) return { verdict: 'Unknown', confidence: 0 };

    // Prefer the Voting Classifier if present
    const vc = models.find(m => m.name === 'Voting Classifier');
    if (vc) return { verdict: vc.verdict, confidence: vc.confidence };

    const forgedModels    = models.filter(m => m.verdict === 'Forged');
    const authenticModels = models.filter(m => m.verdict === 'Authentic');

    if (forgedModels.length >= authenticModels.length) {
        const avg = forgedModels.reduce((s, m) => s + m.confidence, 0) / forgedModels.length;
        return { verdict: 'Forged', confidence: avg };
    }
    const avg = authenticModels.reduce((s, m) => s + m.confidence, 0) / authenticModels.length;
    return { verdict: 'Authentic', confidence: avg };
}

/**
 * Return the single model with the highest confidence score.
 */
function getBestModel(models) {
    return models.reduce((best, m) => m.confidence > best.confidence ? m : best, models[0]);
}

// ─── Utility ───────────────────────────────────────────────────────────────
function show(el) { if (el) el.style.display = ''; }
function hide(el) { if (el) el.style.display = 'none'; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function showToast(msg, type = 'info') {
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();

    const t = document.createElement('div');
    t.className = 'toast-msg';
    t.style.cssText = `
        position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
        background:${type === 'error' ? '#ef4444' : '#6366f1'};
        color:#fff; padding:12px 24px; border-radius:10px;
        font-size:14px; font-weight:600; z-index:99999;
        box-shadow:0 6px 24px rgba(0,0,0,0.4);
        animation:toastIn 0.3s ease;
    `;
    t.textContent = msg;

    const style = document.createElement('style');
    style.textContent = `@keyframes toastIn{from{opacity:0;transform:translate(-50%,20px)}to{opacity:1;transform:translate(-50%,0)}}`;
    document.head.appendChild(style);

    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}
