# Graph Report - Framework  (2026-04-25)

## Corpus Check
- 3190 files · ~5,924,431 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 6169 nodes · 7242 edges · 62 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 1361 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]

## God Nodes (most connected - your core abstractions)
1. `normalizePrefix()` - 145 edges
2. `parse()` - 132 edges
3. `parseWebhookEvent()` - 102 edges
4. `normalizeActionInput()` - 101 edges
5. `verifyWebhookSignature()` - 101 edges
6. `mapProviderStatus()` - 101 edges
7. `createProviderAdapter()` - 101 edges
8. `normalizeIdentifier()` - 92 edges
9. `replace()` - 68 edges
10. `requireFile()` - 58 edges

## Surprising Connections (you probably didn't know these)
- `transitionWorkflowInstance()` --calls--> `getWorkflowTransition()`  [INFERRED]
  plugins/gutu-plugin-workflow-core/framework/builtin-plugins/workflow-core/src/services/main.service.ts → gutu-core/framework/core/jobs/src/index.ts
- `chunkMatchesPolicy()` --calls--> `parse()`  [INFERRED]
  libraries/gutu-lib-ai-memory/framework/libraries/ai-memory/src/index.ts → plugins/gutu-plugin-e-invoicing-core/scripts/docs-summary.mjs
- `deserializeSavedView()` --calls--> `parse()`  [INFERRED]
  libraries/gutu-lib-admin-listview/framework/libraries/admin-listview/src/index.ts → plugins/gutu-plugin-e-invoicing-core/scripts/docs-summary.mjs
- `createFormDefaults()` --calls--> `parse()`  [INFERRED]
  libraries/gutu-lib-ui-form/framework/libraries/ui-form/src/index.ts → plugins/gutu-plugin-e-invoicing-core/scripts/docs-summary.mjs
- `loadJsonState()` --calls--> `seedFactory()`  [INFERRED]
  gutu-core/framework/core/business-runtime/src/index.ts → admin-panel/backend/src/seed/factory.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (164): bankAccounts(), bankTransactions(), budgets(), costCenters(), count(), currencyRates(), dunning(), fiscalYears() (+156 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (201): AgentBuilderPage(), AutomationInboxPage(), assertMemoryAccess(), buildRetrievalPlan(), chunkMatchesPolicy(), chunkMemoryDocument(), collectionMatchesPolicy(), createEventEnvelope() (+193 more)

### Community 2 - "Community 2"
Cohesion: 0.01
Nodes (70): fetchAll(), applyEncryption(), bufferUpTo(), concat(), fromS3StorageClass(), S3StorageAdapter, toS3StorageClass(), translateS3Error() (+62 more)

### Community 3 - "Community 3"
Cohesion: 0.01
Nodes (109): createActivationEngine(), addLeaf(), emit(), emptyLeaf(), isLeaf(), removeAt(), updateAt(), handleApply() (+101 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (125): countBadges(), parse(), formatRel(), FreshnessIndicator(), toMillis(), assertRepositoryBoundary(), calculateNextRunAt(), canUseFrameworkSymlink() (+117 more)

### Community 5 - "Community 5"
Cohesion: 0.02
Nodes (116): canLaunchZone(), canRunAction(), canSeeField(), canSeeWidget(), canUseBuilder(), canUseCommand(), canViewPage(), canViewReport() (+108 more)

### Community 6 - "Community 6"
Cohesion: 0.02
Nodes (132): buildAccountingCoreMigrationSql(), buildAccountingCoreRollbackSql(), buildAiAssistCoreMigrationSql(), buildAiAssistCoreRollbackSql(), buildAnalyticsBiCoreMigrationSql(), buildAnalyticsBiCoreRollbackSql(), buildAssetsCoreMigrationSql(), buildAssetsCoreRollbackSql() (+124 more)

### Community 7 - "Community 7"
Cohesion: 0.03
Nodes (119): buildAccountingCoreSqliteMigrationSql(), buildAccountingCoreSqliteRollbackSql(), buildAiAssistCoreSqliteMigrationSql(), buildAiAssistCoreSqliteRollbackSql(), buildAnalyticsBiCoreSqliteMigrationSql(), buildAnalyticsBiCoreSqliteRollbackSql(), buildAssetsCoreSqliteMigrationSql(), buildAssetsCoreSqliteRollbackSql() (+111 more)

### Community 8 - "Community 8"
Cohesion: 0.03
Nodes (120): checkCatalog(), checkPluginDocs(), main(), missingHeadings(), placeholderFailures(), buildImportList(), capitalize(), createDocsCheckScript() (+112 more)

### Community 9 - "Community 9"
Cohesion: 0.03
Nodes (95): cmdCreate(), cmdHelp(), cmdList(), cmdValidate(), die(), exists(), findIndex(), log() (+87 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (8): normalizeWebhookStatus(), parseGenericWebhookEvent(), readRecordField(), readStatusField(), readStringField(), safeJsonParse(), parseWebhookEvent(), verifyWebhookSignature()

### Community 11 - "Community 11"
Cohesion: 0.03
Nodes (81): stripPrefix(), copyRequestId(), sanitizeForHeader(), actionRequiredExample(), buildProviderRecord(), classifySupportLevel(), countSeriousImplementedOperations(), createFirstWaveReadinessReport() (+73 more)

### Community 12 - "Community 12"
Cohesion: 0.03
Nodes (4): amendRecord(), placeRecordOnHold(), releaseRecordHold(), reverseRecord()

### Community 13 - "Community 13"
Cohesion: 0.02
Nodes (2): createGeneratedProviderAdapter(), createProviderAdapter()

### Community 14 - "Community 14"
Cohesion: 0.02
Nodes (1): mapProviderStatus()

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (74): ActiveRunsWidget(), acknowledgeRunnerHandoff(), AgentBudgetExceededError, AgentReplayMismatchError, AgentToolDeniedError, appendAgentStep(), approveCheckpoint(), assertBudgetWithinLimits() (+66 more)

### Community 16 - "Community 16"
Cohesion: 0.05
Nodes (80): main(), read_cell_value(), read_shared_strings(), main(), runScenario(), buildDependencyContractsFromLists(), dedupeList(), deriveSuggestedPackIds() (+72 more)

### Community 17 - "Community 17"
Cohesion: 0.04
Nodes (53): AdminInner(), AppShell(), useLiveAudit(), AutomationRunDetailPage(), BookingDashboardKpis(), pct(), useRuntime(), CrmOverviewPage() (+45 more)

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (23): existsFile(), LocalStorageAdapter, nodeToWebStream(), renderPrefix(), exists(), findAdminPluginRoots(), walk(), collectStream() (+15 more)

### Community 19 - "Community 19"
Cohesion: 0.1
Nodes (3): checkPlaceholders(), requireFile(), requireHeadings()

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (49): createPaymentIdempotencyKey(), metricCard(), PaymentsOverviewAdminPage(), PaymentsProvidersAdminPage(), PaymentsRecordsAdminPage(), PaymentsRefundsAdminPage(), PaymentsWebhooksAdminPage(), renderMetricGrid() (+41 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (39): envEnum(), envFlag(), envInt(), loadConfig(), closeDbx(), dbx(), close(), fetch() (+31 more)

### Community 22 - "Community 22"
Cohesion: 0.05
Nodes (24): AnalyticsEmitterImpl, createAnalytics(), ensureSessionId(), createRuntime(), CapabilityRegistryImpl, createCapabilityRegistry(), createFeatureFlags(), FeatureFlagStoreImpl (+16 more)

### Community 23 - "Community 23"
Cohesion: 0.06
Nodes (39): AiProviderError, convertZodSchema(), createErrorResponse(), createMcpRuntimeOrchestrator(), createMcpRuntimeServer(), createMcpServerFromContracts(), createSchemaCacheEntry(), createSuccessResponse() (+31 more)

### Community 24 - "Community 24"
Cohesion: 0.05
Nodes (28): buildDomainPlugin(), buildResource(), detailViewFromZod(), if(), formViewFromZod(), humanize(), inferField(), unwrap() (+20 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (36): ErrorBoundary, compileDraft(), compileEmailDraft(), createCommunicationIdempotencyKey(), createLocalCommunicationProviderRegistry(), createRetryDecision(), defineCommunicationRoute(), defineInAppCompiler() (+28 more)

### Community 26 - "Community 26"
Cohesion: 0.08
Nodes (35): factory(), main(), renderMarkdownReport(), tailLines(), writeReports(), buildAdvanceInput(), buildCreateInput(), buildReconcileInput() (+27 more)

### Community 27 - "Community 27"
Cohesion: 0.1
Nodes (31): checkRegressionGate(), compareEvalRuns(), createEvalBaseline(), roundMetric(), runEvalDataset(), AiEvalsAdminPage(), buildEvalRunId(), captureEvalBaseline() (+23 more)

### Community 28 - "Community 28"
Cohesion: 0.15
Nodes (32): assertAuditHealthy(), assertCertificationHealthy(), assertConsumerSmokeHealthy(), copyCoreRoot(), copyRepoRoots(), createAuditReport(), createFileLockEntry(), discoverCorePackageIds() (+24 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (26): advances(), appraisals(), attendance(), count(), departments(), designations(), employees(), expenseClaims() (+18 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (18): buildPluginContext(), CapabilityError, createContributionStore(), makeAnalytics(), makeAssetResolver(), makeContributions(), makeI18n(), makeLogger() (+10 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (6): cn(), DashboardGrid(), MetricCard(), PageSection(), BuilderCanvas(), StatusBadge()

### Community 32 - "Community 32"
Cohesion: 0.08
Nodes (1): seedState()

### Community 33 - "Community 33"
Cohesion: 0.08
Nodes (1): BusinessAdminPage()

### Community 34 - "Community 34"
Cohesion: 0.17
Nodes (18): createNavigationContract(), findMatchingZone(), isPathPrefixMatch(), listDeepLinks(), matchesRoutePattern(), matchesZone(), normalizeHref(), resolveNavigationTarget() (+10 more)

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (9): AccessDenied, ChecksumMismatch, InvalidKey, isRetryableByDefault(), isStorageError(), ObjectNotFound, PayloadTooLarge, StorageError (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.2
Nodes (13): cannedResponses(), count(), csatResponses(), escalations(), kbArticles(), personName(), pick(), seedIf() (+5 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (5): fmt(), formatValue(), cn(), fmt(), fmt()

### Community 38 - "Community 38"
Cohesion: 0.26
Nodes (4): token(), uuid(), MockBackend, sleep()

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (6): ConfigurationError, NotSupportedError, PaymentError, ProviderError, TransportError, WebhookVerificationError

### Community 40 - "Community 40"
Cohesion: 0.18
Nodes (3): dealStageLabel(), pick(), dealStageIntent()

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (2): createShellQueryScope(), invalidateShellDeskQueries()

### Community 42 - "Community 42"
Cohesion: 0.43
Nodes (7): createPlatformTableOptions(), createPlatformTableState(), setPlatformColumnVisibility(), setPlatformFilter(), setPlatformSorting(), togglePlatformRowSelection(), usePlatformTable()

### Community 43 - "Community 43"
Cohesion: 0.32
Nodes (3): assertCoordinates(), calculateBoundingBox(), haversineDistanceKm()

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (3): loadPersonalization(), saveEdit(), savePersonalization()

### Community 45 - "Community 45"
Cohesion: 0.52
Nodes (6): globRoots(), listStandaloneRoots(), listTrackedOffenders(), listVisibleStandaloneStatus(), runGit(), safeList()

### Community 48 - "Community 48"
Cohesion: 0.43
Nodes (5): filterCommandPaletteItems(), groupCommandPaletteItems(), normalizeQuery(), PlatformCommandPalette(), rankCommandPaletteItems()

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (3): BarChart(), niceScale(), LineChart()

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (1): PluginBoundary

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (1): App()

### Community 52 - "Community 52"
Cohesion: 0.47
Nodes (3): getTheme(), setTheme(), toggleTheme()

### Community 53 - "Community 53"
Cohesion: 0.4
Nodes (2): createSplitWorkspaceFixture(), hasDirectorySymlinkSupport()

### Community 54 - "Community 54"
Cohesion: 0.6
Nodes (5): AdminShell(), getReactRuntime(), PortalShell(), ShellFrame(), SiteShell()

### Community 55 - "Community 55"
Cohesion: 0.47
Nodes (4): createAdminEditorPreset(), createReadOnlyEditorPreset(), ReadOnlyEditorRenderer(), renderReadOnlyEditorContent()

### Community 56 - "Community 56"
Cohesion: 0.5
Nodes (2): post(), setPosts()

### Community 58 - "Community 58"
Cohesion: 0.6
Nodes (3): addMoney(), sameCurrency(), subtractMoney()

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (2): attachRpcHandler(), spawnIframeSandbox()

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (2): attachWorkerRpc(), spawnWorkerSandbox()

### Community 64 - "Community 64"
Cohesion: 0.83
Nodes (3): createPlatformEditorConfig(), createPlatformEditorExtensions(), usePlatformEditor()

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (2): isSecretKey(), scrubConfig()

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (2): NavIcon(), toPascal()

### Community 70 - "Community 70"
Cohesion: 0.67
Nodes (1): activate()

## Knowledge Gaps
- **Thin community `Community 13`** (103 nodes): `createGeneratedProviderAdapter()`, `createProviderAdapter()`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (101 nodes): `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mapProviderStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (26 nodes): `seedState()`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (26 nodes): `BusinessAdminPage()`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (10 nodes): `createPlatformQueryClient()`, `createPlatformQueryKey()`, `createShellQueryScope()`, `invalidatePlatformScopes()`, `invalidateShellDeskQueries()`, `primePlatformQuery()`, `resetTenantScopedQueries()`, `usePlatformMutation()`, `usePlatformQuery()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (6 nodes): `PluginBoundary.tsx`, `DefaultFallback()`, `PluginBoundary`, `.componentDidCatch()`, `.getDerivedStateFromError()`, `.render()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (6 nodes): `App.tsx`, `App()`, `App.tsx`, `App.tsx`, `App.tsx`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (6 nodes): `package.test.ts`, `package.test.ts`, `createFrameworkSourceFixture()`, `createIo()`, `createSplitWorkspaceFixture()`, `hasDirectorySymlinkSupport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (5 nodes): `community-pages.tsx`, `action()`, `on()`, `post()`, `setPosts()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (4 nodes): `iframeSandbox.tsx`, `attachRpcHandler()`, `dispatchRpc()`, `spawnIframeSandbox()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (4 nodes): `workerSandbox.ts`, `attachWorkerRpc()`, `dispatchWorkerRpc()`, `spawnWorkerSandbox()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (3 nodes): `storage.ts`, `isSecretKey()`, `scrubConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (3 nodes): `NavIcon.tsx`, `NavIcon()`, `toPascal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (3 nodes): `plugin.tsx`, `plugin.tsx`, `activate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `parse()` connect `Community 4` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 44`, `Community 13`, `Community 15`, `Community 18`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 28`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `replace()` connect `Community 11` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 9`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 21`, `Community 24`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 38`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `normalizeActionInput()` connect `Community 1` to `Community 4`, `Community 5`, `Community 9`, `Community 11`, `Community 15`, `Community 20`, `Community 23`, `Community 27`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 75 inferred relationships involving `parse()` (e.g. with `readGutuPlugins()` and `parseStorageBackendsEnv()`) actually correct?**
  _`parse()` has 75 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `parseWebhookEvent()` (e.g. with `ingestWebhookEvent()` and `parseGenericWebhookEvent()`) actually correct?**
  _`parseWebhookEvent()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 99 inferred relationships involving `normalizeActionInput()` (e.g. with `parse()` and `publishBusinessMessage()`) actually correct?**
  _`normalizeActionInput()` has 99 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._