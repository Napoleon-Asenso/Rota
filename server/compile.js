const ts = require('typescript');
const path = require('path');

const configPath = path.resolve(__dirname, 'tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  __dirname
);

parsedConfig.options.skipLibCheck = true;

console.log(`[TypeScript] Compiling ${parsedConfig.fileNames.length} files...`);
const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
const emitResult = program.emit();

const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
const errors = diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error);

if (errors.length > 0) {
  errors.forEach((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    console.error(d.file ? `${d.file.fileName}: ${msg}` : msg);
  });
  console.error(`[TypeScript] Build failed with ${errors.length} error(s).`);
  process.exit(1);
} else {
  console.log('[TypeScript] Clean compilation! 0 errors. All files emitted to dist/.');
  process.exit(0);
}
