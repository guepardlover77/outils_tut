/**
 * Word to XML Moodle Converter
 * Convertit des QCM Word en XML Moodle avec corrections automatiques
 */

class WordToMoodleConverter {
    constructor() {
        this.questions = [];
        this.corrections = [];
        this.correctionsDetected = false;
        this.xmlContent = '';
        this.imageCounter = 0; // Compteur pour nommer les images
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const fileInput = document.getElementById('word-file');
        const dropZone = document.getElementById('drop-zone');
        const btnGenerate = document.getElementById('btn-generate');
        const btnClear = document.getElementById('btn-clear');

        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        btnGenerate.addEventListener('click', () => this.generateXML());
        btnClear.addEventListener('click', () => this.clearAll());

        // Drag & drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                this.processFile(files[0]);
            }
        });
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        if (!file.name.match(/\.(docx|doc)$/i)) {
            this.log('Erreur: Seuls les fichiers .docx et .doc sont acceptes', 'error');
            return;
        }

        document.getElementById('file-name').textContent = file.name;
        this.log(`Chargement de ${file.name}...`, 'info');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            const text = result.value;

            // Separer QCM et corrections
            const { qcmText, correctionsText } = this.splitQcmAndCorrections(text);

            // Parser les corrections
            if (correctionsText) {
                this.corrections = this.parseCorrections(correctionsText);
                this.correctionsDetected = this.corrections.length > 0;
                this.log(`${this.corrections.length} correction(s) detectee(s)`, 'success');
            } else {
                this.corrections = [];
                this.correctionsDetected = false;
            }

            // Parser les questions
            this.parseQuestions(qcmText);

            // Appliquer les corrections
            if (this.correctionsDetected) {
                this.applyCorrectionsToQuestions();
            }

            // Afficher
            this.displayCorrectionsPreview();
            this.displayQuestions();
            this.showSections();

            this.log(`${this.questions.length} question(s) extraite(s)`, 'success');

        } catch (error) {
            console.error(error);
            this.log(`Erreur: ${error.message}`, 'error');
        }
    }

    splitQcmAndCorrections(text) {
        const lines = text.split('\n');
        let correctionIndex = -1;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().toLowerCase() === 'correction') {
                correctionIndex = i;
                break;
            }
        }

        if (correctionIndex === -1) {
            return { qcmText: text, correctionsText: null };
        }

        const qcmText = lines.slice(0, correctionIndex).join('\n');
        const correctionsText = lines.slice(correctionIndex + 1).join('\n');

        return { qcmText, correctionsText };
    }

    parseCorrections(correctionsText) {
        const corrections = [];
        if (!correctionsText) return corrections;

        const lines = correctionsText.split('\n');
        let currentCorrection = null;
        let currentFeedbackLines = [];

        const qcmPattern = /^QCM\s*(\d+)\s*[-–:]\s*([A-E]+)/i;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const match = trimmedLine.match(qcmPattern);
            if (match) {
                if (currentCorrection !== null) {
                    currentCorrection.feedback = currentFeedbackLines.join('\n').trim();
                    corrections.push(currentCorrection);
                }

                currentCorrection = {
                    qcm_number: parseInt(match[1]),
                    correct_answers: match[2].toUpperCase().split(''),
                    feedback: ''
                };
                currentFeedbackLines = [];
            } else {
                if (currentCorrection !== null) {
                    currentFeedbackLines.push(trimmedLine);
                }
            }
        }

        if (currentCorrection !== null) {
            currentCorrection.feedback = currentFeedbackLines.join('\n').trim();
            corrections.push(currentCorrection);
        }

        return corrections;
    }

    parseQuestions(text) {
        this.questions = [];
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        let i = 0;
        let questionNumber = 1;

        while (i < lines.length) {
            if (i + 5 < lines.length) {
                const question = {
                    id: questionNumber,
                    title: lines[i],
                    titleImage: null, // {data: base64, name: filename, type: mimetype}
                    generalFeedback: '',
                    feedbackImage: null, // {data: base64, name: filename, type: mimetype}
                    answers: [
                        { text: lines[i + 1], letter: 'A', isCorrect: false, image: null },
                        { text: lines[i + 2], letter: 'B', isCorrect: false, image: null },
                        { text: lines[i + 3], letter: 'C', isCorrect: false, image: null },
                        { text: lines[i + 4], letter: 'D', isCorrect: false, image: null },
                        { text: lines[i + 5], letter: 'E', isCorrect: false, image: null }
                    ]
                };

                this.questions.push(question);
                questionNumber++;
                i += 6;

                while (i < lines.length && lines[i].trim() === '') {
                    i++;
                }
            } else {
                break;
            }
        }
    }

    applyCorrectionsToQuestions() {
        for (let idx = 0; idx < this.questions.length && idx < this.corrections.length; idx++) {
            const question = this.questions[idx];
            const correction = this.corrections[idx];

            question.answers.forEach((answer) => {
                answer.isCorrect = correction.correct_answers.includes(answer.letter);
            });

            if (correction.feedback) {
                question.generalFeedback = correction.feedback;
            }
        }
    }

    displayCorrectionsPreview() {
        const section = document.getElementById('corrections-section');
        const container = document.getElementById('corrections-preview');

        if (!this.correctionsDetected || this.corrections.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        container.innerHTML = `
            <div class="banks-stats" style="margin-bottom: var(--spacing-md);">
                ${this.corrections.map((corr, idx) => `
                    <div class="stat-card" style="text-align: left;">
                        <span class="stat-label" style="display: block; margin-bottom: 4px;">Question ${idx + 1}</span>
                        <span class="stat-value" style="font-size: 1.25rem;">${corr.correct_answers.join(', ')}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    displayQuestions() {
        const container = document.getElementById('questions-container');
        container.innerHTML = '';

        this.questions.forEach((question, qIdx) => {
            const div = document.createElement('div');
            div.className = 'question-card';
            div.style.cssText = 'background: var(--code-bg); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--spacing-md); margin-bottom: var(--spacing-md);';

            div.innerHTML = `
                <div style="margin-bottom: var(--spacing-sm);">
                    <strong style="color: var(--prompt-color);">Question ${question.id}</strong>
                    <span style="opacity: 0.7; font-size: 0.875rem;"> - ${this.escapeHtml(question.title)}</span>
                </div>

                <!-- Image pour l'enonce -->
                <div class="image-control" style="margin-bottom: var(--spacing-md); padding: var(--spacing-sm); border: 1px dashed var(--border-color); border-radius: var(--radius-sm);">
                    <label style="display: flex; align-items: center; gap: var(--spacing-sm); cursor: pointer;">
                        <input type="checkbox"
                               id="q${qIdx}_title_img_check"
                               ${question.titleImage ? 'checked' : ''}
                               onchange="converter.toggleImageInput(${qIdx}, 'title', this.checked)">
                        <span style="font-size: 0.8rem;">Ajouter une image a l'enonce</span>
                    </label>
                    <div id="q${qIdx}_title_img_container" style="display: ${question.titleImage ? 'block' : 'none'}; margin-top: var(--spacing-sm);">
                        <input type="file"
                               id="q${qIdx}_title_img"
                               accept="image/*"
                               onchange="converter.handleImageUpload(${qIdx}, 'title', this.files[0])"
                               style="font-size: 0.75rem;">
                        ${question.titleImage ? `<div style="margin-top: 4px;"><img src="${question.titleImage.data}" style="max-width: 150px; max-height: 100px; border-radius: 4px;"><span style="font-size: 0.7rem; margin-left: 8px; opacity: 0.7;">${question.titleImage.name}</span></div>` : ''}
                    </div>
                </div>

                <!-- Reponses avec images -->
                <div style="margin-bottom: var(--spacing-sm);">
                    ${question.answers.map((answer, aIdx) => `
                        <div style="margin-bottom: var(--spacing-sm); padding: var(--spacing-sm); border-radius: var(--radius-sm); ${answer.isCorrect ? 'background: rgba(152, 195, 121, 0.2); border: 1px solid var(--success);' : 'border: 1px solid var(--border-color);'}">
                            <label style="display: flex; align-items: center; gap: var(--spacing-sm); cursor: pointer;">
                                <input type="checkbox"
                                       id="q${qIdx}_a${aIdx}"
                                       ${answer.isCorrect ? 'checked' : ''}
                                       onchange="converter.toggleAnswer(${qIdx}, ${aIdx}, this.checked)">
                                <span style="color: var(--accent); font-weight: bold;">${answer.letter}</span>
                                <span style="font-size: 0.8rem; opacity: 0.9; flex: 1;">${this.escapeHtml(answer.text)}</span>
                            </label>
                            <div style="margin-top: var(--spacing-xs); margin-left: 24px;">
                                <label style="display: flex; align-items: center; gap: var(--spacing-sm); cursor: pointer;">
                                    <input type="checkbox"
                                           id="q${qIdx}_a${aIdx}_img_check"
                                           ${answer.image ? 'checked' : ''}
                                           onchange="converter.toggleImageInput(${qIdx}, 'answer', this.checked, ${aIdx})">
                                    <span style="font-size: 0.7rem; opacity: 0.7;">+ Image</span>
                                </label>
                                <div id="q${qIdx}_a${aIdx}_img_container" style="display: ${answer.image ? 'block' : 'none'}; margin-top: 4px;">
                                    <input type="file"
                                           id="q${qIdx}_a${aIdx}_img"
                                           accept="image/*"
                                           onchange="converter.handleImageUpload(${qIdx}, 'answer', this.files[0], ${aIdx})"
                                           style="font-size: 0.7rem;">
                                    ${answer.image ? `<div style="margin-top: 4px;"><img src="${answer.image.data}" style="max-width: 100px; max-height: 60px; border-radius: 4px;"><span style="font-size: 0.65rem; margin-left: 4px; opacity: 0.7;">${answer.image.name}</span></div>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Feedback avec image -->
                <div>
                    <label style="font-size: 0.75rem; opacity: 0.7;">Feedback general :</label>
                    <textarea id="feedback_${qIdx}"
                              style="width: 100%; min-height: 60px; margin-top: 4px;"
                              onchange="converter.updateFeedback(${qIdx}, this.value)"
                              placeholder="Justification affichee apres la reponse...">${this.escapeHtml(question.generalFeedback)}</textarea>

                    <div style="margin-top: var(--spacing-sm);">
                        <label style="display: flex; align-items: center; gap: var(--spacing-sm); cursor: pointer;">
                            <input type="checkbox"
                                   id="q${qIdx}_feedback_img_check"
                                   ${question.feedbackImage ? 'checked' : ''}
                                   onchange="converter.toggleImageInput(${qIdx}, 'feedback', this.checked)">
                            <span style="font-size: 0.7rem; opacity: 0.7;">Ajouter une image au feedback</span>
                        </label>
                        <div id="q${qIdx}_feedback_img_container" style="display: ${question.feedbackImage ? 'block' : 'none'}; margin-top: 4px;">
                            <input type="file"
                                   id="q${qIdx}_feedback_img"
                                   accept="image/*"
                                   onchange="converter.handleImageUpload(${qIdx}, 'feedback', this.files[0])"
                                   style="font-size: 0.7rem;">
                            ${question.feedbackImage ? `<div style="margin-top: 4px;"><img src="${question.feedbackImage.data}" style="max-width: 100px; max-height: 60px; border-radius: 4px;"><span style="font-size: 0.65rem; margin-left: 4px; opacity: 0.7;">${question.feedbackImage.name}</span></div>` : ''}
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(div);
        });
    }

    toggleAnswer(qIdx, aIdx, isCorrect) {
        this.questions[qIdx].answers[aIdx].isCorrect = isCorrect;
        this.displayQuestions();
    }

    updateFeedback(qIdx, feedback) {
        this.questions[qIdx].generalFeedback = feedback;
    }

    toggleImageInput(qIdx, type, show, aIdx = null) {
        let containerId;
        if (type === 'title') {
            containerId = `q${qIdx}_title_img_container`;
        } else if (type === 'feedback') {
            containerId = `q${qIdx}_feedback_img_container`;
        } else if (type === 'answer') {
            containerId = `q${qIdx}_a${aIdx}_img_container`;
        }

        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = show ? 'block' : 'none';
        }

        // Si on decoche, supprimer l'image
        if (!show) {
            if (type === 'title') {
                this.questions[qIdx].titleImage = null;
            } else if (type === 'feedback') {
                this.questions[qIdx].feedbackImage = null;
            } else if (type === 'answer') {
                this.questions[qIdx].answers[aIdx].image = null;
            }
        }
    }

    async handleImageUpload(qIdx, type, file, aIdx = null) {
        if (!file) return;

        // Verifier le type de fichier
        if (!file.type.startsWith('image/')) {
            this.log('Erreur: Seuls les fichiers image sont acceptes', 'error');
            return;
        }

        // Verifier la taille (max 5 MB)
        if (file.size > 5 * 1024 * 1024) {
            this.log('Erreur: L\'image ne doit pas depasser 5 MB', 'error');
            return;
        }

        try {
            const base64Data = await this.readFileAsBase64(file);
            const imageData = {
                data: base64Data,
                name: file.name,
                type: file.type
            };

            if (type === 'title') {
                this.questions[qIdx].titleImage = imageData;
            } else if (type === 'feedback') {
                this.questions[qIdx].feedbackImage = imageData;
            } else if (type === 'answer') {
                this.questions[qIdx].answers[aIdx].image = imageData;
            }

            this.log(`Image "${file.name}" ajoutee`, 'success');
            this.displayQuestions();
        } catch (error) {
            this.log(`Erreur lors du chargement de l'image: ${error.message}`, 'error');
        }
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
            reader.readAsDataURL(file);
        });
    }

    showSections() {
        document.getElementById('questions-section').style.display = 'block';
        document.getElementById('options-section').style.display = 'block';
        document.getElementById('actions-section').style.display = 'block';
    }

    generateXML() {
        if (this.questions.length === 0) {
            this.log('Aucune question a convertir', 'error');
            return;
        }

        // Verifier qu'il y a au moins une reponse correcte par question
        for (let i = 0; i < this.questions.length; i++) {
            const hasCorrect = this.questions[i].answers.some(a => a.isCorrect);
            if (!hasCorrect) {
                this.log(`Erreur: Question ${i + 1} n'a pas de reponse correcte`, 'error');
                return;
            }
        }

        const categoryName = document.getElementById('category-name').value || 'Questions';
        const filename = document.getElementById('output-filename').value || 'moodle_questions.xml';

        this.xmlContent = this.createMoodleXML(categoryName);
        this.downloadXML(filename);
        this.log(`Fichier ${filename} genere avec succes!`, 'success');
    }

    createMoodleXML(categoryName) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n';
        this.imageCounter = 0;

        // Categorie
        xml += `  <question type="category">\n`;
        xml += `    <category>\n`;
        xml += `      <text>$course$/top/${this.escapeXML(categoryName)}</text>\n`;
        xml += `    </category>\n`;
        xml += `  </question>\n`;

        // Questions
        this.questions.forEach((question, index) => {
            xml += `  <question type="multichoice">\n`;
            xml += `    <name>\n`;
            xml += `      <text><![CDATA[Question ${index + 1}]]></text>\n`;
            xml += `    </name>\n`;

            // Questiontext avec image optionnelle
            const questionTextContent = this.buildTextWithImage(
                question.title,
                question.titleImage
            );
            xml += `    <questiontext format="html">\n`;
            xml += `      <text><![CDATA[${questionTextContent.html}]]></text>\n`;
            if (questionTextContent.file) {
                xml += questionTextContent.file;
            }
            xml += `    </questiontext>\n`;

            // Generalfeedback avec image optionnelle
            const feedbackContent = this.buildTextWithImage(
                question.generalFeedback,
                question.feedbackImage
            );
            xml += `    <generalfeedback format="html">\n`;
            xml += `      <text><![CDATA[${feedbackContent.html}]]></text>\n`;
            if (feedbackContent.file) {
                xml += feedbackContent.file;
            }
            xml += `    </generalfeedback>\n`;

            xml += `    <defaultgrade>1.0000000</defaultgrade>\n`;
            xml += `    <penalty>0.3333333</penalty>\n`;
            xml += `    <hidden>0</hidden>\n`;
            xml += `    <single>false</single>\n`;
            xml += `    <shuffleanswers>true</shuffleanswers>\n`;
            xml += `    <answernumbering>abc</answernumbering>\n`;

            const correctAnswers = question.answers.filter(a => a.isCorrect);
            const correctFraction = correctAnswers.length > 0 ? (100 / correctAnswers.length) : 0;

            question.answers.forEach((answer) => {
                const fraction = answer.isCorrect ? correctFraction : 0;

                // Reponse avec image optionnelle
                const answerContent = this.buildTextWithImage(
                    answer.text,
                    answer.image
                );

                xml += `    <answer fraction="${fraction}" format="html">\n`;
                xml += `      <text><![CDATA[${answerContent.html}]]></text>\n`;
                if (answerContent.file) {
                    xml += answerContent.file;
                }
                xml += `      <feedback format="html">\n`;
                xml += `        <text></text>\n`;
                xml += `      </feedback>\n`;
                xml += `    </answer>\n`;
            });

            xml += `  </question>\n`;
        });

        xml += '</quiz>';
        return xml;
    }

    buildTextWithImage(text, imageData) {
        let html = this.escapeXML(text || '');
        let file = null;

        if (imageData && imageData.data) {
            // Extraire les donnees base64 pures (sans le prefixe data:...)
            const base64Pure = imageData.data.split(',')[1] || imageData.data;
            const imageName = this.sanitizeFileName(imageData.name);

            // Ajouter l'image dans le HTML
            html += `<br><img src="@@PLUGINFILE@@/${imageName}" alt="" role="presentation" class="img-responsive">`;

            // Creer la balise file
            file = `      <file name="${imageName}" path="/" encoding="base64">${base64Pure}</file>\n`;
        }

        return { html, file };
    }

    sanitizeFileName(name) {
        // Nettoyer le nom de fichier pour eviter les problemes
        return name
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/__+/g, '_');
    }

    downloadXML(filename) {
        const blob = new Blob([this.xmlContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clearAll() {
        this.questions = [];
        this.corrections = [];
        this.correctionsDetected = false;
        this.xmlContent = '';
        this.imageCounter = 0;

        document.getElementById('word-file').value = '';
        document.getElementById('file-name').textContent = '';
        document.getElementById('corrections-section').style.display = 'none';
        document.getElementById('questions-section').style.display = 'none';
        document.getElementById('options-section').style.display = 'none';
        document.getElementById('actions-section').style.display = 'none';
        document.getElementById('log-output').innerHTML = '';
        document.getElementById('questions-container').innerHTML = '';
        document.getElementById('corrections-preview').innerHTML = '';

        this.log('Tout a ete efface', 'info');
    }

    log(message, type = 'info') {
        const logOutput = document.getElementById('log-output');
        const line = document.createElement('div');
        line.className = `log-line ${type}`;

        const prefix = {
            'info': '[INFO]',
            'success': '[OK]',
            'error': '[ERR]',
            'warning': '[WARN]'
        };

        line.innerHTML = `<span>${prefix[type] || '[LOG]'}</span> ${this.escapeHtml(message)}`;
        logOutput.appendChild(line);
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeXML(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Instance globale
let converter;

document.addEventListener('DOMContentLoaded', () => {
    converter = new WordToMoodleConverter();
});
