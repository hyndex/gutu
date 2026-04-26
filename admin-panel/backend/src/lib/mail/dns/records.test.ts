/** Pure-function tests for the DNS records builder. The strings this
 *  file produces get pasted into operators' DNS panels — every detail
 *  matters (selector subdomain, semicolons in TXT values, key length).
 *  We pin the format here so a refactor doesn't silently emit a record
 *  that breaks SPF/DKIM/DMARC alignment for someone in production. */

import { describe, test, expect } from "bun:test";
import { buildDnsBundle, bundleToZoneFile, isValidDomain, isValidMailHost } from "./records";

const DUMMY_DKIM = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA" + "x".repeat(200);

describe("isValidDomain", () => {
  test("accepts valid hostnames", () => {
    expect(isValidDomain("example.com")).toBe(true);
    expect(isValidDomain("mail.example.co.uk")).toBe(true);
    expect(isValidDomain("a.b.c.d.example.com")).toBe(true);
  });
  test("rejects invalid", () => {
    expect(isValidDomain("")).toBe(false);
    expect(isValidDomain("example")).toBe(false); // no TLD
    expect(isValidDomain("example.")).toBe(false); // trailing dot
    expect(isValidDomain("-bad.com")).toBe(false);
    expect(isValidDomain("..example.com")).toBe(false);
    expect(isValidDomain("a".repeat(254))).toBe(false); // > 253
  });
});

describe("isValidMailHost", () => {
  test("equals or is sub-host of domain", () => {
    expect(isValidMailHost("example.com", "example.com")).toBe(true);
    expect(isValidMailHost("mail.example.com", "example.com")).toBe(true);
    expect(isValidMailHost("smtp.mail.example.com", "example.com")).toBe(true);
  });
  test("rejects unrelated host", () => {
    expect(isValidMailHost("mail.other.com", "example.com")).toBe(false);
    expect(isValidMailHost("nope", "example.com")).toBe(false);
  });
});

describe("buildDnsBundle", () => {
  test("produces canonical MX/SPF/DKIM/DMARC strings", () => {
    const b = buildDnsBundle({
      domain: "example.com",
      mailHost: "mail.example.com",
      dkimPublicKeyBase64: DUMMY_DKIM,
    });
    expect(b.mx).toEqual({ name: "example.com", value: "mail.example.com.", priority: 10 });
    expect(b.spf.name).toBe("example.com");
    expect(b.spf.value).toBe("v=spf1 mx a:mail.example.com -all");
    expect(b.dkim.name).toBe("default._domainkey.example.com");
    expect(b.dkim.value).toContain("v=DKIM1");
    expect(b.dkim.value).toContain("k=rsa");
    expect(b.dkim.value).toContain(`p=${DUMMY_DKIM}`);
    expect(b.dmarc.name).toBe("_dmarc.example.com");
    expect(b.dmarc.value).toContain("v=DMARC1");
    expect(b.dmarc.value).toContain("p=none");
    expect(b.dmarc.value).toContain("rua=mailto:dmarc-reports@example.com");
  });

  test("respects custom selector + ed25519 key type", () => {
    const b = buildDnsBundle({
      domain: "example.com",
      mailHost: "mail.example.com",
      dkimSelector: "smtp1",
      dkimKeyType: "ed25519",
      dkimPublicKeyBase64: DUMMY_DKIM,
    });
    expect(b.dkim.name).toBe("smtp1._domainkey.example.com");
    expect(b.dkim.value).toContain("k=ed25519");
  });

  test("DMARC policy escalation", () => {
    for (const policy of ["none", "quarantine", "reject"] as const) {
      const b = buildDnsBundle({
        domain: "example.com",
        mailHost: "mail.example.com",
        dkimPublicKeyBase64: DUMMY_DKIM,
        dmarcPolicy: policy,
      });
      expect(b.dmarc.value).toContain(`p=${policy}`);
      expect(b.dmarc.value).toContain(`sp=${policy}`);
    }
  });

  test("MTA-STS + TLSRPT optional records", () => {
    const b = buildDnsBundle({
      domain: "example.com",
      mailHost: "mail.example.com",
      dkimPublicKeyBase64: DUMMY_DKIM,
      enableMtaSts: true,
      tlsRptEmail: "tls@example.com",
    });
    expect(b.mtaSts?.name).toBe("_mta-sts.example.com");
    expect(b.mtaSts?.value).toContain("v=STSv1");
    expect(b.tlsRpt?.name).toBe("_smtp._tls.example.com");
    expect(b.tlsRpt?.value).toContain("rua=mailto:tls@example.com");
  });

  test("rejects bad input", () => {
    expect(() =>
      buildDnsBundle({
        domain: "not a domain",
        mailHost: "mail.x.com",
        dkimPublicKeyBase64: DUMMY_DKIM,
      }),
    ).toThrow(/invalid domain/);
    expect(() =>
      buildDnsBundle({
        domain: "example.com",
        mailHost: "mail.other.com",
        dkimPublicKeyBase64: DUMMY_DKIM,
      }),
    ).toThrow(/sub-host/);
    expect(() =>
      buildDnsBundle({
        domain: "example.com",
        mailHost: "mail.example.com",
        dkimPublicKeyBase64: "tooshort",
      }),
    ).toThrow(/dkim/i);
  });

  test("zone file lines are well-formed", () => {
    const b = buildDnsBundle({
      domain: "example.com",
      mailHost: "mail.example.com",
      dkimPublicKeyBase64: DUMMY_DKIM,
    });
    const zone = bundleToZoneFile(b);
    expect(zone).toContain("example.com.\t3600\tIN\tMX\t10 mail.example.com.");
    expect(zone).toContain('IN\tTXT\t"v=spf1 mx a:mail.example.com -all"');
    expect(zone).toContain("default._domainkey.example.com.");
  });
});
