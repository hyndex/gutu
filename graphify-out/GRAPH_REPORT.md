# Graph Report - quirky-meninsky-fa348a  (2026-04-26)

## Corpus Check
- 627 files · ~585,081 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2783 nodes · 4937 edges · 47 communities detected
- Extraction: 68% EXTRACTED · 32% INFERRED · 0% AMBIGUOUS · INFERRED: 1586 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]

## God Nodes (most connected - your core abstractions)
1. `replace()` - 112 edges
2. `String()` - 110 edges
3. `parse()` - 70 edges
4. `run()` - 70 edges
5. `nowIso()` - 54 edges
6. `json()` - 49 edges
7. `scaffoldBusinessPlugin()` - 48 edges
8. `apiFetch()` - 35 edges
9. `useAllRecords()` - 34 edges
10. `MicrosoftDriver` - 30 edges

## Surprising Connections (you probably didn't know these)
- `String()` --calls--> `escapeTsString()`  [INFERRED]
  admin-panel/src/examples/_factory/detailFromZod.tsx → tooling/plugin-docs/generate.mjs
- `buildBasePathMap()` --calls--> `walk()`  [INFERRED]
  admin-panel/src/examples/_factory/richDetailFactory.tsx → tooling/library-docs/lib.mjs
- `walkParts()` --calls--> `walk()`  [INFERRED]
  admin-panel/backend/src/lib/mail/driver/google.ts → tooling/library-docs/lib.mjs
- `collectBodies()` --calls--> `walk()`  [INFERRED]
  admin-panel/backend/src/lib/mail/mime/parser.ts → tooling/library-docs/lib.mjs
- `log()` --calls--> `main()`  [INFERRED]
  admin-panel/scripts/gutu-plugin.mjs → tooling/business-os/scaffold.mjs

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (175): grantAcl(), purgeAclForRecord(), revokeAcl(), roleAtLeast(), roleFromLinkToken(), seedDefaultAcl(), all(), asRecord() (+167 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (125): code(), count(), personName(), pick(), seedAssetsExtended(), seedIf(), count(), personEmail() (+117 more)

### Community 2 - "Community 2"
Cohesion: 0.01
Nodes (51): fetchAll(), monthKey(), fetchAll(), fetchAll(), fetchAll(), fetchAll(), fetchAll(), fetchAll() (+43 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (87): formatAddresses(), imageProxyHref(), appendAlternative(), appendAttachment(), appendBodyPart(), buildMessage(), encodeHeader(), newMessageId() (+79 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (114): buildImportList(), capitalize(), createDocsCheckScript(), createSummaryScript(), createWorkspaceRunnerScript(), describeUiSurface(), ensureScripts(), escapeTsString() (+106 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (74): runOrError(), safeJson(), apiBase(), createEditorRecord(), createPublicLink(), deleteEditorRecord(), fetchEditorRecord(), fetchSnapshot() (+66 more)

### Community 6 - "Community 6"
Cohesion: 0.03
Nodes (67): aggregate(), bucketKey(), computeAggregation(), evalFilter(), evalLeaf(), previousRange(), buildDomainPlugin(), buildResource() (+59 more)

### Community 7 - "Community 7"
Cohesion: 0.03
Nodes (62): compileBiQuery(), createBiChart(), createBiDashboard(), createBiSchedule(), createBiShare(), createBiSpace(), drillDownBiQuery(), fetchBiCatalog() (+54 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (51): send(), decodeKeyMaterial(), decryptBytes(), decryptString(), encryptBytes(), encryptString(), findKey(), getPrimaryKeyVersion() (+43 more)

### Community 9 - "Community 9"
Cohesion: 0.03
Nodes (69): addLeaf(), emit(), emptyLeaf(), isLeaf(), removeAt(), updateAt(), toSnakeCase(), toggleAll() (+61 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (64): accessibleRecordIds(), effectiveRole(), listAcl(), AnalyticsEmitterImpl, createAnalytics(), ensureSessionId(), onDragEnd(), checkCronWorkflows() (+56 more)

### Community 11 - "Community 11"
Cohesion: 0.04
Nodes (57): AdminInner(), AppShell(), useLiveAudit(), AutomationRunDetailPage(), BookingDashboardKpis(), pct(), useRuntime(), CrmOverviewPage() (+49 more)

### Community 12 - "Community 12"
Cohesion: 0.05
Nodes (75): buildDependencyContractsFromLists(), dedupeList(), deriveSuggestedPackIds(), main(), renderActions(), renderAdminContributions(), renderAdminPage(), renderBusinessPackAutomation() (+67 more)

### Community 13 - "Community 13"
Cohesion: 0.04
Nodes (38): decodeEncodedWords(), formatAddress(), isValidEmail(), normalizeEmail(), normalizeSubject(), parseAddress(), parseAddressList(), splitAddressList() (+30 more)

### Community 14 - "Community 14"
Cohesion: 0.04
Nodes (39): bootstrapStorage(), localDefaultConfig(), parseStorageBackendsEnv(), s3DefaultFromEnv(), close(), AccessDenied, ChecksumMismatch, InvalidKey (+31 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (10): folderToSystemLabel(), ImapClient, ImapError, parseIdleLine(), tokenize(), dotStuff(), ImapDriver, sendSmtp() (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (53): handleApply(), checkCatalog(), checkPluginDocs(), main(), missingHeadings(), placeholderFailures(), handler(), cmdCreate() (+45 more)

### Community 17 - "Community 17"
Cohesion: 0.04
Nodes (30): createActivationEngine(), colorForUser(), connectCollab(), wsBase(), disable(), enable(), createRuntime(), start() (+22 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (39): envEnum(), envFlag(), envInt(), loadConfig(), resetConfig(), locales(), t(), dbx() (+31 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (27): buildPluginContext(), CapabilityError, createContributionStore(), makeAnalytics(), makeAssetResolver(), makeContributions(), makeI18n(), makeLogger() (+19 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (32): AiProviderError, AiQuotaError, cost(), redactPII(), runAnthropic(), runChat(), runGroq(), runOllama() (+24 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (27): advances(), appraisals(), attendance(), code(), count(), departments(), designations(), employees() (+19 more)

### Community 22 - "Community 22"
Cohesion: 0.15
Nodes (17): bootstrapMailJobs(), registerMailCleanup(), registerMailIndex(), registerMailPush(), registerMailReconcile(), registerMailSend(), registerMailSnooze(), registerMailSubscription() (+9 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (15): bankAccounts(), bankTransactions(), budgets(), code(), costCenters(), count(), currencyRates(), dunning() (+7 more)

### Community 24 - "Community 24"
Cohesion: 0.13
Nodes (6): fmt(), formatValue(), cn(), fmt(), fmt(), if()

### Community 25 - "Community 25"
Cohesion: 0.21
Nodes (3): PostgresDbx, translateJsonExtract(), translateQmarkToDollar()

### Community 26 - "Community 26"
Cohesion: 0.24
Nodes (7): h(), buildShareableUrl(), getCurrentRoutePath(), parseHash(), useUrlJsonParam(), useUrlParam(), useUrlParams()

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (3): dealStageLabel(), pick(), dealStageIntent()

### Community 28 - "Community 28"
Cohesion: 0.2
Nodes (2): MailAvatar(), avatarColor()

### Community 29 - "Community 29"
Cohesion: 0.24
Nodes (4): explorePathForQuery(), parseQueryState(), queryFromHash(), serializeQueryState()

### Community 31 - "Community 31"
Cohesion: 0.31
Nodes (5): formatCurrency(), formatDate(), formatDateTime(), formatNumber(), renderCellValue()

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (3): loadPersonalization(), saveEdit(), savePersonalization()

### Community 33 - "Community 33"
Cohesion: 0.52
Nodes (6): globRoots(), listStandaloneRoots(), listTrackedOffenders(), listVisibleStandaloneStatus(), runGit(), safeList()

### Community 34 - "Community 34"
Cohesion: 0.53
Nodes (5): containsLookalike(), looksLikeBrandImpersonation(), parseAuthResults(), phishHeuristics(), splitMethods()

### Community 35 - "Community 35"
Cohesion: 0.33
Nodes (3): BarChart(), niceScale(), LineChart()

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (1): PluginBoundary

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (3): ConnectionsTab(), IdentitiesTab(), useConnections()

### Community 39 - "Community 39"
Cohesion: 0.47
Nodes (3): getTheme(), setTheme(), toggleTheme()

### Community 40 - "Community 40"
Cohesion: 0.4
Nodes (1): Toolbar()

### Community 41 - "Community 41"
Cohesion: 0.5
Nodes (2): post(), setPosts()

### Community 43 - "Community 43"
Cohesion: 0.83
Nodes (3): parseMailto(), parseRfcUnsubscribe(), parseUnsubscribe()

### Community 44 - "Community 44"
Cohesion: 0.83
Nodes (3): formatRel(), FreshnessIndicator(), toMillis()

### Community 46 - "Community 46"
Cohesion: 0.67
Nodes (2): attachRpcHandler(), spawnIframeSandbox()

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (2): attachWorkerRpc(), spawnWorkerSandbox()

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (2): isSecretKey(), scrubConfig()

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (2): NavIcon(), toPascal()

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (1): activate()

## Knowledge Gaps
- **4 isolated node(s):** `GoogleAuthError`, `MicrosoftAuthError`, `AiQuotaError`, `AiProviderError`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 28`** (10 nodes): `Avatar.tsx`, `format.ts`, `MailAvatar()`, `avatarColor()`, `formatAddressList()`, `formatBytes()`, `formatRecipientShort()`, `formatRelativeTime()`, `initials()`, `snoozePresets()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (6 nodes): `PluginBoundary.tsx`, `DefaultFallback()`, `PluginBoundary`, `.componentDidCatch()`, `.getDerivedStateFromError()`, `.render()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (5 nodes): `Toolbar.tsx`, `Toolbar.tsx`, `Btn()`, `Toolbar()`, `ToolbarSeparator()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (5 nodes): `community-pages.tsx`, `action()`, `on()`, `post()`, `setPosts()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (4 nodes): `iframeSandbox.tsx`, `attachRpcHandler()`, `dispatchRpc()`, `spawnIframeSandbox()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (4 nodes): `workerSandbox.ts`, `attachWorkerRpc()`, `dispatchWorkerRpc()`, `spawnWorkerSandbox()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (3 nodes): `storage.ts`, `isSecretKey()`, `scrubConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (3 nodes): `NavIcon.tsx`, `NavIcon()`, `toPascal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (3 nodes): `plugin.tsx`, `plugin.tsx`, `activate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `replace()` connect `Community 3` to `Community 0`, `Community 1`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 25`?**
  _High betweenness centrality (0.207) - this node is a cross-community bridge._
- **Why does `String()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 15`, `Community 16`, `Community 18`, `Community 20`, `Community 21`, `Community 23`, `Community 24`, `Community 26`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **Why does `parse()` connect `Community 0` to `Community 32`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 44`, `Community 13`, `Community 14`, `Community 17`, `Community 19`, `Community 20`, `Community 29`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Are the 110 inferred relationships involving `replace()` (e.g. with `personEmail()` and `personEmail()`) actually correct?**
  _`replace()` has 110 INFERRED edges - model-reasoned connections that need verification._
- **Are the 109 inferred relationships involving `String()` (e.g. with `setup()` and `code()`) actually correct?**
  _`String()` has 109 INFERRED edges - model-reasoned connections that need verification._
- **Are the 66 inferred relationships involving `parse()` (e.g. with `readGutuPlugins()` and `migrate()`) actually correct?**
  _`parse()` has 66 INFERRED edges - model-reasoned connections that need verification._
- **Are the 66 inferred relationships involving `run()` (e.g. with `migrate()` and `resolveAuthUser()`) actually correct?**
  _`run()` has 66 INFERRED edges - model-reasoned connections that need verification._