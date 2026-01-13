// Main JavaScript - Theme toggle and utilities

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
});

// Theme Management
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';

    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '◐' : '◑';
    }
}

// Logging utility
class Logger {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    log(message, type = '') {
        if (!this.container) return;

        const line = document.createElement('div');
        line.className = `log-line ${type}`;

        const prefix = type === 'success' ? '✓' :
                      type === 'error' ? '✗' :
                      type === 'warning' ? '⚠' :
                      type === 'info' ? 'ℹ' : '$';

        line.innerHTML = `<span class="prompt">${prefix}</span> ${this.escapeHtml(message)}`;
        this.container.appendChild(line);
        this.container.scrollTop = this.container.scrollHeight;
    }

    success(message) { this.log(message, 'success'); }
    error(message) { this.log(message, 'error'); }
    warning(message) { this.log(message, 'warning'); }
    info(message) { this.log(message, 'info'); }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// File utilities
function setupFileInput(inputId, callback, options = {}) {
    const input = document.getElementById(inputId);
    const wrapper = input?.closest('.file-input-wrapper');

    if (!input) return;

    input.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            callback(options.multiple ? Array.from(files) : files[0]);
        }
    });

    if (wrapper) {
        wrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            wrapper.classList.add('dragover');
        });

        wrapper.addEventListener('dragleave', () => {
            wrapper.classList.remove('dragover');
        });

        wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            wrapper.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                callback(options.multiple ? Array.from(files) : files[0]);
            }
        });
    }
}

function updateFileName(elementId, name) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = name || '';
    }
}

// Download utilities
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
}

function downloadXLSX(workbook, filename) {
    XLSX.writeFile(workbook, filename);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Excel utilities using SheetJS
async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                resolve(workbook);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function sheetToArray(sheet, options = {}) {
    return XLSX.utils.sheet_to_json(sheet, { header: 1, ...options });
}

function sheetToObjects(sheet, options = {}) {
    return XLSX.utils.sheet_to_json(sheet, options);
}

// Moodle API Client
class MoodleAPI {
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
        this.token = token;
    }

    /**
     * Call a Moodle web service function.
     * @param {string} wsfunction - The web service function name
     * @param {object} params - Additional parameters
     * @returns {Promise<object>} - The API response
     */
    async call(wsfunction, params = {}) {
        const url = `${this.baseUrl}/webservice/rest/server.php`;

        const formData = new URLSearchParams();
        formData.append('wstoken', this.token);
        formData.append('wsfunction', wsfunction);
        formData.append('moodlewsrestformat', 'json');

        // Add additional parameters
        for (const [key, value] of Object.entries(params)) {
            formData.append(key, value);
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        // Check for Moodle error response
        if (data.exception) {
            throw new Error(data.message || data.exception);
        }

        return data;
    }

    /**
     * Test the connection to Moodle.
     * @returns {Promise<object>} - Connection info if successful
     */
    async testConnection() {
        // Use getCourses to test connection since core_webservice_get_site_info
        // may not be available in the Question Importer service
        const courses = await this.call('local_questionimporter_get_courses');
        return {
            success: true,
            sitename: 'Moodle',
            fullname: 'Utilisateur connecté',
            coursecount: courses.length
        };
    }

    /**
     * Get list of courses the user can import questions to.
     * @returns {Promise<array>} - List of courses
     */
    async getCourses() {
        return this.call('local_questionimporter_get_courses');
    }

    /**
     * Get question categories for a course.
     * @param {number} courseId - The course ID
     * @returns {Promise<array>} - List of question categories
     */
    async getQuestionCategories(courseId) {
        return this.call('local_questionimporter_get_question_categories', {
            courseid: courseId,
        });
    }

    /**
     * Import questions from XML content.
     * @param {number} categoryId - Target question category ID
     * @param {string} xmlContent - The XML content (will be base64 encoded)
     * @returns {Promise<object>} - Import result
     */
    async importQuestions(categoryId, xmlContent) {
        // Base64 encode the XML content
        const base64Content = btoa(unescape(encodeURIComponent(xmlContent)));

        return this.call('local_questionimporter_import_questions', {
            categoryid: categoryId,
            xmlcontent: base64Content,
        });
    }
}

// Moodle Settings Manager
class MoodleSettings {
    static STORAGE_KEY = 'moodle_settings';
    static TOKEN_KEY = 'moodle_token';

    /**
     * Save Moodle settings (URL only - token stored separately in sessionStorage).
     * @param {object} settings - { url: string }
     */
    static save(settings) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
            url: settings.url,
        }));
    }

    /**
     * Save the token to sessionStorage (more secure - cleared on browser close).
     * @param {string} token - The Moodle API token
     */
    static saveToken(token) {
        sessionStorage.setItem(this.TOKEN_KEY, token);
    }

    /**
     * Load saved settings.
     * @returns {object} - { url: string, token: string }
     */
    static load() {
        const saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        const token = sessionStorage.getItem(this.TOKEN_KEY) || '';
        return {
            url: saved.url || '',
            token: token,
        };
    }

    /**
     * Clear all saved settings.
     */
    static clear() {
        localStorage.removeItem(this.STORAGE_KEY);
        sessionStorage.removeItem(this.TOKEN_KEY);
    }

    /**
     * Check if settings are configured.
     * @returns {boolean}
     */
    static isConfigured() {
        const settings = this.load();
        return !!(settings.url && settings.token);
    }
}
