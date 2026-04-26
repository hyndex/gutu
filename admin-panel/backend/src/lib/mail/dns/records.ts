/** DNS records helper — generates the MX / SPF / DKIM / DMARC strings
 *  the operator needs to publish for inbound mail to land at a self-
 *  hosted mail server.
 *
 *  The framework does NOT publish DNS itself — that's the operator's
 *  job (Cloudflare, Route53, BIND, …). This helper just produces the
 *  exact record values they should paste, derived from the domain name,
 *  the mail server hostname, and (for DKIM) the public key.
 *
 *  Why this matters:
 *    - SPF (`TXT` at apex) → tells receiving servers which IPs are
 *      allowed to send for the domain. Without it, mail lands in spam
 *      or bounces.
 *    - DKIM (`TXT` at `<selector>._domainkey`) → publishes the public
 *      half of the keypair our outbound MTA signs with. Receivers
 *      verify the signature on every inbound piece.
 *    - DMARC (`TXT` at `_dmarc`) → publishes the sender's policy when
 *      SPF/DKIM disagree. Without DMARC, big inboxes (Gmail, O365)
 *      treat the domain as suspicious.
 *    - MX (`MX` at apex or hostname) → tells the world WHERE to deliver
 *      mail addressed to `@<domain>`.
 *
 *  We deliberately keep this side-effect-free — the routes layer reads
 *  the operator's saved domain + DKIM public key and renders the strings
 *  back as plain text + JSON, never touching DNS APIs. */

export interface DnsBundle {
  /** Apex MX record. */
  mx: { name: string; value: string; priority: number };
  /** SPF TXT at apex. */
  spf: { name: string; value: string };
  /** DKIM public key TXT (selector._domainkey.<domain>). */
  dkim: { name: string; value: string };
  /** DMARC policy TXT (_dmarc.<domain>). */
  dmarc: { name: string; value: string };
  /** Optional autodiscovery / autoconfig (Thunderbird, Outlook). */
  autodiscover?: { name: string; value: string; priority: number };
  /** Optional MTA-STS policy host record. */
  mtaSts?: { name: string; value: string };
  /** Optional TLSRPT reporting. */
  tlsRpt?: { name: string; value: string };
}

export interface DnsBundleArgs {
  /** Domain name (e.g., `example.com`). No trailing dot. */
  domain: string;
  /** Mail server hostname — typically `mail.<domain>`. Must resolve to
   *  the public IP that runs the SMTP server. */
  mailHost: string;
  /** DKIM selector — opaque label (default: `default`). */
  dkimSelector?: string;
  /** RSA-2048 or Ed25519 public key bytes (raw key material — base64
   *  encoded — the way DKIM TXT records expect them). */
  dkimPublicKeyBase64: string;
  /** DKIM key type. RSA is the universally supported default. */
  dkimKeyType?: "rsa" | "ed25519";
  /** DMARC policy. Start with `none` to monitor; tighten to
   *  `quarantine` then `reject` after 30 days of clean DMARC reports. */
  dmarcPolicy?: "none" | "quarantine" | "reject";
  /** Where DMARC aggregate reports get mailed. Default:
   *  `dmarc-reports@<domain>`. */
  dmarcRua?: string;
  /** Where DMARC failure reports get mailed (RUF). Often left unset
   *  because of privacy concerns. */
  dmarcRuf?: string;
  /** Email address that receives TLSRPT (TLS reporting) JSON reports. */
  tlsRptEmail?: string;
  /** Whether to include the `mta-sts` TXT + host record. Requires the
   *  operator to host an HTTPS policy file at
   *  `https://mta-sts.<domain>/.well-known/mta-sts.txt`. */
  enableMtaSts?: boolean;
}

/** Validate the domain shape — keeps obviously broken inputs out of
 *  the routes layer's response. RFC 1035 labels, max 253 chars. */
export function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  if (domain.endsWith(".")) return false;
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain);
}

/** Validate the mail host — same rule plus must end with the domain
 *  (or be the domain itself), so SPF + DMARC alignment work. */
export function isValidMailHost(mailHost: string, domain: string): boolean {
  if (!isValidDomain(mailHost)) return false;
  return mailHost === domain || mailHost.endsWith(`.${domain}`);
}

/** Builds every DNS record the operator should publish. Returns plain
 *  data — caller renders it as a table, copies it to a Cloudflare API
 *  call, or stuffs it into a Helm values file. */
export function buildDnsBundle(args: DnsBundleArgs): DnsBundle {
  if (!isValidDomain(args.domain)) {
    throw new Error(`invalid domain: ${args.domain}`);
  }
  if (!isValidMailHost(args.mailHost, args.domain)) {
    throw new Error(
      `mailHost ${args.mailHost} must equal the domain or be a sub-host of it`,
    );
  }
  if (!args.dkimPublicKeyBase64 || args.dkimPublicKeyBase64.length < 100) {
    throw new Error("dkimPublicKeyBase64 looks too short — paste the full public key");
  }

  const selector = args.dkimSelector || "default";
  const dkimType = args.dkimKeyType ?? "rsa";
  const dmarcPolicy = args.dmarcPolicy ?? "none";
  const dmarcRua = args.dmarcRua ?? `mailto:dmarc-reports@${args.domain}`;
  const dmarcRufClause = args.dmarcRuf ? `; ruf=mailto:${args.dmarcRuf.replace(/^mailto:/, "")}` : "";

  const dkimValue = [
    "v=DKIM1",
    `k=${dkimType}`,
    "h=sha256",
    `p=${args.dkimPublicKeyBase64.replace(/\s+/g, "")}`,
  ].join("; ");

  const bundle: DnsBundle = {
    mx: {
      name: args.domain,
      value: `${args.mailHost}.`,
      priority: 10,
    },
    spf: {
      name: args.domain,
      value: `v=spf1 mx a:${args.mailHost} -all`,
    },
    dkim: {
      name: `${selector}._domainkey.${args.domain}`,
      value: dkimValue,
    },
    dmarc: {
      name: `_dmarc.${args.domain}`,
      value: [
        "v=DMARC1",
        `p=${dmarcPolicy}`,
        // Subdomain policy mirrors the parent — keeps single-domain
        // installs simple while still being a deliberate choice.
        `sp=${dmarcPolicy}`,
        "adkim=s",
        "aspf=s",
        `rua=${dmarcRua}`,
        "fo=1",
        "pct=100",
      ].join("; ") + dmarcRufClause,
    },
  };

  if (args.tlsRptEmail) {
    bundle.tlsRpt = {
      name: `_smtp._tls.${args.domain}`,
      value: `v=TLSRPTv1; rua=mailto:${args.tlsRptEmail}`,
    };
  }

  if (args.enableMtaSts) {
    bundle.mtaSts = {
      name: `_mta-sts.${args.domain}`,
      // The operator must also serve mta-sts.txt over HTTPS at
      // mta-sts.<domain>; that's an HTTP concern, not DNS.
      value: `v=STSv1; id=${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    };
  }

  return bundle;
}

/** Render the bundle as zone-file lines — copy/paste-friendly for
 *  operators using BIND, PowerDNS, or anything that imports zone files. */
export function bundleToZoneFile(bundle: DnsBundle, ttl = 3600): string {
  const lines: string[] = [];
  const escape = (s: string) => `"${s.replace(/"/g, '\\"')}"`;
  lines.push(`${bundle.mx.name}.\t${ttl}\tIN\tMX\t${bundle.mx.priority} ${bundle.mx.value}`);
  lines.push(`${bundle.spf.name}.\t${ttl}\tIN\tTXT\t${escape(bundle.spf.value)}`);
  lines.push(`${bundle.dkim.name}.\t${ttl}\tIN\tTXT\t${escape(bundle.dkim.value)}`);
  lines.push(`${bundle.dmarc.name}.\t${ttl}\tIN\tTXT\t${escape(bundle.dmarc.value)}`);
  if (bundle.tlsRpt) {
    lines.push(`${bundle.tlsRpt.name}.\t${ttl}\tIN\tTXT\t${escape(bundle.tlsRpt.value)}`);
  }
  if (bundle.mtaSts) {
    lines.push(`${bundle.mtaSts.name}.\t${ttl}\tIN\tTXT\t${escape(bundle.mtaSts.value)}`);
  }
  return lines.join("\n") + "\n";
}
