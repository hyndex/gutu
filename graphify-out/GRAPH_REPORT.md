# Graph Report - quirky-meninsky-fa348a  (2026-04-25)

## Corpus Check
- 569 files · ~500,590 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2427 nodes · 3995 edges · 53 communities detected
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 1120 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]

## God Nodes (most connected - your core abstractions)
1. `replace()` - 93 edges
2. `run()` - 53 edges
3. `parse()` - 51 edges
4. `scaffoldBusinessPlugin()` - 48 edges
5. `nowIso()` - 42 edges
6. `useAllRecords()` - 34 edges
7. `MicrosoftDriver` - 30 edges
8. `ImapClient` - 29 edges
9. `seedAll()` - 28 edges
10. `GoogleDriver` - 27 edges

## Surprising Connections (you probably didn't know these)
- `buildBasePathMap()` --calls--> `walk()`  [INFERRED]
  admin-panel/src/examples/_factory/richDetailFactory.tsx → tooling/library-docs/lib.mjs
- `walkParts()` --calls--> `walk()`  [INFERRED]
  admin-panel/backend/src/lib/mail/driver/google.ts → tooling/library-docs/lib.mjs
- `collectBodies()` --calls--> `walk()`  [INFERRED]
  admin-panel/backend/src/lib/mail/mime/parser.ts → tooling/library-docs/lib.mjs
- `log()` --calls--> `main()`  [INFERRED]
  admin-panel/scripts/gutu-plugin.mjs → tooling/business-os/scaffold.mjs
- `cmdCreate()` --calls--> `writeFile()`  [INFERRED]
  admin-panel/scripts/gutu-plugin.mjs → tooling/plugin-docs/generate.mjs

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (137): isValidEmail(), registerAffineEditorContainer(), runOrError(), recordAudit(), createSession(), currentUser(), deleteSession(), getSessionUser() (+129 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (45): fetchAll(), fetchAll(), fetchAll(), fetchAll(), fetchAll(), fetchAll(), fetchAll(), fetchAll() (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (96): bankAccounts(), bankTransactions(), budgets(), costCenters(), count(), currencyRates(), dunning(), fiscalYears() (+88 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (90): decodeEncodedWords(), formatAddress(), formatAddresses(), normalizeEmail(), normalizeSubject(), parseAddress(), parseAddressList(), splitAddressList() (+82 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (111): buildImportList(), capitalize(), createDocsCheckScript(), createSummaryScript(), createWorkspaceRunnerScript(), describeUiSurface(), ensureScripts(), hasExportName() (+103 more)

### Community 5 - "Community 5"
Cohesion: 0.03
Nodes (65): GutuAffineEditorContainer, toggleAll(), toggleRow(), classify(), groupFieldsSemantically(), findColumn(), handleDragEnd(), handleDragOver() (+57 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (53): createActivationEngine(), apiBase(), createEditorRecord(), deleteEditorRecord(), fetchEditorRecord(), fetchSnapshot(), getAuthHeaders(), listEditorRecords() (+45 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (54): AdminInner(), AppShell(), useLiveAudit(), AutomationRunDetailPage(), BookingDashboardKpis(), pct(), useRuntime(), CrmOverviewPage() (+46 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (75): buildDependencyContractsFromLists(), dedupeList(), deriveSuggestedPackIds(), main(), renderActions(), renderAdminContributions(), renderAdminPage(), renderBusinessPackAutomation() (+67 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (53): handleApply(), checkCatalog(), checkPluginDocs(), main(), missingHeadings(), placeholderFailures(), handler(), cmdCreate() (+45 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (35): bootstrapStorage(), localDefaultConfig(), parseStorageBackendsEnv(), s3DefaultFromEnv(), resetConfig(), close(), create(), getTenantContext() (+27 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (22): send(), fromAsyncIterable(), fromChunk(), fromIterable(), toReadableStream(), seedFactory(), writeFile(), joinTenantKey() (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (9): logout(), ImapClient, ImapError, parseIdleLine(), tokenize(), dotStuff(), ImapDriver, sendSmtp() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (38): decodeKeyMaterial(), decryptBytes(), decryptString(), encryptBytes(), encryptString(), findKey(), getPrimaryKeyVersion(), hmacHex() (+30 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (29): ApiError, apiFetch(), AuthStore, fetchMemberships(), fetchPlatformConfig(), login(), signup(), switchTenant() (+21 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (37): envEnum(), envFlag(), envInt(), loadConfig(), locales(), t(), dbx(), fetch() (+29 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (8): create(), base64ToBytes(), MicrosoftAuthError, MicrosoftDriver, MicrosoftRetryableError, PostgresDbx, translateJsonExtract(), translateQmarkToDollar()

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (25): buildDomainPlugin(), buildResource(), detailViewFromZod(), if(), formViewFromZod(), humanize(), inferField(), unwrap() (+17 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (15): AnalyticsEmitterImpl, createAnalytics(), ensureSessionId(), createRuntime(), createCapabilityRegistry(), createFeatureFlags(), createPermissionEvaluator(), evalCondition() (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (26): advances(), appraisals(), attendance(), count(), departments(), designations(), employees(), expenseClaims() (+18 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (18): buildPluginContext(), CapabilityError, createContributionStore(), makeAnalytics(), makeAssetResolver(), makeContributions(), makeI18n(), makeLogger() (+10 more)

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (19): batches(), bins(), count(), deliveryNotes(), deliveryTrips(), items(), itemSuppliers(), landedCosts() (+11 more)

### Community 22 - "Community 22"
Cohesion: 0.19
Nodes (17): applyStructuredFilter(), bufferToFloat32(), magnitude(), runFts(), runRecent(), runVector(), search(), compileOperatorTerm() (+9 more)

### Community 23 - "Community 23"
Cohesion: 0.2
Nodes (13): cannedResponses(), count(), csatResponses(), escalations(), kbArticles(), personName(), pick(), seedIf() (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (9): AccessDenied, ChecksumMismatch, InvalidKey, isRetryableByDefault(), isStorageError(), ObjectNotFound, PayloadTooLarge, StorageError (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (10): download(), run(), remove(), addTrustedKey(), base64ToBytes(), loadTrustedKeys(), removeTrustedKey(), saveTrustedKeys() (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (5): fmt(), formatValue(), cn(), fmt(), fmt()

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (3): dealStageLabel(), pick(), dealStageIntent()

### Community 28 - "Community 28"
Cohesion: 0.2
Nodes (2): MailAvatar(), avatarColor()

### Community 29 - "Community 29"
Cohesion: 0.47
Nodes (2): MockBackend, sleep()

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (7): cmp(), eq(), evalFilter(), evalLeaf(), getPath(), relativeRange(), toTime()

### Community 31 - "Community 31"
Cohesion: 0.28
Nodes (3): personEmail(), personName(), pick()

### Community 33 - "Community 33"
Cohesion: 0.31
Nodes (5): formatCurrency(), formatDate(), formatDateTime(), formatNumber(), renderCellValue()

### Community 34 - "Community 34"
Cohesion: 0.43
Nodes (6): addLeaf(), emit(), emptyLeaf(), isLeaf(), removeAt(), updateAt()

### Community 35 - "Community 35"
Cohesion: 0.39
Nodes (6): aggregate(), bucketKey(), computeAggregation(), evalFilter(), evalLeaf(), previousRange()

### Community 36 - "Community 36"
Cohesion: 0.43
Nodes (4): buildFilterState(), buildFilterTree(), collapse(), toLeaf()

### Community 37 - "Community 37"
Cohesion: 0.33
Nodes (3): loadPersonalization(), saveEdit(), savePersonalization()

### Community 38 - "Community 38"
Cohesion: 0.52
Nodes (6): globRoots(), listStandaloneRoots(), listTrackedOffenders(), listVisibleStandaloneStatus(), runGit(), safeList()

### Community 39 - "Community 39"
Cohesion: 0.53
Nodes (5): containsLookalike(), looksLikeBrandImpersonation(), parseAuthResults(), phishHeuristics(), splitMethods()

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (3): BarChart(), niceScale(), LineChart()

### Community 41 - "Community 41"
Cohesion: 0.33
Nodes (1): PluginBoundary

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (3): ConnectionsTab(), IdentitiesTab(), useConnections()

### Community 44 - "Community 44"
Cohesion: 0.47
Nodes (3): getTheme(), setTheme(), toggleTheme()

### Community 45 - "Community 45"
Cohesion: 0.4
Nodes (1): ErrorBoundary

### Community 46 - "Community 46"
Cohesion: 0.4
Nodes (2): ThreadView(), useThread()

### Community 47 - "Community 47"
Cohesion: 0.5
Nodes (2): post(), setPosts()

### Community 48 - "Community 48"
Cohesion: 0.83
Nodes (3): parseMailto(), parseRfcUnsubscribe(), parseUnsubscribe()

### Community 49 - "Community 49"
Cohesion: 0.83
Nodes (3): formatRel(), FreshnessIndicator(), toMillis()

### Community 51 - "Community 51"
Cohesion: 0.67
Nodes (2): attachRpcHandler(), spawnIframeSandbox()

### Community 52 - "Community 52"
Cohesion: 0.67
Nodes (2): attachWorkerRpc(), spawnWorkerSandbox()

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (2): isSecretKey(), scrubConfig()

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (2): NavIcon(), toPascal()

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (1): activate()

## Knowledge Gaps
- **4 isolated node(s):** `GoogleAuthError`, `MicrosoftAuthError`, `AiQuotaError`, `AiProviderError`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 28`** (10 nodes): `Avatar.tsx`, `format.ts`, `MailAvatar()`, `avatarColor()`, `formatAddressList()`, `formatBytes()`, `formatRecipientShort()`, `formatRelativeTime()`, `initials()`, `snoozePresets()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (10 nodes): `mockBackend.ts`, `MockBackend`, `.create()`, `.delete()`, `.ensure()`, `.get()`, `.list()`, `.seed()`, `.update()`, `sleep()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (6 nodes): `PluginBoundary.tsx`, `DefaultFallback()`, `PluginBoundary`, `.componentDidCatch()`, `.getDerivedStateFromError()`, `.render()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (5 nodes): `ErrorBoundary.tsx`, `ErrorBoundary`, `.componentDidCatch()`, `.getDerivedStateFromError()`, `.render()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (5 nodes): `ThreadView.tsx`, `use-thread.ts`, `async()`, `ThreadView()`, `useThread()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (5 nodes): `community-pages.tsx`, `action()`, `on()`, `post()`, `setPosts()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (4 nodes): `iframeSandbox.tsx`, `attachRpcHandler()`, `dispatchRpc()`, `spawnIframeSandbox()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (4 nodes): `workerSandbox.ts`, `attachWorkerRpc()`, `dispatchWorkerRpc()`, `spawnWorkerSandbox()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (3 nodes): `storage.ts`, `isSecretKey()`, `scrubConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (3 nodes): `NavIcon.tsx`, `NavIcon()`, `toPascal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (3 nodes): `plugin.tsx`, `plugin.tsx`, `activate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `replace()` connect `Community 3` to `Community 0`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 19`, `Community 20`, `Community 22`, `Community 25`, `Community 31`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **Why does `seedAll()` connect `Community 2` to `Community 0`, `Community 4`, `Community 9`, `Community 11`, `Community 17`, `Community 19`, `Community 21`, `Community 23`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `parse()` connect `Community 0` to `Community 4`, `Community 5`, `Community 6`, `Community 37`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 49`, `Community 18`, `Community 25`, `Community 30`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 91 inferred relationships involving `replace()` (e.g. with `personEmail()` and `personEmail()`) actually correct?**
  _`replace()` has 91 INFERRED edges - model-reasoned connections that need verification._
- **Are the 49 inferred relationships involving `run()` (e.g. with `seedUsers()` and `insert()`) actually correct?**
  _`run()` has 49 INFERRED edges - model-reasoned connections that need verification._
- **Are the 47 inferred relationships involving `parse()` (e.g. with `readGutuPlugins()` and `parseStorageBackendsEnv()`) actually correct?**
  _`parse()` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 41 inferred relationships involving `nowIso()` (e.g. with `seedUsers()` and `seedMail()`) actually correct?**
  _`nowIso()` has 41 INFERRED edges - model-reasoned connections that need verification._