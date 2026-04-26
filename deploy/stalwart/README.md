# Self-hosted mail server for Gutu (Stalwart + Postgres + MinIO)

This directory ships a production-ready Docker Compose stack that brings up a
self-hosted mail backend the Gutu admin panel can talk to via JMAP.

The framework's mail UI, search, AI categorisation, rules engine, and
contact-touch layer all stay the same. Only the wire-protocol layer changes:
instead of pulling from Gmail/Outlook over OAuth, the JMAP driver in
[`admin-panel/backend/src/lib/mail/driver/jmap.ts`](../../admin-panel/backend/src/lib/mail/driver/jmap.ts)
talks to your Stalwart instance.

## Architecture

```
[ public internet ]
       │ port 25 / 465 / 587  (SMTP)
       │ port 993             (IMAPS)
       ▼
   ┌────────────┐
   │  Stalwart  │ ── Postgres ── relational metadata (accounts, message index)
   │            │ ── MinIO    ── raw RFC822 + attachment blobs (S3-compatible)
   └────────────┘
       ▲
       │ JMAP (HTTPS, JSON)
       │
[ admin-panel/backend ] ── existing mail UI, search, AI, rules
```

Everything in the application tier (Gutu backend + Stalwart container) is
**stateless**. State lives in two places only: Postgres and the S3-compatible
blob store. Replace either with a managed service (RDS, S3, R2) for HA.

## Quickstart (single VPS)

1. **Pre-requisites**
   - Docker + Docker Compose v2
   - A domain with DNS control (Cloudflare, Route53, …)
   - Public IPv4 (and ideally IPv6) reachable on ports 25 / 465 / 587 / 993 / 8080
   - **Reverse PTR record** pointing your IP back at `mail.<domain>` —
     required for many receivers to accept your outbound mail

2. **Configure secrets**
   ```bash
   cp deploy/stalwart/.env.example deploy/stalwart/.env
   $EDITOR deploy/stalwart/.env   # set strong passwords
   ```

3. **Set the hostname** in [`config.toml`](./config.toml) — change
   `mail.example.com` to your real mail-server hostname.

4. **Bring up the stack**
   ```bash
   docker compose -f deploy/stalwart/docker-compose.yml \
                  --env-file deploy/stalwart/.env \
                  up -d
   ```

5. **Create the first account**
   - Open `http://your-server:8080` (or your reverse-proxy URL)
   - Log in with `admin` / `STALWART_ADMIN_PASSWORD`
   - Settings → Domains → add `your-domain.com`
   - Settings → Accounts → create `you@your-domain.com`

6. **Issue a JMAP token for Gutu**
   - Settings → API Tokens → Create
   - Scope: `urn:ietf:params:jmap:mail`, `urn:ietf:params:jmap:submission`
   - Copy the token (one-time view)

7. **Wire Gutu to Stalwart**
   - In the Gutu admin panel: **Mail → Settings → Self-hosted**
   - Paste the JMAP base URL (`https://mail.your-domain.com`), the API
     token, and your default From address
   - Click **Probe connection** — should report `✓ Reachable`
   - Click **Save**

8. **Publish DNS records**
   - In the same Self-hosted page, scroll to **DNS records**
   - Domain: `your-domain.com`. Mail host: `mail.your-domain.com`
   - DKIM key type: RSA. Get the public key from Stalwart's admin UI:
     Settings → Domains → your-domain → DKIM → copy the public key
   - Click **Generate records**
   - Publish each row at your DNS provider (or paste the zone-file blob
     into BIND / PowerDNS)

9. **Verify deliverability**
   - Send a mail from your-domain.com to `mail-tester.com`
   - Aim for 9/10 or 10/10. SPF/DKIM/DMARC must all be green.

## Reuse the existing Gutu Postgres

If you already run Gutu on Postgres, reuse it instead of standing up a second
instance. Two changes:

1. In `docker-compose.yml`, **delete the `postgres` service** and change
   `depends_on:` of the `stalwart` service.
2. In `config.toml` `[store.postgres]`, point at your existing host and
   set a dedicated database (`CREATE DATABASE stalwart;`) and user.

## TLS

The compose file deliberately doesn't ship Caddy / nginx — front the
`stalwart:8080` JMAP port with whatever reverse proxy you already use.
SMTP TLS (port 465) is handled by Stalwart directly using a certificate it
auto-renews via ACME — set `acme.providers.letsencrypt` in `config.toml`
once you've published the MX record and the world can reach you.

## Backups

| Volume | Strategy |
|---|---|
| `stalwart-postgres` | `pg_dump` to off-host storage, daily |
| `stalwart-minio` | Rclone sync to off-host S3, daily |
| `stalwart-data` | Configuration + ACME certs — re-creatable, low priority |

## Updating

```bash
docker compose -f deploy/stalwart/docker-compose.yml pull
docker compose -f deploy/stalwart/docker-compose.yml up -d
```

Stalwart runs migrations against Postgres on boot. **Take a backup first.**

## Troubleshooting

- **Inbound mail bounces** — check MX + reverse PTR. `dig MX your-domain.com`,
  `dig -x <your-public-ip>`.
- **Outbound mail spam-foldered** — confirm SPF/DKIM/DMARC pass at
  `mail-tester.com`. Common issue: DKIM key mismatch (selector typo).
- **Probe button reports 401** — token lacks the `urn:ietf:params:jmap:mail`
  capability; reissue with the right scope.
- **Probe button reports 404** — base URL wrong. Stalwart serves
  `/.well-known/jmap` from the HTTP listener; should be reachable as
  `https://mail.your-domain.com/.well-known/jmap`.

## Going beyond Compose

The same architecture works on Kubernetes. The future
`gutu-plugin-orchestrator-k8s-core` plugin (T3 in the platform roadmap)
will manage Stalwart as a CRD, but until then operators with a cluster
should use the official Stalwart Helm chart directly.
