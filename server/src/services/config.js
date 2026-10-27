const state = {
  intervalHours: 3,      // период запуска парсера (корректируется)
  sourceDir: './data',   // папка с Excel-файлами
};

export function getConfig() {
  return { ...state };
}

export function updateConfig(patch) {
  if (patch.intervalHours !== undefined) state.intervalHours = Number(patch.intervalHours);
  if (patch.sourceDir !== undefined) state.sourceDir = patch.sourceDir;
  return getConfig();
}
