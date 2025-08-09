"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguageFromFilename = getLanguageFromFilename;
exports.getLanguageStats = getLanguageStats;
const extensionToLanguage = {
    js: "JavaScript",
    jsx: "JavaScript",
    ts: "TypeScript",
    tsx: "TypeScript",
    py: "Python",
    java: "Java",
    cpp: "C++",
    cc: "C++",
    cxx: "C++",
    c: "C",
    h: "C",
    hpp: "C++",
    cs: "C#",
    rb: "Ruby",
    php: "PHP",
    go: "Go",
    rs: "Rust",
    swift: "Swift",
    kt: "Kotlin",
    kts: "Kotlin",
    md: "Markdown",
    json: "JSON",
    html: "HTML",
    htm: "HTML",
    css: "CSS",
    scss: "SCSS",
    sass: "Sass",
    sh: "Shell",
    bash: "Shell",
    bat: "Batch",
    ps1: "PowerShell",
    yml: "YAML",
    yaml: "YAML",
    xml: "XML",
    dockerfile: "Dockerfile",
    makefile: "Makefile",
    txt: "Text",
    vue: "Vue",
    svelte: "Svelte",
    dart: "Dart",
    scala: "Scala",
    pl: "Perl",
    lua: "Lua",
    coffee: "CoffeeScript",
    sql: "SQL",
    ini: "INI",
    toml: "TOML",
    conf: "Config",
    env: "Config",
    lock: "Config",
    // adaugă ce extensii vrei
};
function getLanguageFromFilename(filename) {
    var _a;
    const ext = ((_a = filename.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
    return extensionToLanguage[ext] || "Other";
}
function getLanguageStats(files) {
    const stats = {};
    let totalLines = 0;
    for (const file of files) {
        const lang = getLanguageFromFilename(file.name);
        const lines = file.content.split('\n').length;
        stats[lang] = (stats[lang] || 0) + lines;
        totalLines += lines;
    }
    // Calculează procentajele
    const result = {};
    for (const lang in stats) {
        result[lang] = Math.round((stats[lang] / totalLines) * 100);
    }
    return result;
}
