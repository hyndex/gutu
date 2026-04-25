# Graph Report - Framework  (2026-04-25)

## Corpus Check
- 3312 files · ~6,033,301 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 6792 nodes · 8750 edges · 65 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 2056 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]

## God Nodes (most connected - your core abstractions)
1. `parse()` - 157 edges
2. `normalizePrefix()` - 145 edges
3. `String()` - 142 edges
4. `parseWebhookEvent()` - 102 edges
5. `normalizeActionInput()` - 101 edges
6. `verifyWebhookSignature()` - 101 edges
7. `mapProviderStatus()` - 101 edges
8. `createProviderAdapter()` - 101 edges
9. `normalizeIdentifier()` - 92 edges
10. `replace()` - 88 edges

## Surprising Connections (you probably didn't know these)
- `handleCopyLink()` --calls--> `writeText()`  [INFERRED]
  admin-panel/src/editor-host/ShareDialog.tsx → libraries/gutu-lib-payments/scripts/generate-payments.mjs
- `String()` --calls--> `escapeTsString()`  [INFERRED]
  admin-panel/src/examples/_factory/detailFromZod.tsx → tooling/plugin-docs/generate.mjs
- `assertUnsupportedOperation()` --calls--> `String()`  [INFERRED]
  libraries/gutu-lib-payments/framework/libraries/payments-core/src/testing.ts → admin-panel/src/examples/_factory/detailFromZod.tsx
- `chunkMatchesPolicy()` --calls--> `parse()`  [INFERRED]
  libraries/gutu-lib-ai-memory/framework/libraries/ai-memory/src/index.ts → plugins/gutu-plugin-e-invoicing-core/scripts/docs-summary.mjs
- `deserializeSavedView()` --calls--> `parse()`  [INFERRED]
  libraries/gutu-lib-admin-listview/framework/libraries/admin-listview/src/index.ts → plugins/gutu-plugin-e-invoicing-core/scripts/docs-summary.mjs

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (256): accessibleRecordIds(), effectiveRole(), grantAcl(), listAcl(), purgeAclForRecord(), revokeAcl(), roleAtLeast(), roleFromLinkToken() (+248 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (206): AgentBuilderPage(), AutomationInboxPage(), assertMemoryAccess(), buildRetrievalPlan(), chunkMatchesPolicy(), chunkMemoryDocument(), cloneLink(), clonePrimaryRecordLike() (+198 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (129): exists(), contextUser(), isRecord(), normalizeEvent(), sanitizeJson(), loadPersonalization(), saveEdit(), savePersonalization() (+121 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (145): runContractScenario(), runLifecycleScenario(), display(), String(), findColumn(), handleDragEnd(), handleDragOver(), handleDragStart() (+137 more)

### Community 4 - "Community 4"
Cohesion: 0.01
Nodes (57): fetchAll(), monthKey(), aggregate(), bucketKey(), computeAggregation(), evalFilter(), evalLeaf(), previousRange() (+49 more)

### Community 5 - "Community 5"
Cohesion: 0.02
Nodes (132): buildAccountingCoreMigrationSql(), buildAccountingCoreRollbackSql(), buildAiAssistCoreMigrationSql(), buildAiAssistCoreRollbackSql(), buildAnalyticsBiCoreMigrationSql(), buildAnalyticsBiCoreRollbackSql(), buildAssetsCoreMigrationSql(), buildAssetsCoreRollbackSql() (+124 more)

### Community 6 - "Community 6"
Cohesion: 0.02
Nodes (112): canLaunchZone(), canRunAction(), canSeeField(), canSeeWidget(), canUseBuilder(), canUseCommand(), canViewPage(), canViewReport() (+104 more)

### Community 7 - "Community 7"
Cohesion: 0.02
Nodes (70): addLeaf(), emit(), emptyLeaf(), isLeaf(), removeAt(), updateAt(), toggleAll(), toggleRow() (+62 more)

### Community 8 - "Community 8"
Cohesion: 0.03
Nodes (119): buildAccountingCoreSqliteMigrationSql(), buildAccountingCoreSqliteRollbackSql(), buildAiAssistCoreSqliteMigrationSql(), buildAiAssistCoreSqliteRollbackSql(), buildAnalyticsBiCoreSqliteMigrationSql(), buildAnalyticsBiCoreSqliteRollbackSql(), buildAssetsCoreSqliteMigrationSql(), buildAssetsCoreSqliteRollbackSql() (+111 more)

### Community 9 - "Community 9"
Cohesion: 0.03
Nodes (121): checkCatalog(), checkPluginDocs(), main(), missingHeadings(), placeholderFailures(), buildImportList(), capitalize(), createDocsCheckScript() (+113 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (88): createPaymentIdempotencyKey(), AiProviderError, convertZodSchema(), createErrorResponse(), createMcpRuntimeOrchestrator(), createMcpRuntimeServer(), createMcpServerFromContracts(), createSchemaCacheEntry() (+80 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (35): applyEncryption(), bufferUpTo(), concat(), existsFile(), fromS3StorageClass(), LocalStorageAdapter, nodeToWebStream(), S3StorageAdapter (+27 more)

### Community 12 - "Community 12"
Cohesion: 0.04
Nodes (9): assertUnsupportedOperation(), normalizeWebhookStatus(), parseGenericWebhookEvent(), readRecordField(), readStatusField(), readStringField(), safeJsonParse(), parseWebhookEvent() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.04
Nodes (69): apiBase(), createEditorRecord(), createPublicLink(), deleteEditorRecord(), fetchEditorRecord(), fetchSnapshot(), getAuthHeaders(), listAcl() (+61 more)

### Community 14 - "Community 14"
Cohesion: 0.03
Nodes (65): AnalyticsEmitterImpl, createAnalytics(), ensureSessionId(), createRuntime(), cryptoId(), assertAuditHealthy(), assertCertificationHealthy(), assertConsumerSmokeHealthy() (+57 more)

### Community 15 - "Community 15"
Cohesion: 0.03
Nodes (4): amendRecord(), placeRecordOnHold(), releaseRecordHold(), reverseRecord()

### Community 16 - "Community 16"
Cohesion: 0.02
Nodes (2): createGeneratedProviderAdapter(), createProviderAdapter()

### Community 17 - "Community 17"
Cohesion: 0.02
Nodes (1): mapProviderStatus()

### Community 18 - "Community 18"
Cohesion: 0.03
Nodes (59): compileBiQuery(), createBiChart(), createBiDashboard(), createBiSchedule(), createBiShare(), createBiSpace(), drillDownBiQuery(), fetchBiCatalog() (+51 more)

### Community 19 - "Community 19"
Cohesion: 0.03
Nodes (48): renderPrefix(), stripPrefix(), toSnakeCase(), sanitizeForHeader(), code(), personEmail(), personName(), pick() (+40 more)

### Community 20 - "Community 20"
Cohesion: 0.06
Nodes (76): ActiveRunsWidget(), acknowledgeRunnerHandoff(), AgentBudgetExceededError, AgentReplayMismatchError, AgentToolDeniedError, appendAgentStep(), approveCheckpoint(), assertBudgetWithinLimits() (+68 more)

### Community 21 - "Community 21"
Cohesion: 0.05
Nodes (80): main(), read_cell_value(), read_shared_strings(), main(), runScenario(), buildDependencyContractsFromLists(), dedupeList(), deriveSuggestedPackIds() (+72 more)

### Community 22 - "Community 22"
Cohesion: 0.03
Nodes (33): createActivationEngine(), handleApply(), BlockSuitePageAdapter, loadBlockSuite(), BlockSuiteEdgelessAdapter, loadBlockSuite(), colorForUser(), connectCollab() (+25 more)

### Community 23 - "Community 23"
Cohesion: 0.04
Nodes (55): AdminInner(), AppShell(), useLiveAudit(), AutomationRunDetailPage(), BookingDashboardKpis(), pct(), useRuntime(), CrmOverviewPage() (+47 more)

### Community 24 - "Community 24"
Cohesion: 0.04
Nodes (49): buildDomainPlugin(), buildResource(), detailViewFromZod(), formViewFromZod(), humanize(), inferField(), unwrap(), zodKind() (+41 more)

### Community 25 - "Community 25"
Cohesion: 0.04
Nodes (35): appointments(), campaigns(), code(), competitors(), contracts(), count(), daysAgo(), leads() (+27 more)

### Community 26 - "Community 26"
Cohesion: 0.1
Nodes (3): checkPlaceholders(), requireFile(), requireHeadings()

### Community 27 - "Community 27"
Cohesion: 0.08
Nodes (48): copyRequestId(), actionRequiredExample(), buildProviderRecord(), classifySupportLevel(), countSeriousImplementedOperations(), createFirstWaveReadinessReport(), createSupportMatrix(), deriveAdvertisedCapabilities() (+40 more)

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (36): ErrorBoundary, compileDraft(), compileEmailDraft(), createCommunicationIdempotencyKey(), createLocalCommunicationProviderRegistry(), createRetryDecision(), defineCommunicationRoute(), defineInAppCompiler() (+28 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (34): envEnum(), envFlag(), envInt(), loadConfig(), dbx(), sessionTenantId(), tenantMiddleware(), ifNotExists() (+26 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (31): localWarehouseAdapter(), applyFilters(), applySorts(), clampLimit(), clone(), compareValues(), compileMetricQuerySql(), createChartVersion() (+23 more)

### Community 31 - "Community 31"
Cohesion: 0.1
Nodes (30): checkRegressionGate(), compareEvalRuns(), createEvalBaseline(), roundMetric(), runEvalDataset(), AiEvalsAdminPage(), buildEvalRunId(), captureEvalBaseline() (+22 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (27): advances(), appraisals(), attendance(), code(), count(), departments(), designations(), employees() (+19 more)

### Community 33 - "Community 33"
Cohesion: 0.08
Nodes (6): cn(), DashboardGrid(), MetricCard(), PageSection(), BuilderCanvas(), StatusBadge()

### Community 34 - "Community 34"
Cohesion: 0.08
Nodes (1): BusinessAdminPage()

### Community 35 - "Community 35"
Cohesion: 0.08
Nodes (1): seedState()

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (20): batches(), bins(), code(), count(), deliveryNotes(), deliveryTrips(), items(), itemSuppliers() (+12 more)

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (18): createNavigationContract(), findMatchingZone(), isPathPrefixMatch(), listDeepLinks(), matchesRoutePattern(), matchesZone(), normalizeHref(), resolveNavigationTarget() (+10 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (15): bankAccounts(), bankTransactions(), budgets(), code(), costCenters(), count(), currencyRates(), dunning() (+7 more)

### Community 39 - "Community 39"
Cohesion: 0.17
Nodes (9): AccessDenied, ChecksumMismatch, InvalidKey, isRetryableByDefault(), isStorageError(), ObjectNotFound, PayloadTooLarge, StorageError (+1 more)

### Community 40 - "Community 40"
Cohesion: 0.2
Nodes (14): cannedResponses(), code(), count(), csatResponses(), escalations(), kbArticles(), personName(), pick() (+6 more)

### Community 41 - "Community 41"
Cohesion: 0.13
Nodes (6): fmt(), formatValue(), cn(), fmt(), fmt(), if()

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (6): ConfigurationError, NotSupportedError, PaymentError, ProviderError, TransportError, WebhookVerificationError

### Community 43 - "Community 43"
Cohesion: 0.24
Nodes (4): explorePathForQuery(), parseQueryState(), queryFromHash(), serializeQueryState()

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (2): createShellQueryScope(), invalidateShellDeskQueries()

### Community 45 - "Community 45"
Cohesion: 0.31
Nodes (5): formatCurrency(), formatDate(), formatDateTime(), formatNumber(), renderCellValue()

### Community 46 - "Community 46"
Cohesion: 0.43
Nodes (7): createPlatformTableOptions(), createPlatformTableState(), setPlatformColumnVisibility(), setPlatformFilter(), setPlatformSorting(), togglePlatformRowSelection(), usePlatformTable()

### Community 47 - "Community 47"
Cohesion: 0.32
Nodes (3): assertCoordinates(), calculateBoundingBox(), haversineDistanceKm()

### Community 48 - "Community 48"
Cohesion: 0.52
Nodes (6): globRoots(), listStandaloneRoots(), listTrackedOffenders(), listVisibleStandaloneStatus(), runGit(), safeList()

### Community 50 - "Community 50"
Cohesion: 0.43
Nodes (5): filterCommandPaletteItems(), groupCommandPaletteItems(), normalizeQuery(), PlatformCommandPalette(), rankCommandPaletteItems()

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (3): BarChart(), niceScale(), LineChart()

### Community 52 - "Community 52"
Cohesion: 0.33
Nodes (1): PluginBoundary

### Community 53 - "Community 53"
Cohesion: 0.33
Nodes (1): App()

### Community 55 - "Community 55"
Cohesion: 0.47
Nodes (3): getTheme(), setTheme(), toggleTheme()

### Community 56 - "Community 56"
Cohesion: 0.4
Nodes (2): createSplitWorkspaceFixture(), hasDirectorySymlinkSupport()

### Community 57 - "Community 57"
Cohesion: 0.6
Nodes (5): AdminShell(), getReactRuntime(), PortalShell(), ShellFrame(), SiteShell()

### Community 58 - "Community 58"
Cohesion: 0.47
Nodes (4): createAdminEditorPreset(), createReadOnlyEditorPreset(), ReadOnlyEditorRenderer(), renderReadOnlyEditorContent()

### Community 59 - "Community 59"
Cohesion: 0.5
Nodes (2): post(), setPosts()

### Community 62 - "Community 62"
Cohesion: 0.6
Nodes (3): addMoney(), sameCurrency(), subtractMoney()

### Community 64 - "Community 64"
Cohesion: 0.67
Nodes (2): attachRpcHandler(), spawnIframeSandbox()

### Community 65 - "Community 65"
Cohesion: 0.67
Nodes (2): attachWorkerRpc(), spawnWorkerSandbox()

### Community 68 - "Community 68"
Cohesion: 0.83
Nodes (3): createPlatformEditorConfig(), createPlatformEditorExtensions(), usePlatformEditor()

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (2): isSecretKey(), scrubConfig()

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (2): NavIcon(), toPascal()

### Community 75 - "Community 75"
Cohesion: 0.67
Nodes (1): activate()

## Knowledge Gaps
- **Thin community `Community 16`** (103 nodes): `createGeneratedProviderAdapter()`, `createProviderAdapter()`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (101 nodes): `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mapProviderStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (26 nodes): `BusinessAdminPage()`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (26 nodes): `seedState()`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (10 nodes): `createPlatformQueryClient()`, `createPlatformQueryKey()`, `createShellQueryScope()`, `invalidatePlatformScopes()`, `invalidateShellDeskQueries()`, `primePlatformQuery()`, `resetTenantScopedQueries()`, `usePlatformMutation()`, `usePlatformQuery()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (6 nodes): `PluginBoundary.tsx`, `DefaultFallback()`, `PluginBoundary`, `.componentDidCatch()`, `.getDerivedStateFromError()`, `.render()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (6 nodes): `App.tsx`, `App()`, `App.tsx`, `App.tsx`, `App.tsx`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (6 nodes): `package.test.ts`, `package.test.ts`, `createFrameworkSourceFixture()`, `createIo()`, `createSplitWorkspaceFixture()`, `hasDirectorySymlinkSupport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (5 nodes): `community-pages.tsx`, `action()`, `on()`, `post()`, `setPosts()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (4 nodes): `iframeSandbox.tsx`, `attachRpcHandler()`, `dispatchRpc()`, `spawnIframeSandbox()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (4 nodes): `workerSandbox.ts`, `attachWorkerRpc()`, `dispatchWorkerRpc()`, `spawnWorkerSandbox()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (3 nodes): `storage.ts`, `isSecretKey()`, `scrubConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (3 nodes): `NavIcon.tsx`, `NavIcon()`, `toPascal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (3 nodes): `plugin.tsx`, `plugin.tsx`, `activate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `String()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 16`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 27`, `Community 30`, `Community 32`, `Community 36`, `Community 38`, `Community 40`, `Community 41`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `parse()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 16`, `Community 18`, `Community 20`, `Community 22`, `Community 24`, `Community 27`, `Community 30`, `Community 43`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `replace()` connect `Community 19` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 6`, `Community 7`, `Community 9`, `Community 11`, `Community 13`, `Community 14`, `Community 18`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 29`, `Community 30`, `Community 31`, `Community 32`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 100 inferred relationships involving `parse()` (e.g. with `readGutuPlugins()` and `migrate()`) actually correct?**
  _`parse()` has 100 INFERRED edges - model-reasoned connections that need verification._
- **Are the 141 inferred relationships involving `String()` (e.g. with `setup()` and `code()`) actually correct?**
  _`String()` has 141 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `parseWebhookEvent()` (e.g. with `ingestWebhookEvent()` and `parseGenericWebhookEvent()`) actually correct?**
  _`parseWebhookEvent()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 99 inferred relationships involving `normalizeActionInput()` (e.g. with `parse()` and `publishBusinessMessage()`) actually correct?**
  _`normalizeActionInput()` has 99 INFERRED edges - model-reasoned connections that need verification._