// Detect page JavaScript

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const analyzeBtn = document.getElementById('analyzeBtn');
const cancelBtn = document.getElementById('cancelBtn');
const loadingContainer = document.getElementById('loadingContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsContainer = document.getElementById('resultsContainer');
const modelsGrid = document.getElementById('modelsGrid');
const comparisonChart = document.getElementById('comparisonChart');
const primaryResult = document.getElementById('primaryResult');
const primaryPrediction = document.getElementById('primaryPrediction');
const primaryConfidence = document.getElementById('primaryConfidence');
const resultIcon = document.getElementById('resultIcon');
const newAnalysisBtn = document.getElementById('newAnalysisBtn');
const downloadBtn = document.getElementById('downloadBtn');

let selectedFile = null;
let analysisResults = null;

// Drag and drop handlers
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// File input handler
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Handle file selection
function handleFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        alert('Please upload a valid image file (JPG, JPEG, or PNG)');
        return;
    }
    
    // Validate file size (16MB)
    if (file.size > 16 * 1024 * 1024) {
        alert('File size must be less than 16MB');
        return;
    }
    
    selectedFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        uploadArea.style.display = 'none';
        previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Cancel button
cancelBtn.addEventListener('click', () => {
    resetUpload();
});

// Reset upload
function resetUpload() {
    selectedFile = null;
    fileInput.value = '';
    imagePreview.src = '';
    uploadArea.style.display = 'block';
    previewContainer.style.display = 'none';
    loadingContainer.style.display = 'none';
    resultsContainer.style.display = 'none';
}

// Analyze button
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    
    // Show loading
    previewContainer.style.display = 'none';
    loadingContainer.style.display = 'block';
    
    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) {
            progress = 90;
            clearInterval(progressInterval);
        }
        updateProgress(progress);
    }, 200);
    
    // Upload and analyze
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        clearInterval(progressInterval);
        updateProgress(100);
        
        if (!response.ok) {
            throw new Error('Analysis failed');
        }
        
        const results = await response.json();
        
        setTimeout(() => {
            displayResults(results);
        }, 500);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Analysis failed. Please try again.');
        resetUpload();
    }
});

// Update progress bar
function updateProgress(percent) {
    progressFill.style.width = percent + '%';
    progressText.textContent = Math.round(percent) + '%';
}

// Display results
function displayResults(results) {
    analysisResults = results;
    
    loadingContainer.style.display = 'none';
    resultsContainer.style.display = 'block';
    
    // Get voting classifier result
    const votingResult = results.classifiers['Voting Classifier'];
    const isPredictionForged = votingResult.prediction === 'Forged';
    
    // Update primary result
    primaryResult.className = 'primary-result ' + (isPredictionForged ? 'forged' : 'authentic');
    primaryPrediction.textContent = votingResult.prediction;
    primaryConfidence.textContent = `Confidence: ${votingResult.confidence.toFixed(2)}%`;
    
    // Update icon
    if (isPredictionForged) {
        resultIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    } else {
        resultIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
    }
    
    // Display model results
    displayModelCards(results.classifiers);
    
    // Display comparison chart
    displayComparisonChart(results.classifiers);
    
    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

// Display model cards
function displayModelCards(classifiers) {
    modelsGrid.innerHTML = '';
    
    const modelColors = [
        ['#3b82f6', '#06b6d4'],  // Blue to Cyan
        ['#a855f7', '#f472b6'],  // Purple to Pink
        ['#22c55e', '#14b8a6'],  // Green to Teal
        ['#f97316', '#eab308'],  // Orange to Yellow
        ['#7c3aed', '#d946ef'],  // Violet to Fuchsia
        ['#f43f5e', '#ec4899'],  // Rose to Pink
        ['#6366f1', '#8b5cf6']   // Indigo to Purple
    ];
    
    let colorIndex = 0;
    
    for (const [name, data] of Object.entries(classifiers)) {
        const card = document.createElement('div');
        card.className = 'model-card';
        
        const colors = modelColors[colorIndex % modelColors.length];
        const isForged = data.prediction === 'Forged';
        
        card.innerHTML = `
            <h4>
                ${name}
                <span class="model-badge ${isForged ? 'forged' : 'authentic'}">
                    ${data.prediction}
                </span>
            </h4>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${data.confidence}%; background: linear-gradient(90deg, ${colors[0]}, ${colors[1]});"></div>
            </div>
            <p class="confidence-text">${data.confidence.toFixed(2)}% Confidence</p>
            <div style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-secondary);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Authentic:</span>
                    <strong>${data.authentic_prob.toFixed(2)}%</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Forged:</span>
                    <strong>${data.forged_prob.toFixed(2)}%</strong>
                </div>
            </div>
        `;
        
        modelsGrid.appendChild(card);
        colorIndex++;
    }
}

// Display comparison chart
function displayComparisonChart(classifiers) {
    comparisonChart.innerHTML = '';
    
    const modelColors = [
        ['#3b82f6', '#06b6d4'],
        ['#a855f7', '#f472b6'],
        ['#22c55e', '#14b8a6'],
        ['#f97316', '#eab308'],
        ['#7c3aed', '#d946ef'],
        ['#f43f5e', '#ec4899'],
        ['#6366f1', '#8b5cf6']
    ];
    
    let colorIndex = 0;
    
    for (const [name, data] of Object.entries(classifiers)) {
        const item = document.createElement('div');
        item.className = 'comparison-item';
        
        const colors = modelColors[colorIndex % modelColors.length];
        
        item.innerHTML = `
            <div class="comparison-label">${name}</div>
            <div class="comparison-bar-container">
                <div class="comparison-bar" style="width: ${data.confidence}%; background: linear-gradient(90deg, ${colors[0]}, ${colors[1]});">
                    ${data.confidence.toFixed(1)}%
                </div>
            </div>
        `;
        
        comparisonChart.appendChild(item);
        colorIndex++;
    }
}

// New analysis button
newAnalysisBtn.addEventListener('click', () => {
    resetUpload();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Download report button
downloadBtn.addEventListener('click', () => {
    if (!analysisResults) return;
    
    // Create report text
    let report = '='.repeat(60) + '\n';
    report += 'IMAGE FORGERY DETECTION REPORT\n';
    report += '='.repeat(60) + '\n\n';
    report += `Filename: ${analysisResults.filename}\n`;
    report += `Analysis Date: ${new Date().toLocaleString()}\n\n`;
    
    report += 'FINAL VERDICT:\n';
    report += '-'.repeat(60) + '\n';
    const votingResult = analysisResults.classifiers['Voting Classifier'];
    report += `Prediction: ${votingResult.prediction}\n`;
    report += `Confidence: ${votingResult.confidence.toFixed(2)}%\n\n`;
    
    report += 'DETAILED RESULTS:\n';
    report += '-'.repeat(60) + '\n';
    
    for (const [name, data] of Object.entries(analysisResults.classifiers)) {
        report += `\n${name}:\n`;
        report += `  Prediction: ${data.prediction}\n`;
        report += `  Confidence: ${data.confidence.toFixed(2)}%\n`;
        report += `  Authentic Probability: ${data.authentic_prob.toFixed(2)}%\n`;
        report += `  Forged Probability: ${data.forged_prob.toFixed(2)}%\n`;
    }
    
    report += '\n' + '='.repeat(60) + '\n';
    report += 'End of Report\n';
    
    // Download
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forgery_detection_report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
