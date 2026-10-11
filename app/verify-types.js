const ts = require('../server/node_modules/typescript');
const path = require('path');
const fs = require('fs');

console.log('[Mobile App] Verifying TypeScript types across all 19 screens and components...');

const configPath = path.resolve(__dirname, 'tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  __dirname
);

parsedConfig.options.skipLibCheck = true;
parsedConfig.options.noEmit = true;

// Ensure server/node_modules/typescript doesn't get confused
const filesToVerify = [
  path.resolve(__dirname, 'App.tsx'),
  path.resolve(__dirname, 'theme/tokens.ts'),
  path.resolve(__dirname, 'src/theme/tokens.ts'),
  path.resolve(__dirname, 'src/theme/ThemeContext.tsx'),
  path.resolve(__dirname, 'src/storage/store.ts'),
  path.resolve(__dirname, 'src/components/Text.tsx'),
  path.resolve(__dirname, 'src/components/Button.tsx'),
  path.resolve(__dirname, 'src/components/Input.tsx'),
  path.resolve(__dirname, 'src/components/Card.tsx'),
  path.resolve(__dirname, 'src/components/Badge.tsx'),
  path.resolve(__dirname, 'src/components/Chip.tsx'),
  path.resolve(__dirname, 'src/components/PushNotificationModal.tsx'),
  path.resolve(__dirname, 'src/components/feed/LoadingState.tsx'),
  path.resolve(__dirname, 'src/components/feed/EmptyState.tsx'),
  path.resolve(__dirname, 'src/components/feed/EndOfListState.tsx'),
  path.resolve(__dirname, 'src/components/feed/ErrorState.tsx'),
  path.resolve(__dirname, 'src/components/feed/InfiniteScrollFooter.tsx'),
  path.resolve(__dirname, 'src/navigation/index.ts'),
  path.resolve(__dirname, 'src/screens/WelcomeScreen.tsx'),
  path.resolve(__dirname, 'src/screens/SplashScreen.tsx'),
  path.resolve(__dirname, 'src/screens/SignUpScreen.tsx'),
  path.resolve(__dirname, 'src/screens/LoginScreen.tsx'),
  path.resolve(__dirname, 'src/screens/InviteMembersScreen.tsx'),
  path.resolve(__dirname, 'src/screens/TeamMembersScreen.tsx'),
  path.resolve(__dirname, 'src/screens/SubscriptionBillingScreen.tsx'),
  path.resolve(__dirname, 'src/screens/ShiftCalendarScreen.tsx'),
  path.resolve(__dirname, 'src/screens/ActivityFeedScreen.tsx'),
  path.resolve(__dirname, 'src/screens/RequestSwapScreen.tsx'),
  path.resolve(__dirname, 'src/screens/PushNotificationSettingsScreen.tsx'),
  path.resolve(__dirname, 'src/screens/NotificationSettingsScreen.tsx'),
  path.resolve(__dirname, 'src/screens/UserSettingsScreen.tsx'),
  path.resolve(__dirname, 'src/screens/OfflineViewingScreen.tsx'),
  path.resolve(__dirname, 'src/screens/OfflineUpcomingShiftsScreen.tsx'),
  path.resolve(__dirname, 'src/screens/FeedLoadingStateScreen.tsx'),
  path.resolve(__dirname, 'src/screens/FeedEmptyStateScreen.tsx'),
  path.resolve(__dirname, 'src/screens/FeedEndOfListScreen.tsx'),
  path.resolve(__dirname, 'src/screens/FeedErrorStateScreen.tsx'),
  path.resolve(__dirname, 'src/screens/FeedInfiniteScrollScreen.tsx'),
  path.resolve(__dirname, 'src/screens/OptimisticUpdateScreen.tsx'),
  path.resolve(__dirname, 'src/screens/SwapDetailReviewScreen.tsx')
];

console.log(`[Mobile App] Verified all ${filesToVerify.length} required design files exist:`);
filesToVerify.forEach(f => {
  if (!fs.existsSync(f)) {
    console.error(`Missing file: ${f}`);
    process.exit(1);
  }
});

console.log('[Mobile App] Running full TypeScript compiler typecheck...');
const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
const emitResult = program.emit();
const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

let hasErrors = false;
allDiagnostics.forEach((diagnostic) => {
  if (diagnostic.category === ts.DiagnosticCategory.Error) {
    hasErrors = true;
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      console.error(`TS Error in ${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.error(`TS Error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
    }
  }
});

if (hasErrors) {
  console.error('[Mobile App] TypeScript typecheck FAILED with errors.');
  process.exit(1);
}

console.log('[Mobile App] TypeScript typecheck PASSED with ZERO errors!');

