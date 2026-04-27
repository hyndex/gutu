# Graph Report - Framework  (2026-04-27)

## Corpus Check
- 4130 files · ~6,885,215 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 9407 nodes · 14254 edges · 70 communities detected
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 4203 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 85|Community 85]]

## God Nodes (most connected - your core abstractions)
1. `String()` - 241 edges
2. `parse()` - 224 edges
3. `replace()` - 197 edges
4. `normalizePrefix()` - 145 edges
5. `nowIso()` - 121 edges
6. `all()` - 119 edges
7. `normalizeActionInput()` - 114 edges
8. `parseWebhookEvent()` - 102 edges
9. `verifyWebhookSignature()` - 101 edges
10. `mapProviderStatus()` - 101 edges

## Surprising Connections (you probably didn't know these)
- `money()` --calls--> `round()`  [INFERRED]
  admin-panel/backend/src/seed/manufacturing-extended.ts → plugins/gutu-plugin-erp-actions-core/framework/builtin-plugins/erp-actions-core/src/host-plugin/routes/erp-actions.ts
- `money()` --calls--> `round()`  [INFERRED]
  admin-panel/backend/src/seed/procurement-extended.ts → plugins/gutu-plugin-erp-actions-core/framework/builtin-plugins/erp-actions-core/src/host-plugin/routes/erp-actions.ts
- `withLeadership()` --calls--> `tick()`  [INFERRED]
  admin-panel/backend/src/host/leader.ts → plugins/gutu-plugin-notifications-core/framework/builtin-plugins/notifications-core/src/host-plugin/lib/notification-scheduler.ts
- `lifecycleSnapshot()` --calls--> `round()`  [INFERRED]
  admin-panel/backend/src/host/lifecycle.ts → plugins/gutu-plugin-erp-actions-core/framework/builtin-plugins/erp-actions-core/src/host-plugin/routes/erp-actions.ts
- `checkPluginHealth()` --calls--> `all()`  [INFERRED]
  admin-panel/backend/src/host/plugin-contract.ts → plugins/gutu-plugin-analytics-bi-core/framework/builtin-plugins/analytics-bi-core/src/host-plugin/routes/analytics-bi.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (466): accessibleRecordIds(), effectiveRole(), grantAcl(), listAcl(), purgeAclForRecord(), revokeAcl(), roleFromLinkToken(), seedDefaultAcl() (+458 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (323): cloneAccount(), cloneEntry(), clonePeriod(), createErpAccountingRuntime(), daysBetween(), defaultNormalBalance(), defineErpAccount(), signedAmount() (+315 more)

### Community 2 - "Community 2"
Cohesion: 0.01
Nodes (208): renderPrefix(), decodeEncodedWords(), formatAddress(), formatAddresses(), isValidEmail(), normalizeEmail(), normalizeSubject(), parseAddress() (+200 more)

### Community 3 - "Community 3"
Cohesion: 0.01
Nodes (175): AdminInner(), AdminRoot(), PermissionsRoot(), PlaygroundUI(), AIInsightPanel(), AppShell(), buildCrumbs(), ExternalViewRenderer() (+167 more)

### Community 4 - "Community 4"
Cohesion: 0.01
Nodes (220): roleAtLeast(), runOrError(), safeJson(), asRecord(), bodyJson(), createSimple(), findExplore(), getTyped() (+212 more)

### Community 5 - "Community 5"
Cohesion: 0.01
Nodes (143): AdvancedDataTable(), loadState(), addLeaf(), AdvancedFilterBuilder(), emit(), emptyLeaf(), isLeaf(), removeAt() (+135 more)

### Community 6 - "Community 6"
Cohesion: 0.01
Nodes (174): aggregate(), bucketKey(), computeAggregation(), evalFilter(), evalLeaf(), previousRange(), resolveTimeRange(), apiBase() (+166 more)

### Community 7 - "Community 7"
Cohesion: 0.01
Nodes (150): fetchAll(), monthKey(), num(), str(), fetchAll(), num(), str(), fetchAll() (+142 more)

### Community 8 - "Community 8"
Cohesion: 0.01
Nodes (158): fmtCurrency(), mockKpis(), mockSeries(), money(), fmtCurrency(), mockKpis(), mockSeries(), AiEvalsRunDetailPage() (+150 more)

### Community 9 - "Community 9"
Cohesion: 0.02
Nodes (124): exists(), applyMapping(), ensureJobsTable(), listImportJobs(), parseJsonOrJsonl(), countBadges(), parse(), assertRepositoryBoundary() (+116 more)

### Community 10 - "Community 10"
Cohesion: 0.02
Nodes (140): bankAccounts(), bankTransactions(), budgets(), code(), costCenters(), count(), currencyRates(), dunning() (+132 more)

### Community 11 - "Community 11"
Cohesion: 0.02
Nodes (151): canLaunchZone(), canRunAction(), canSeeField(), canSeeWidget(), canUseBuilder(), canUseCommand(), canViewPage(), canViewReport() (+143 more)

### Community 12 - "Community 12"
Cohesion: 0.02
Nodes (100): applyEncryption(), bufferUpTo(), concat(), existsFile(), fromS3StorageClass(), LocalStorageAdapter, nodeToWebStream(), S3StorageAdapter (+92 more)

### Community 13 - "Community 13"
Cohesion: 0.02
Nodes (105): toSnakeCase(), toggleAll(), toggleRow(), purgeExpiredIdempotency(), operatorsFor(), bootstrapMailJobs(), closeComposer(), dropUndo() (+97 more)

### Community 14 - "Community 14"
Cohesion: 0.02
Nodes (148): findAdminPluginRoots(), walk(), computeBounds(), LineSeries(), project(), yFor(), checkCatalog(), checkPluginDocs() (+140 more)

### Community 15 - "Community 15"
Cohesion: 0.02
Nodes (104): bootstrapStorage(), localDefaultConfig(), parseStorageBackendsEnv(), s3DefaultFromEnv(), envEnum(), envFlag(), envInt(), loadConfig() (+96 more)

### Community 16 - "Community 16"
Cohesion: 0.02
Nodes (132): buildAccountingCoreMigrationSql(), buildAccountingCoreRollbackSql(), buildAiAssistCoreMigrationSql(), buildAiAssistCoreRollbackSql(), buildAnalyticsBiCoreMigrationSql(), buildAnalyticsBiCoreRollbackSql(), buildAssetsCoreMigrationSql(), buildAssetsCoreRollbackSql() (+124 more)

### Community 17 - "Community 17"
Cohesion: 0.03
Nodes (81): api(), login(), main(), record(), safe(), scenarioAuthGuards(), scenarioCrudEdges(), scenarioDiscovery() (+73 more)

### Community 18 - "Community 18"
Cohesion: 0.03
Nodes (119): buildAccountingCoreSqliteMigrationSql(), buildAccountingCoreSqliteRollbackSql(), buildAiAssistCoreSqliteMigrationSql(), buildAiAssistCoreSqliteRollbackSql(), buildAnalyticsBiCoreSqliteMigrationSql(), buildAnalyticsBiCoreSqliteRollbackSql(), buildAssetsCoreSqliteMigrationSql(), buildAssetsCoreSqliteRollbackSql() (+111 more)

### Community 19 - "Community 19"
Cohesion: 0.03
Nodes (71): compileBiQuery(), createBiChart(), createBiDashboard(), createBiSchedule(), createBiShare(), createBiSpace(), drillDownBiQuery(), fetchChartHistory() (+63 more)

### Community 20 - "Community 20"
Cohesion: 0.03
Nodes (90): resetRoomManager(), RoomManager, trigger(), RestFallbackProvider, openPrintableDocument(), main(), runScenario(), buildDependencyContractsFromLists() (+82 more)

### Community 21 - "Community 21"
Cohesion: 0.04
Nodes (88): createPaymentIdempotencyKey(), AiProviderError, convertZodSchema(), createErrorResponse(), createMcpRuntimeOrchestrator(), createMcpRuntimeServer(), createMcpServerFromContracts(), createSchemaCacheEntry() (+80 more)

### Community 22 - "Community 22"
Cohesion: 0.04
Nodes (9): assertUnsupportedOperation(), normalizeWebhookStatus(), parseGenericWebhookEvent(), readRecordField(), readStatusField(), readStringField(), safeJsonParse(), parseWebhookEvent() (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.04
Nodes (52): AnalyticsEmitterImpl, createAnalytics(), ensureSessionId(), createRuntime(), cryptoId(), RuntimeProvider(), CapabilityRegistryImpl, createCapabilityRegistry() (+44 more)

### Community 24 - "Community 24"
Cohesion: 0.03
Nodes (4): amendRecord(), placeRecordOnHold(), releaseRecordHold(), reverseRecord()

### Community 25 - "Community 25"
Cohesion: 0.02
Nodes (2): createGeneratedProviderAdapter(), createProviderAdapter()

### Community 26 - "Community 26"
Cohesion: 0.02
Nodes (1): mapProviderStatus()

### Community 27 - "Community 27"
Cohesion: 0.04
Nodes (57): createActivationEngine(), BlockSuitePageAdapter, loadBlockSuite(), BlockSuiteEdgelessAdapter, loadBlockSuite(), colorForUser(), connectCollab(), wsBase() (+49 more)

### Community 28 - "Community 28"
Cohesion: 0.05
Nodes (14): main(), read_cell_value(), read_shared_strings(), ImapClient, ImapError, parseIdleLine(), tokenize(), dotStuff() (+6 more)

### Community 29 - "Community 29"
Cohesion: 0.05
Nodes (58): accountingImbalance(), assertSafeJson(), buildErpDocumentRender(), buildErpPostingReport(), buildMappedTargetRecord(), cloneJson(), collectPrintableRecord(), escapeHtml() (+50 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (3): checkPlaceholders(), requireFile(), requireHeadings()

### Community 31 - "Community 31"
Cohesion: 0.07
Nodes (53): copyRequestId(), actionRequiredExample(), buildProviderRecord(), classifySupportLevel(), countSeriousImplementedOperations(), createFirstWaveReadinessReport(), createSupportMatrix(), deriveAdvertisedCapabilities() (+45 more)

### Community 32 - "Community 32"
Cohesion: 0.07
Nodes (24): handleApply(), handler(), setLink(), Toolbar(), ToolbarButton(), FrameEditor(), handler(), postToParent() (+16 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (38): aggregateMetric(), aggregateSnapshots(), applyFilters(), applySorts(), clampLimit(), clone(), compareValues(), compileMetricQuerySql() (+30 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (33): compileDraft(), compileEmailDraft(), createCommunicationIdempotencyKey(), createLocalCommunicationProviderRegistry(), createRetryDecision(), defineCommunicationRoute(), defineInAppCompiler(), definePushCompiler() (+25 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (27): advances(), appraisals(), attendance(), code(), count(), departments(), designations(), employees() (+19 more)

### Community 36 - "Community 36"
Cohesion: 0.08
Nodes (1): BusinessAdminPage()

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (18): createNavigationContract(), findMatchingZone(), isPathPrefixMatch(), listDeepLinks(), matchesRoutePattern(), matchesZone(), normalizeHref(), resolveNavigationTarget() (+10 more)

### Community 38 - "Community 38"
Cohesion: 0.15
Nodes (4): emptySummary(), sanitizeFilename(), slugify(), validateCreateInput()

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (6): ConfigurationError, NotSupportedError, PaymentError, ProviderError, TransportError, WebhookVerificationError

### Community 40 - "Community 40"
Cohesion: 0.56
Nodes (7): assertCatalogArtifactPolicy(), assertCatalogShape(), assertChannelShape(), assertPluginPresentationMetadata(), assertRemoteAsset(), assertSignedArtifact(), assertSortedAndUnique()

### Community 41 - "Community 41"
Cohesion: 0.43
Nodes (7): createPlatformTableOptions(), createPlatformTableState(), setPlatformColumnVisibility(), setPlatformFilter(), setPlatformSorting(), togglePlatformRowSelection(), usePlatformTable()

### Community 42 - "Community 42"
Cohesion: 0.32
Nodes (3): assertCoordinates(), calculateBoundingBox(), haversineDistanceKm()

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (2): DefaultFallback(), PluginBoundary

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (1): App()

### Community 45 - "Community 45"
Cohesion: 0.48
Nodes (5): DocumentWorkspace(), PagesWorkspace(), SlidesWorkspace(), SpreadsheetWorkspace(), WhiteboardWorkspace()

### Community 46 - "Community 46"
Cohesion: 0.52
Nodes (6): globRoots(), listStandaloneRoots(), listTrackedOffenders(), listVisibleStandaloneStatus(), runGit(), safeList()

### Community 48 - "Community 48"
Cohesion: 0.43
Nodes (5): filterCommandPaletteItems(), groupCommandPaletteItems(), normalizeQuery(), PlatformCommandPalette(), rankCommandPaletteItems()

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (1): intent()

### Community 50 - "Community 50"
Cohesion: 0.4
Nodes (2): createSplitWorkspaceFixture(), hasDirectorySymlinkSupport()

### Community 51 - "Community 51"
Cohesion: 0.6
Nodes (5): AdminShell(), getReactRuntime(), PortalShell(), ShellFrame(), SiteShell()

### Community 52 - "Community 52"
Cohesion: 0.47
Nodes (4): createAdminEditorPreset(), createReadOnlyEditorPreset(), ReadOnlyEditorRenderer(), renderReadOnlyEditorContent()

### Community 53 - "Community 53"
Cohesion: 0.7
Nodes (3): attachRpcHandler(), dispatchRpc(), spawnIframeSandbox()

### Community 54 - "Community 54"
Cohesion: 0.7
Nodes (3): attachWorkerRpc(), dispatchWorkerRpc(), spawnWorkerSandbox()

### Community 55 - "Community 55"
Cohesion: 0.4
Nodes (1): EditorErrorBoundary

### Community 56 - "Community 56"
Cohesion: 0.5
Nodes (2): post(), setPosts()

### Community 59 - "Community 59"
Cohesion: 0.6
Nodes (3): addMoney(), sameCurrency(), subtractMoney()

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (2): classifyIntent(), HealthMonitorWidget()

### Community 61 - "Community 61"
Cohesion: 0.83
Nodes (2): NavIcon(), toPascal()

### Community 64 - "Community 64"
Cohesion: 0.83
Nodes (3): consoleTelemetrySink(), httpBatchTelemetrySink(), installTelemetrySink()

### Community 67 - "Community 67"
Cohesion: 0.83
Nodes (3): createPlatformEditorConfig(), createPlatformEditorExtensions(), usePlatformEditor()

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (2): isSecretKey(), scrubConfig()

### Community 69 - "Community 69"
Cohesion: 0.67
Nodes (1): SpacerWidget()

### Community 72 - "Community 72"
Cohesion: 0.67
Nodes (1): defineErpResourceMetadata()

### Community 73 - "Community 73"
Cohesion: 0.67
Nodes (1): fieldServiceEvents()

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (2): mockKpis(), mockSeries()

### Community 76 - "Community 76"
Cohesion: 0.67
Nodes (1): activate()

### Community 77 - "Community 77"
Cohesion: 0.67
Nodes (1): bookingEvents()

### Community 79 - "Community 79"
Cohesion: 0.67
Nodes (1): cn()

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (2): execute(), run()

## Knowledge Gaps
- **3 isolated node(s):** `GoogleAuthError`, `MicrosoftAuthError`, `AiQuotaError`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 25`** (103 nodes): `createGeneratedProviderAdapter()`, `createProviderAdapter()`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (101 nodes): `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mapProviderStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (26 nodes): `BusinessAdminPage()`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (7 nodes): `PluginBoundary.js`, `PluginBoundary.tsx`, `DefaultFallback()`, `PluginBoundary`, `.componentDidCatch()`, `.getDerivedStateFromError()`, `.render()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (7 nodes): `App.js`, `App.tsx`, `App()`, `App.tsx`, `App.tsx`, `App.tsx`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (6 nodes): `ApprovalPanel.js`, `ApprovalPanel.tsx`, `ApprovalPanel()`, `handleApprove()`, `handleReject()`, `intent()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (6 nodes): `package.test.ts`, `package.test.ts`, `createFrameworkSourceFixture()`, `createIo()`, `createSplitWorkspaceFixture()`, `hasDirectorySymlinkSupport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (5 nodes): `EditorErrorBoundary.js`, `EditorErrorBoundary`, `.componentDidCatch()`, `.getDerivedStateFromError()`, `.render()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (5 nodes): `community-pages.tsx`, `action()`, `on()`, `post()`, `setPosts()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (4 nodes): `HealthMonitorWidget.js`, `HealthMonitorWidget.tsx`, `classifyIntent()`, `HealthMonitorWidget()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (4 nodes): `NavIcon.js`, `NavIcon.tsx`, `NavIcon()`, `toPascal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (3 nodes): `storage.ts`, `isSecretKey()`, `scrubConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (3 nodes): `SpacerWidget.js`, `SpacerWidget.tsx`, `SpacerWidget()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (3 nodes): `erp-metadata.js`, `erp-metadata.ts`, `defineErpResourceMetadata()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (3 nodes): `field-service-pages.js`, `field-service-pages.tsx`, `fieldServiceEvents()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (3 nodes): `hr-payroll-archetype.tsx`, `mockKpis()`, `mockSeries()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (3 nodes): `plugin.tsx`, `plugin.tsx`, `activate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (3 nodes): `BookingCalendarPage.js`, `BookingCalendarPage.tsx`, `bookingEvents()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (3 nodes): `cn.js`, `cn.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (3 nodes): `BulkActionBar.tsx`, `execute()`, `run()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `String()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 25`, `Community 27`, `Community 28`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 35`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `replace()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 19`, `Community 20`, `Community 23`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 35`, `Community 38`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `parse()` connect `Community 9` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 27`, `Community 29`, `Community 31`, `Community 33`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 240 inferred relationships involving `String()` (e.g. with `setup()` and `code()`) actually correct?**
  _`String()` has 240 INFERRED edges - model-reasoned connections that need verification._
- **Are the 159 inferred relationships involving `parse()` (e.g. with `readGutuPlugins()` and `migrate()`) actually correct?**
  _`parse()` has 159 INFERRED edges - model-reasoned connections that need verification._
- **Are the 195 inferred relationships involving `replace()` (e.g. with `personEmail()` and `personEmail()`) actually correct?**
  _`replace()` has 195 INFERRED edges - model-reasoned connections that need verification._
- **Are the 120 inferred relationships involving `nowIso()` (e.g. with `resolveAuthUser()` and `seedUsers()`) actually correct?**
  _`nowIso()` has 120 INFERRED edges - model-reasoned connections that need verification._