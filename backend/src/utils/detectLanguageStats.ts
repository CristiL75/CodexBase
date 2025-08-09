const extensionToLanguage: Record<string, string> = {
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

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return extensionToLanguage[ext] || "Other";
}

export function getLanguageStats(files: { name: string, content: string }[]) {
  const stats: Record<string, number> = {};
  let totalLines = 0;
  for (const file of files) {
    const lang = getLanguageFromFilename(file.name);
    const lines = file.content.split('\n').length;
    stats[lang] = (stats[lang] || 0) + lines;
    totalLines += lines;
  }
  // Calculează procentajele
  const result: Record<string, number> = {};
  for (const lang in stats) {
    result[lang] = Math.round((stats[lang] / totalLines) * 100);
  }
  return result;
}