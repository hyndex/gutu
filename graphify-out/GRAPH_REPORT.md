# Graph Report - Framework  (2026-04-23)

## Corpus Check
- 2771 files · ~5,606,198 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4624 nodes · 4718 edges · 47 communities detected
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 484 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 51|Community 51]]

## God Nodes (most connected - your core abstractions)
1. `normalizePrefix()` - 145 edges
2. `parse()` - 114 edges
3. `parseWebhookEvent()` - 102 edges
4. `normalizeActionInput()` - 101 edges
5. `verifyWebhookSignature()` - 101 edges
6. `createProviderAdapter()` - 101 edges
7. `mapProviderStatus()` - 100 edges
8. `normalizeIdentifier()` - 92 edges
9. `countBadges()` - 57 edges
10. `requireFile()` - 57 edges

## Surprising Connections (you probably didn't know these)
- `getWorkflowTransition()` --calls--> `transitionWorkflowInstance()`  [INFERRED]
  gutu-core/framework/core/jobs/src/index.ts → plugins/gutu-plugin-workflow-core/framework/builtin-plugins/workflow-core/src/services/main.service.ts
- `parse()` --calls--> `chunkMatchesPolicy()`  [INFERRED]
  plugins/gutu-plugin-e-invoicing-core/scripts/docs-summary.mjs → libraries/gutu-lib-ai-memory/framework/libraries/ai-memory/src/index.ts
- `parse()` --calls--> `deserializeSavedView()`  [INFERRED]
  plugins/gutu-plugin-e-invoicing-core/scripts/docs-summary.mjs → libraries/gutu-lib-admin-listview/framework/libraries/admin-listview/src/index.ts
- `parse()` --calls--> `createFormDefaults()`  [INFERRED]
  plugins/gutu-plugin-e-invoicing-core/scripts/docs-summary.mjs → libraries/gutu-lib-ui-form/framework/libraries/ui-form/src/index.ts
- `write()` --calls--> `runCli()`  [INFERRED]
  tooling/business-os/scaffold.mjs → gutu-core/framework/core/cli/src/index.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (172): AutomationInboxPage(), checkRegressionGate(), cloneLink(), clonePrimaryRecordLike(), cloneRow(), compareEvalRuns(), createEvalBaseline(), deserializePostgresOutboxMessage() (+164 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (127): exists(), findAdminPluginRoots(), walk(), countBadges(), parse(), assertRepositoryBoundary(), calculateNextRunAt(), canUseFrameworkSymlink() (+119 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (132): buildAccountingCoreMigrationSql(), buildAccountingCoreRollbackSql(), buildAiAssistCoreMigrationSql(), buildAiAssistCoreRollbackSql(), buildAnalyticsBiCoreMigrationSql(), buildAnalyticsBiCoreRollbackSql(), buildAssetsCoreMigrationSql(), buildAssetsCoreRollbackSql() (+124 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (119): buildAccountingCoreSqliteMigrationSql(), buildAccountingCoreSqliteRollbackSql(), buildAiAssistCoreSqliteMigrationSql(), buildAiAssistCoreSqliteRollbackSql(), buildAnalyticsBiCoreSqliteMigrationSql(), buildAnalyticsBiCoreSqliteRollbackSql(), buildAssetsCoreSqliteMigrationSql(), buildAssetsCoreSqliteRollbackSql() (+111 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (116): checkCatalog(), checkPluginDocs(), main(), missingHeadings(), placeholderFailures(), buildImportList(), capitalize(), createDocsCheckScript() (+108 more)

### Community 5 - "Community 5"
Cohesion: 0.03
Nodes (77): applyPackInstall(), buildGenericBusinessDomainPostgresMigrationSql(), buildGenericBusinessDomainSqliteMigrationSql(), cloneBusinessDeadLetterRecord(), cloneBusinessInboxItem(), cloneBusinessOutboxMessage(), cloneBusinessPluginState(), cloneBusinessProjectionRecord() (+69 more)

### Community 6 - "Community 6"
Cohesion: 0.03
Nodes (4): amendRecord(), placeRecordOnHold(), releaseRecordHold(), reverseRecord()

### Community 7 - "Community 7"
Cohesion: 0.02
Nodes (2): createGeneratedProviderAdapter(), createProviderAdapter()

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (2): parseWebhookEvent(), verifyWebhookSignature()

### Community 9 - "Community 9"
Cohesion: 0.02
Nodes (1): mapProviderStatus()

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (79): ActiveRunsWidget(), acknowledgeRunnerHandoff(), AgentBudgetExceededError, AgentReplayMismatchError, AgentToolDeniedError, appendAgentStep(), approveCheckpoint(), assertBudgetWithinLimits() (+71 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (77): main(), read_cell_value(), read_shared_strings(), main(), runScenario(), dedupeList(), main(), renderActions() (+69 more)

### Community 12 - "Community 12"
Cohesion: 0.04
Nodes (54): canLaunchZone(), canUseBuilder(), canViewPage(), canViewReport(), createAdminRegistry(), buildCartesianChartOption(), ChartSurface(), countChartSeries() (+46 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (44): assertMemoryAccess(), buildPostgresTsQuery(), buildRetrievalPlan(), chunkMatchesPolicy(), chunkMemoryDocument(), collectionMatchesPolicy(), createSearchResultPage(), defineMemoryCollection() (+36 more)

### Community 14 - "Community 14"
Cohesion: 0.1
Nodes (3): checkPlaceholders(), requireFile(), requireHeadings()

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (48): createPaymentIdempotencyKey(), metricCard(), PaymentsOverviewAdminPage(), PaymentsProvidersAdminPage(), PaymentsRecordsAdminPage(), PaymentsRefundsAdminPage(), PaymentsWebhooksAdminPage(), renderMetricGrid() (+40 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (40): AiProviderError, convertZodSchema(), createErrorResponse(), createMcpRuntimeOrchestrator(), createMcpRuntimeServer(), createMcpServerFromContracts(), createSchemaCacheEntry(), createSuccessResponse() (+32 more)

### Community 17 - "Community 17"
Cohesion: 0.05
Nodes (17): AgentBuilderPage(), cn(), DashboardGrid(), MetricCard(), PageSection(), IntegrationBuilderPage(), IssueBuilderPage(), assertBuilderRevision() (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (46): actionRequiredExample(), buildProviderRecord(), classifySupportLevel(), countSeriousImplementedOperations(), createFirstWaveReadinessReport(), createSupportMatrix(), deriveAdvertisedCapabilities(), deriveClientRuntimeRequirements() (+38 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (32): main(), renderMarkdownReport(), tailLines(), writeReports(), buildAdvanceInput(), buildCreateInput(), buildReconcileInput(), loadPluginModule() (+24 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (33): compileDraft(), compileEmailDraft(), createCommunicationIdempotencyKey(), createLocalCommunicationProviderRegistry(), createRetryDecision(), defineCommunicationRoute(), defineInAppCompiler(), definePushCompiler() (+25 more)

### Community 21 - "Community 21"
Cohesion: 0.1
Nodes (30): adaptLegacyUiRegistry(), humanizeSlug(), inferGroupId(), inferPageKind(), inferWorkspaceId(), lastStaticAdminSegment(), toStableId(), createRegistry() (+22 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (21): buildRestrictedPreviewScenario(), buildWorkbenchHref(), createShellHarnessRegistry(), createWorkbenchCustomization(), featureLinksForProfile(), parseCookie(), resolveProfile(), resolveWorkbenchDensity() (+13 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (32): assertAuditHealthy(), assertCertificationHealthy(), assertConsumerSmokeHealthy(), copyCoreRoot(), copyRepoRoots(), createAuditReport(), createFileLockEntry(), discoverCorePackageIds() (+24 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (1): seedState()

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (1): BusinessAdminPage()

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (18): createNavigationContract(), findMatchingZone(), isPathPrefixMatch(), listDeepLinks(), matchesRoutePattern(), matchesZone(), normalizeHref(), resolveNavigationTarget() (+10 more)

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (12): ExecutionWorkspacesAdminPage(), getExecutionOverview(), listExecutionWorkspaces(), listRuntimeServices(), loadExecutionState(), persistExecutionState(), realizeExecutionWorkspace(), restartRuntimeService() (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.18
Nodes (8): createAsyncFieldValidationAdapter(), createDetailViewFromResource(), createDirtyStateGuard(), createFormDefaults(), createFormViewFromResource(), defineDetailView(), defineFormView(), stableSerialize()

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (6): ConfigurationError, NotSupportedError, PaymentError, ProviderError, TransportError, WebhookVerificationError

### Community 30 - "Community 30"
Cohesion: 0.21
Nodes (5): createEventEnvelope(), createEventIdempotencyKey(), createOutboxRecord(), emitAuditEvent(), recordAuditEvent()

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (2): createShellQueryScope(), invalidateShellDeskQueries()

### Community 32 - "Community 32"
Cohesion: 0.56
Nodes (7): assertCatalogArtifactPolicy(), assertCatalogShape(), assertChannelShape(), assertPluginPresentationMetadata(), assertRemoteAsset(), assertSignedArtifact(), assertSortedAndUnique()

### Community 33 - "Community 33"
Cohesion: 0.43
Nodes (7): createPlatformTableOptions(), createPlatformTableState(), setPlatformColumnVisibility(), setPlatformFilter(), setPlatformSorting(), togglePlatformRowSelection(), usePlatformTable()

### Community 34 - "Community 34"
Cohesion: 0.32
Nodes (4): buildRouteHref(), createAdminRouteTaxonomy(), createDeepLink(), defineRoute()

### Community 35 - "Community 35"
Cohesion: 0.32
Nodes (3): assertCoordinates(), calculateBoundingBox(), haversineDistanceKm()

### Community 36 - "Community 36"
Cohesion: 0.52
Nodes (6): globRoots(), listStandaloneRoots(), listTrackedOffenders(), listVisibleStandaloneStatus(), runGit(), safeList()

### Community 39 - "Community 39"
Cohesion: 0.43
Nodes (5): filterCommandPaletteItems(), groupCommandPaletteItems(), normalizeQuery(), PlatformCommandPalette(), rankCommandPaletteItems()

### Community 40 - "Community 40"
Cohesion: 0.4
Nodes (2): createSplitWorkspaceFixture(), hasDirectorySymlinkSupport()

### Community 41 - "Community 41"
Cohesion: 0.4
Nodes (3): createListViewFromResource(), defineListView(), deserializeSavedView()

### Community 42 - "Community 42"
Cohesion: 0.6
Nodes (5): AdminShell(), getReactRuntime(), PortalShell(), ShellFrame(), SiteShell()

### Community 43 - "Community 43"
Cohesion: 0.47
Nodes (4): createAdminEditorPreset(), createReadOnlyEditorPreset(), ReadOnlyEditorRenderer(), renderReadOnlyEditorContent()

### Community 44 - "Community 44"
Cohesion: 0.5
Nodes (2): renderEmailPreview(), renderEmailTemplate()

### Community 46 - "Community 46"
Cohesion: 0.6
Nodes (3): addMoney(), sameCurrency(), subtractMoney()

### Community 47 - "Community 47"
Cohesion: 0.4
Nodes (1): App()

### Community 48 - "Community 48"
Cohesion: 0.83
Nodes (3): discoverChildren(), discoverTargets(), main()

### Community 51 - "Community 51"
Cohesion: 0.83
Nodes (3): createPlatformEditorConfig(), createPlatformEditorExtensions(), usePlatformEditor()

## Knowledge Gaps
- **Thin community `Community 7`** (103 nodes): `createGeneratedProviderAdapter()`, `createProviderAdapter()`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (102 nodes): `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `webhooks.ts`, `parseWebhookEvent()`, `verifyWebhookSignature()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (101 nodes): `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mapProviderStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (26 nodes): `seedState()`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (26 nodes): `BusinessAdminPage()`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (10 nodes): `createPlatformQueryClient()`, `createPlatformQueryKey()`, `createShellQueryScope()`, `invalidatePlatformScopes()`, `invalidateShellDeskQueries()`, `primePlatformQuery()`, `resetTenantScopedQueries()`, `usePlatformMutation()`, `usePlatformQuery()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (6 nodes): `package.test.ts`, `package.test.ts`, `createFrameworkSourceFixture()`, `createIo()`, `createSplitWorkspaceFixture()`, `hasDirectorySymlinkSupport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (5 nodes): `createEmailTemplateRegistry()`, `defineEmailTemplate()`, `renderEmailPreview()`, `renderEmailTemplate()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (5 nodes): `App()`, `App.tsx`, `App.tsx`, `App.tsx`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `parse()` connect `Community 1` to `Community 0`, `Community 4`, `Community 5`, `Community 7`, `Community 41`, `Community 10`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 18`, `Community 23`, `Community 28`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `normalizeActionInput()` connect `Community 0` to `Community 1`, `Community 5`, `Community 10`, `Community 13`, `Community 15`, `Community 16`, `Community 27`, `Community 30`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 57 inferred relationships involving `parse()` (e.g. with `readJson()` and `updateRootPackageJson()`) actually correct?**
  _`parse()` has 57 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `parseWebhookEvent()` (e.g. with `ingestWebhookEvent()` and `parseGenericWebhookEvent()`) actually correct?**
  _`parseWebhookEvent()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 99 inferred relationships involving `normalizeActionInput()` (e.g. with `parse()` and `publishBusinessMessage()`) actually correct?**
  _`normalizeActionInput()` has 99 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._