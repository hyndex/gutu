import { describe, expect, it } from "bun:test";

import { adminContributions } from "../../src/ui/admin.contributions";
import { uiSurface } from "../../src/ui/surfaces";

describe("ui surface registration", () => {
  it("keeps a compatibility admin page for booking review", () => {
    expect(uiSurface.embeddedPages).toHaveLength(1);
    expect(uiSurface.embeddedPages[0]?.route).toBe("/admin/booking-reservations");
  });

  it("registers booking reservation surfaces in the shared booking workspace", () => {
    expect(adminContributions.pages[0]?.route).toBe("/admin/booking/reservations");
    expect(adminContributions.commands[0]?.href).toBe("/admin/booking/reservations");
  });
});
