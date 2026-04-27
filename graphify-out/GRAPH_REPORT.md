# Graph Report - Framework  (2026-04-27)

## Corpus Check
- 4186 files · ~6,936,578 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 9671 nodes · 15027 edges · 82 communities detected
- Extraction: 69% EXTRACTED · 31% INFERRED · 0% AMBIGUOUS · INFERRED: 4695 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 92|Community 92]]

## God Nodes (most connected - your core abstractions)
1. `String()` - 253 edges
2. `parse()` - 234 edges
3. `replace()` - 203 edges
4. `normalizePrefix()` - 145 edges
5. `set()` - 128 edges
6. `all()` - 127 edges
7. `nowIso()` - 121 edges
8. `normalizeActionInput()` - 114 edges
9. `useEffect()` - 103 edges
10. `parseWebhookEvent()` - 102 edges

## Surprising Connections (you probably didn't know these)
- `money()` --calls--> `round()`  [INFERRED]
  admin-panel/backend/src/seed/manufacturing-extended.ts → plugins/gutu-plugin-erp-actions-core/framework/builtin-plugins/erp-actions-core/src/host-plugin/routes/erp-actions.ts
- `money()` --calls--> `round()`  [INFERRED]
  admin-panel/backend/src/seed/procurement-extended.ts → plugins/gutu-plugin-erp-actions-core/framework/builtin-plugins/erp-actions-core/src/host-plugin/routes/erp-actions.ts
- `listLeases()` --calls--> `all()`  [INFERRED]
  admin-panel/backend/src/host/leader.ts → plugins/gutu-plugin-analytics-bi-core/framework/builtin-plugins/analytics-bi-core/src/host-plugin/routes/analytics-bi.ts
- `lifecycleSnapshot()` --calls--> `round()`  [INFERRED]
  admin-panel/backend/src/host/lifecycle.ts → plugins/gutu-plugin-erp-actions-core/framework/builtin-plugins/erp-actions-core/src/host-plugin/routes/erp-actions.ts
- `checkPluginHealth()` --calls--> `all()`  [INFERRED]
  admin-panel/backend/src/host/plugin-contract.ts → plugins/gutu-plugin-analytics-bi-core/framework/builtin-plugins/analytics-bi-core/src/host-plugin/routes/analytics-bi.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (539): accessibleRecordIds(), effectiveRole(), grantAcl(), listAcl(), purgeAclForRecord(), revokeAcl(), roleAtLeast(), roleFromLinkToken() (+531 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (290): canLaunchZone(), canRunAction(), canSeeField(), canSeeWidget(), canUseBuilder(), canUseCommand(), canViewPage(), canViewReport() (+282 more)

### Community 2 - "Community 2"
Cohesion: 0.01
Nodes (267): cloneAccount(), cloneEntry(), clonePeriod(), createErpAccountingRuntime(), daysBetween(), defaultNormalBalance(), defineErpAccount(), signedAmount() (+259 more)

### Community 3 - "Community 3"
Cohesion: 0.01
Nodes (166): AdminInner(), AdminRoot(), PermissionsRoot(), PlaygroundUI(), AIInsightPanel(), AppShell(), buildCrumbs(), ExternalViewRenderer() (+158 more)

### Community 4 - "Community 4"
Cohesion: 0.01
Nodes (183): decodeEncodedWords(), formatAddress(), formatAddresses(), normalizeEmail(), normalizeSubject(), parseAddress(), parseAddressList(), participantsHash() (+175 more)

### Community 5 - "Community 5"
Cohesion: 0.01
Nodes (198): runOrError(), safeJson(), apiBase(), createEditorRecord(), createPublicLink(), deleteEditorRecord(), fetchEditorRecord(), fetchSnapshot() (+190 more)

### Community 6 - "Community 6"
Cohesion: 0.01
Nodes (157): fetchAll(), monthKey(), num(), str(), aggregate(), bucketKey(), computeAggregation(), evalFilter() (+149 more)

### Community 7 - "Community 7"
Cohesion: 0.02
Nodes (177): apiBase(), authHeaders(), autoMap(), commit(), onFile(), onPaste(), runDryRun(), runContractScenario() (+169 more)

### Community 8 - "Community 8"
Cohesion: 0.02
Nodes (128): isRecord(), normalizeEvent(), sanitizeJson(), asSeries(), countBadges(), parse(), assertRepositoryBoundary(), calculateNextRunAt() (+120 more)

### Community 9 - "Community 9"
Cohesion: 0.01
Nodes (96): AdvancedDataTable(), loadState(), AlertCenter(), intentClass(), AuthGuard(), SignInScreen(), AvatarGroup(), BarChart() (+88 more)

### Community 10 - "Community 10"
Cohesion: 0.02
Nodes (141): bankAccounts(), bankTransactions(), budgets(), code(), costCenters(), count(), currencyRates(), dunning() (+133 more)

### Community 11 - "Community 11"
Cohesion: 0.02
Nodes (139): normaliseDate(), checkCatalog(), checkPluginDocs(), main(), missingHeadings(), placeholderFailures(), buildImportList(), capitalize() (+131 more)

### Community 12 - "Community 12"
Cohesion: 0.03
Nodes (73): applyEncryption(), bufferUpTo(), concat(), existsFile(), fromS3StorageClass(), LocalStorageAdapter, nodeToWebStream(), renderPrefix() (+65 more)

### Community 13 - "Community 13"
Cohesion: 0.02
Nodes (132): buildAccountingCoreMigrationSql(), buildAccountingCoreRollbackSql(), buildAiAssistCoreMigrationSql(), buildAiAssistCoreRollbackSql(), buildAnalyticsBiCoreMigrationSql(), buildAnalyticsBiCoreRollbackSql(), buildAssetsCoreMigrationSql(), buildAssetsCoreRollbackSql() (+124 more)

### Community 14 - "Community 14"
Cohesion: 0.02
Nodes (108): code(), count(), personName(), pick(), seedAssetsExtended(), seedIf(), personEmail(), personName() (+100 more)

### Community 15 - "Community 15"
Cohesion: 0.03
Nodes (119): buildAccountingCoreSqliteMigrationSql(), buildAccountingCoreSqliteRollbackSql(), buildAiAssistCoreSqliteMigrationSql(), buildAiAssistCoreSqliteRollbackSql(), buildAnalyticsBiCoreSqliteMigrationSql(), buildAnalyticsBiCoreSqliteRollbackSql(), buildAssetsCoreSqliteMigrationSql(), buildAssetsCoreSqliteRollbackSql() (+111 more)

### Community 16 - "Community 16"
Cohesion: 0.02
Nodes (89): fmtCurrency(), mockKpis(), mockSeries(), fmtCurrency(), mockKpis(), mockSeries(), fmt(), EChartsCard() (+81 more)

### Community 17 - "Community 17"
Cohesion: 0.02
Nodes (73): buildViews(), buildCompactControlRoom(), buildControlRoom(), formViewFromZod(), humanize(), inferField(), unwrap(), zodKind() (+65 more)

### Community 18 - "Community 18"
Cohesion: 0.03
Nodes (114): ActiveRunsWidget(), acknowledgeRunnerHandoff(), AgentBudgetExceededError, AgentReplayMismatchError, AgentToolDeniedError, appendAgentStep(), approveCheckpoint(), assertBudgetWithinLimits() (+106 more)

### Community 19 - "Community 19"
Cohesion: 0.03
Nodes (86): compileBiQuery(), createBiChart(), createBiDashboard(), createBiSchedule(), createBiShare(), createBiSpace(), drillDownBiQuery(), fetchBiCatalog() (+78 more)

### Community 20 - "Community 20"
Cohesion: 0.04
Nodes (9): assertUnsupportedOperation(), normalizeWebhookStatus(), parseGenericWebhookEvent(), readRecordField(), readStatusField(), readStringField(), safeJsonParse(), parseWebhookEvent() (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.03
Nodes (74): addLeaf(), AdvancedFilterBuilder(), emit(), emptyLeaf(), isLeaf(), removeAt(), toGroup(), updateAt() (+66 more)

### Community 22 - "Community 22"
Cohesion: 0.03
Nodes (42): handleApply(), bootstrapStorage(), localDefaultConfig(), parseStorageBackendsEnv(), s3DefaultFromEnv(), close(), create(), addNote() (+34 more)

### Community 23 - "Community 23"
Cohesion: 0.03
Nodes (4): amendRecord(), placeRecordOnHold(), releaseRecordHold(), reverseRecord()

### Community 24 - "Community 24"
Cohesion: 0.02
Nodes (2): createGeneratedProviderAdapter(), createProviderAdapter()

### Community 25 - "Community 25"
Cohesion: 0.02
Nodes (1): mapProviderStatus()

### Community 26 - "Community 26"
Cohesion: 0.05
Nodes (55): envEnum(), envFlag(), envInt(), loadConfig(), resetConfig(), t(), buildDefaultValue(), detectDir() (+47 more)

### Community 27 - "Community 27"
Cohesion: 0.05
Nodes (17): main(), read_cell_value(), read_shared_strings(), asAttachment(), ImageDetail(), onKey(), ImapClient, ImapError (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.05
Nodes (75): buildDependencyContractsFromLists(), dedupeList(), deriveSuggestedPackIds(), main(), renderActions(), renderAdminContributions(), renderAdminPage(), renderBusinessPackAutomation() (+67 more)

### Community 29 - "Community 29"
Cohesion: 0.06
Nodes (58): accountingImbalance(), assertSafeJson(), buildErpDocumentRender(), buildErpPostingReport(), buildMappedTargetRecord(), cloneJson(), collectPrintableRecord(), escapeHtml() (+50 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (3): checkPlaceholders(), requireFile(), requireHeadings()

### Community 31 - "Community 31"
Cohesion: 0.05
Nodes (28): AnalyticsEmitterImpl, createAnalytics(), ensureSessionId(), Toolbar(), ToolbarButton(), createRuntime(), cryptoId(), RuntimeProvider() (+20 more)

### Community 32 - "Community 32"
Cohesion: 0.08
Nodes (49): createPaymentIdempotencyKey(), metricCard(), PaymentsOverviewAdminPage(), PaymentsProvidersAdminPage(), PaymentsRecordsAdminPage(), PaymentsRefundsAdminPage(), PaymentsWebhooksAdminPage(), renderMetricGrid() (+41 more)

### Community 33 - "Community 33"
Cohesion: 0.07
Nodes (53): copyRequestId(), actionRequiredExample(), buildProviderRecord(), classifySupportLevel(), countSeriousImplementedOperations(), createFirstWaveReadinessReport(), createSupportMatrix(), deriveAdvertisedCapabilities() (+45 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (32): api(), login(), main(), record(), safe(), scenarioAuthGuards(), scenarioCrudEdges(), scenarioDiscovery() (+24 more)

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (38): aggregateMetric(), aggregateSnapshots(), applyFilters(), applySorts(), clampLimit(), clone(), compareValues(), compileMetricQuerySql() (+30 more)

### Community 36 - "Community 36"
Cohesion: 0.16
Nodes (37): api(), login(), main(), record(), safe(), scenarioApiTokens(), scenarioCmdK(), scenarioContacts() (+29 more)

### Community 37 - "Community 37"
Cohesion: 0.11
Nodes (24): buildPluginContext(), CapabilityError, createContributionStore(), makeAnalytics(), makeAssetResolver(), makeContributions(), makeI18n(), makeLogger() (+16 more)

### Community 38 - "Community 38"
Cohesion: 0.1
Nodes (29): adaptLegacyUiRegistry(), humanizeSlug(), inferGroupId(), inferPageKind(), inferWorkspaceId(), lastStaticAdminSegment(), toStableId(), createRegistry() (+21 more)

### Community 39 - "Community 39"
Cohesion: 0.1
Nodes (24): applyStructuredFilter(), bufferToFloat32(), buildPostgresTsQuery(), createSearchResultPage(), escapeRegExp(), magnitude(), normalizeSearchQuery(), runFts() (+16 more)

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (27): advances(), appraisals(), attendance(), code(), count(), departments(), designations(), employees() (+19 more)

### Community 41 - "Community 41"
Cohesion: 0.08
Nodes (1): BusinessAdminPage()

### Community 42 - "Community 42"
Cohesion: 0.08
Nodes (1): seedState()

### Community 43 - "Community 43"
Cohesion: 0.16
Nodes (20): deleteLease(), listLeases(), readLease(), renew(), tryAcquire(), withLeadership(), writeLease(), cronMatches() (+12 more)

### Community 44 - "Community 44"
Cohesion: 0.2
Nodes (19): BACKOFF_MS(), dispatchOne(), drainOnce(), loop(), markStatus(), parseJson(), pickReady(), pickRow() (+11 more)

### Community 45 - "Community 45"
Cohesion: 0.17
Nodes (18): createNavigationContract(), findMatchingZone(), isPathPrefixMatch(), listDeepLinks(), matchesRoutePattern(), matchesZone(), normalizeHref(), resolveNavigationTarget() (+10 more)

### Community 46 - "Community 46"
Cohesion: 0.16
Nodes (3): emptySummary(), sanitizeFilename(), validateCreateInput()

### Community 47 - "Community 47"
Cohesion: 0.17
Nodes (9): AccessDenied, ChecksumMismatch, InvalidKey, isRetryableByDefault(), isStorageError(), ObjectNotFound, PayloadTooLarge, StorageError (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.27
Nodes (10): handleInstall(), remove(), addTrustedKey(), base64ToBytes(), computeSRI384(), loadTrustedKeys(), removeTrustedKey(), saveTrustedKeys() (+2 more)

### Community 49 - "Community 49"
Cohesion: 0.18
Nodes (7): computeBounds(), LineSeries(), project(), yFor(), buildBomTree(), expandAll(), buildTreeFromFlat()

### Community 50 - "Community 50"
Cohesion: 0.15
Nodes (6): ConfigurationError, NotSupportedError, PaymentError, ProviderError, TransportError, WebhookVerificationError

### Community 51 - "Community 51"
Cohesion: 0.56
Nodes (7): assertCatalogArtifactPolicy(), assertCatalogShape(), assertChannelShape(), assertPluginPresentationMetadata(), assertRemoteAsset(), assertSignedArtifact(), assertSortedAndUnique()

### Community 52 - "Community 52"
Cohesion: 0.43
Nodes (7): createPlatformTableOptions(), createPlatformTableState(), setPlatformColumnVisibility(), setPlatformFilter(), setPlatformSorting(), togglePlatformRowSelection(), usePlatformTable()

### Community 53 - "Community 53"
Cohesion: 0.32
Nodes (3): assertCoordinates(), calculateBoundingBox(), haversineDistanceKm()

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (2): DefaultFallback(), PluginBoundary

### Community 55 - "Community 55"
Cohesion: 0.29
Nodes (1): App()

### Community 56 - "Community 56"
Cohesion: 0.48
Nodes (5): DocumentWorkspace(), PagesWorkspace(), SlidesWorkspace(), SpreadsheetWorkspace(), WhiteboardWorkspace()

### Community 57 - "Community 57"
Cohesion: 0.52
Nodes (6): globRoots(), listStandaloneRoots(), listTrackedOffenders(), listVisibleStandaloneStatus(), runGit(), safeList()

### Community 59 - "Community 59"
Cohesion: 0.43
Nodes (5): filterCommandPaletteItems(), groupCommandPaletteItems(), normalizeQuery(), PlatformCommandPalette(), rankCommandPaletteItems()

### Community 60 - "Community 60"
Cohesion: 0.53
Nodes (5): containsLookalike(), looksLikeBrandImpersonation(), parseAuthResults(), phishHeuristics(), splitMethods()

### Community 61 - "Community 61"
Cohesion: 0.33
Nodes (1): intent()

### Community 62 - "Community 62"
Cohesion: 0.4
Nodes (2): createSplitWorkspaceFixture(), hasDirectorySymlinkSupport()

### Community 63 - "Community 63"
Cohesion: 0.6
Nodes (5): AdminShell(), getReactRuntime(), PortalShell(), ShellFrame(), SiteShell()

### Community 64 - "Community 64"
Cohesion: 0.47
Nodes (4): createAdminEditorPreset(), createReadOnlyEditorPreset(), ReadOnlyEditorRenderer(), renderReadOnlyEditorContent()

### Community 65 - "Community 65"
Cohesion: 0.7
Nodes (3): attachWorkerRpc(), dispatchWorkerRpc(), spawnWorkerSandbox()

### Community 66 - "Community 66"
Cohesion: 0.4
Nodes (1): EditorErrorBoundary

### Community 67 - "Community 67"
Cohesion: 0.5
Nodes (2): post(), setPosts()

### Community 70 - "Community 70"
Cohesion: 0.6
Nodes (3): addMoney(), sameCurrency(), subtractMoney()

### Community 71 - "Community 71"
Cohesion: 0.67
Nodes (2): classifyIntent(), HealthMonitorWidget()

### Community 72 - "Community 72"
Cohesion: 0.83
Nodes (2): NavIcon(), toPascal()

### Community 73 - "Community 73"
Cohesion: 0.67
Nodes (2): hash(), initials()

### Community 76 - "Community 76"
Cohesion: 0.83
Nodes (3): consoleTelemetrySink(), httpBatchTelemetrySink(), installTelemetrySink()

### Community 79 - "Community 79"
Cohesion: 0.83
Nodes (3): createPlatformEditorConfig(), createPlatformEditorExtensions(), usePlatformEditor()

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (2): isSecretKey(), scrubConfig()

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (2): CronBuilder(), describe()

### Community 82 - "Community 82"
Cohesion: 0.67
Nodes (1): SpacerWidget()

### Community 85 - "Community 85"
Cohesion: 0.67
Nodes (1): defineErpResourceMetadata()

### Community 86 - "Community 86"
Cohesion: 0.67
Nodes (1): fieldServiceEvents()

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (2): mockKpis(), mockSeries()

### Community 89 - "Community 89"
Cohesion: 0.67
Nodes (1): activate()

### Community 90 - "Community 90"
Cohesion: 0.67
Nodes (1): bookingEvents()

### Community 92 - "Community 92"
Cohesion: 0.67
Nodes (1): cn()

## Knowledge Gaps
- **3 isolated node(s):** `GoogleAuthError`, `MicrosoftAuthError`, `AiQuotaError`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 24`** (103 nodes): `createGeneratedProviderAdapter()`, `createProviderAdapter()`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`, `adapter.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (101 nodes): `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mappers.ts`, `mapProviderStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (26 nodes): `BusinessAdminPage()`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`, `main.page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (26 nodes): `seedState()`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`, `main.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (7 nodes): `PluginBoundary.js`, `PluginBoundary.tsx`, `DefaultFallback()`, `PluginBoundary`, `.componentDidCatch()`, `.getDerivedStateFromError()`, `.render()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (7 nodes): `App.js`, `App.tsx`, `App()`, `App.tsx`, `App.tsx`, `App.tsx`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (6 nodes): `ApprovalPanel.js`, `ApprovalPanel.tsx`, `ApprovalPanel()`, `handleApprove()`, `handleReject()`, `intent()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (6 nodes): `package.test.ts`, `package.test.ts`, `createFrameworkSourceFixture()`, `createIo()`, `createSplitWorkspaceFixture()`, `hasDirectorySymlinkSupport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (5 nodes): `EditorErrorBoundary.js`, `EditorErrorBoundary`, `.componentDidCatch()`, `.getDerivedStateFromError()`, `.render()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (5 nodes): `community-pages.tsx`, `action()`, `on()`, `post()`, `setPosts()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (4 nodes): `HealthMonitorWidget.js`, `HealthMonitorWidget.tsx`, `classifyIntent()`, `HealthMonitorWidget()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (4 nodes): `NavIcon.js`, `NavIcon.tsx`, `NavIcon()`, `toPascal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (4 nodes): `Avatar.js`, `Avatar.tsx`, `hash()`, `initials()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (3 nodes): `storage.ts`, `isSecretKey()`, `scrubConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (3 nodes): `CronBuilder.tsx`, `CronBuilder()`, `describe()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (3 nodes): `SpacerWidget.js`, `SpacerWidget.tsx`, `SpacerWidget()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (3 nodes): `erp-metadata.js`, `erp-metadata.ts`, `defineErpResourceMetadata()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (3 nodes): `field-service-pages.js`, `field-service-pages.tsx`, `fieldServiceEvents()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (3 nodes): `hr-payroll-archetype.tsx`, `mockKpis()`, `mockSeries()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (3 nodes): `plugin.tsx`, `plugin.tsx`, `activate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (3 nodes): `BookingCalendarPage.js`, `BookingCalendarPage.tsx`, `bookingEvents()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (3 nodes): `cn.js`, `cn.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `String()` connect `Community 7` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 24`, `Community 27`, `Community 29`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 40`, `Community 44`, `Community 48`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Why does `replace()` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 21`, `Community 22`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 33`, `Community 34`, `Community 35`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 44`, `Community 46`, `Community 48`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `parse()` connect `Community 8` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 9`, `Community 11`, `Community 12`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 24`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 43`, `Community 44`, `Community 48`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 252 inferred relationships involving `String()` (e.g. with `setup()` and `code()`) actually correct?**
  _`String()` has 252 INFERRED edges - model-reasoned connections that need verification._
- **Are the 169 inferred relationships involving `parse()` (e.g. with `readGutuPlugins()` and `migrate()`) actually correct?**
  _`parse()` has 169 INFERRED edges - model-reasoned connections that need verification._
- **Are the 201 inferred relationships involving `replace()` (e.g. with `personEmail()` and `personEmail()`) actually correct?**
  _`replace()` has 201 INFERRED edges - model-reasoned connections that need verification._
- **Are the 127 inferred relationships involving `set()` (e.g. with `authedFetch()` and `authedFetch()`) actually correct?**
  _`set()` has 127 INFERRED edges - model-reasoned connections that need verification._