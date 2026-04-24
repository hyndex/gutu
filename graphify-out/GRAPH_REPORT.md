# Graph Report - quizzical-lamport-bd9d37  (2026-04-25)

## Corpus Check
- 391 files · ~421,498 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1699 nodes · 2583 edges · 42 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 589 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]

## God Nodes (most connected - your core abstractions)
1. `scaffoldBusinessPlugin()` - 48 edges
2. `replace()` - 39 edges
3. `useAllRecords()` - 34 edges
4. `seedAll()` - 26 edges
5. `scaffoldBusinessPackCatalog()` - 26 edges
6. `extractLibraryFacts()` - 26 edges
7. `extractPluginFacts()` - 25 edges
8. `seedHrPayrollExtended()` - 23 edges
9. `parse()` - 22 edges
10. `run()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `buildBasePathMap()` --calls--> `walk()`  [INFERRED]
  admin-panel/src/examples/_factory/richDetailFactory.tsx → tooling/library-docs/lib.mjs
- `log()` --calls--> `main()`  [INFERRED]
  admin-panel/scripts/gutu-plugin.mjs → tooling/business-os/scaffold.mjs
- `log()` --calls--> `main()`  [INFERRED]
  admin-panel/scripts/gutu-plugin.mjs → tooling/plugin-docs/check.mjs
- `cmdCreate()` --calls--> `writeFile()`  [INFERRED]
  admin-panel/scripts/gutu-plugin.mjs → tooling/plugin-docs/generate.mjs
- `replace()` --calls--> `sanitizeTarget()`  [INFERRED]
  admin-panel/src/admin-primitives/QueryBuilder.tsx → tooling/business-os/run-resilience-flows.mjs

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (42): fetchAll(), fetchAll(), fetchAll(), fetchAll(), fetchAll(), fetchAll(), fetchAll(), fetchAll() (+34 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (84): bankAccounts(), bankTransactions(), budgets(), costCenters(), count(), currencyRates(), dunning(), fiscalYears() (+76 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (110): buildImportList(), capitalize(), createDocsCheckScript(), createSummaryScript(), createWorkspaceRunnerScript(), describeUiSurface(), ensureScripts(), hasExportName() (+102 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (45): addLeaf(), emit(), emptyLeaf(), isLeaf(), removeAt(), updateAt(), toggleAll(), toggleRow() (+37 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (30): createActivationEngine(), handleApply(), ApiError, apiFetch(), AuthStore, fetchMemberships(), fetchPlatformConfig(), login() (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (55): recordAudit(), createSession(), currentUser(), deleteSession(), getSessionUser(), getUserByEmail(), getUserById(), hashPassword() (+47 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (75): buildDependencyContractsFromLists(), dedupeList(), deriveSuggestedPackIds(), main(), renderActions(), renderAdminContributions(), renderAdminPage(), renderBusinessPackAutomation() (+67 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (20): send(), fromAsyncIterable(), fromChunk(), fromIterable(), toReadableStream(), writeFile(), joinTenantKey(), validateObjectKey() (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (46): cmdCreate(), cmdHelp(), cmdList(), cmdValidate(), die(), exists(), findIndex(), log() (+38 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (26): count(), personEmail(), personName(), pick(), seedAuthExtended(), seedIf(), sanitizeForHeader(), personEmail() (+18 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (20): bootstrapStorage(), localDefaultConfig(), parseStorageBackendsEnv(), s3DefaultFromEnv(), close(), getTenantContext(), addNote(), dealBadgeIntent() (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.1
Nodes (33): envEnum(), envFlag(), envInt(), loadConfig(), dbx(), fetch(), open(), resolveWsSession() (+25 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (19): AdminInner(), AppShell(), useLiveAudit(), useRuntime(), RichZodDetailPage(), useList(), useRecord(), LiveDnDKanban() (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (36): AutomationRunDetailPage(), BookingDashboardKpis(), pct(), CrmOverviewPage(), useActivities(), useContacts(), useDeals(), useEdges() (+28 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (13): AnalyticsEmitterImpl, createAnalytics(), ensureSessionId(), createRuntime(), createCapabilityRegistry(), createFeatureFlags(), FeatureFlagStoreImpl, createPermissionEvaluator() (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (20): buildDomainPlugin(), buildResource(), detailViewFromZod(), if(), formViewFromZod(), humanize(), inferField(), unwrap() (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (26): advances(), appraisals(), attendance(), count(), departments(), designations(), employees(), expenseClaims() (+18 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (18): buildPluginContext(), CapabilityError, createContributionStore(), makeAnalytics(), makeAssetResolver(), makeContributions(), makeI18n(), makeLogger() (+10 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (15): appointments(), campaigns(), code(), competitors(), contracts(), count(), leads(), marketSegments() (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (19): batches(), bins(), count(), deliveryNotes(), deliveryTrips(), items(), itemSuppliers(), landedCosts() (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (8): AccessDenied, ChecksumMismatch, InvalidKey, isRetryableByDefault(), ObjectNotFound, PayloadTooLarge, StorageError, Unsupported

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (5): fmt(), formatValue(), cn(), fmt(), fmt()

### Community 22 - "Community 22"
Cohesion: 0.26
Nodes (4): token(), uuid(), MockBackend, sleep()

### Community 23 - "Community 23"
Cohesion: 0.22
Nodes (8): remove(), addTrustedKey(), base64ToBytes(), loadTrustedKeys(), removeTrustedKey(), saveTrustedKeys(), verifyAgainstTrustedKeys(), verifySignature()

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (3): dealStageLabel(), pick(), dealStageIntent()

### Community 25 - "Community 25"
Cohesion: 0.31
Nodes (5): count(), personName(), pick(), seedFieldServiceExtended(), seedIf()

### Community 27 - "Community 27"
Cohesion: 0.31
Nodes (5): formatCurrency(), formatDate(), formatDateTime(), formatNumber(), renderCellValue()

### Community 28 - "Community 28"
Cohesion: 0.39
Nodes (5): checkCatalog(), checkPluginDocs(), main(), missingHeadings(), placeholderFailures()

### Community 29 - "Community 29"
Cohesion: 0.39
Nodes (6): aggregate(), bucketKey(), computeAggregation(), evalFilter(), evalLeaf(), previousRange()

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (3): fetchAll(), inDateRange(), parseDate()

### Community 31 - "Community 31"
Cohesion: 0.43
Nodes (4): buildFilterState(), buildFilterTree(), collapse(), toLeaf()

### Community 32 - "Community 32"
Cohesion: 0.52
Nodes (6): globRoots(), listStandaloneRoots(), listTrackedOffenders(), listVisibleStandaloneStatus(), runGit(), safeList()

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (3): BarChart(), niceScale(), LineChart()

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (1): PluginBoundary

### Community 35 - "Community 35"
Cohesion: 0.47
Nodes (3): getTheme(), setTheme(), toggleTheme()

### Community 36 - "Community 36"
Cohesion: 0.4
Nodes (1): ErrorBoundary

### Community 37 - "Community 37"
Cohesion: 0.5
Nodes (2): post(), setPosts()

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (2): attachRpcHandler(), spawnIframeSandbox()

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (2): attachWorkerRpc(), spawnWorkerSandbox()

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (2): isSecretKey(), scrubConfig()

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (2): NavIcon(), toPascal()

### Community 46 - "Community 46"
Cohesion: 0.67
Nodes (1): activate()

## Knowledge Gaps
- **Thin community `Community 34`** (6 nodes): `PluginBoundary.tsx`, `DefaultFallback()`, `PluginBoundary`, `.componentDidCatch()`, `.getDerivedStateFromError()`, `.render()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (5 nodes): `ErrorBoundary.tsx`, `ErrorBoundary`, `.componentDidCatch()`, `.getDerivedStateFromError()`, `.render()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (5 nodes): `community-pages.tsx`, `action()`, `on()`, `post()`, `setPosts()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (4 nodes): `iframeSandbox.tsx`, `attachRpcHandler()`, `dispatchRpc()`, `spawnIframeSandbox()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (4 nodes): `workerSandbox.ts`, `attachWorkerRpc()`, `dispatchWorkerRpc()`, `spawnWorkerSandbox()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (3 nodes): `storage.ts`, `isSecretKey()`, `scrubConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (3 nodes): `NavIcon.tsx`, `NavIcon()`, `toPascal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (3 nodes): `plugin.tsx`, `plugin.tsx`, `activate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `replace()` connect `Community 9` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 15`, `Community 16`, `Community 17`, `Community 22`, `Community 23`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Why does `seedAll()` connect `Community 1` to `Community 2`, `Community 5`, `Community 8`, `Community 9`, `Community 16`, `Community 18`, `Community 19`, `Community 25`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Why does `SavedViewManager()` connect `Community 12` to `Community 0`, `Community 5`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `replace()` (e.g. with `personEmail()` and `personEmail()`) actually correct?**
  _`replace()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 32 inferred relationships involving `useAllRecords()` (e.g. with `BookingDashboardKpis()` and `useBookingKpi()`) actually correct?**
  _`useAllRecords()` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 25 inferred relationships involving `seedAll()` (e.g. with `migrate()` and `seedUsers()`) actually correct?**
  _`seedAll()` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._