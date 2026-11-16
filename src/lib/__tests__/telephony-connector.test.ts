import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GenericRestConnector } from "@/lib/integrations/connectors/generic-rest-connector";

describe("Telephony REST connector", () => {
  it("maps a phone-system call into a canonical voice interaction", async () => {
    const connector = new GenericRestConnector({
      entityType: "call",
      sourceSystemId: "pbx_prod",
      fieldMapping: {
        id: "call.uuid", recordingUrl: "media.url", callerPhone: "from.number",
        customerId: "customer.ref", agentName: "agent.display", startedAt: "time.started",
        durationSeconds: "time.duration", direction: "direction",
      },
    });
    const normalized = await connector.normalizeRecord({
      call: { uuid: "call-101" }, media: { url: "https://phone.example.com/audio/101.mp3" },
      from: { number: "+255712345678" }, customer: { ref: "cust-9" },
      agent: { display: "Amina" }, time: { started: "2026-11-04T09:00:00Z", duration: 142 }, direction: "inbound",
    });
    assert.equal(normalized.entityType, "interaction");
    if (normalized.entityType !== "interaction") return;
    assert.equal(normalized.payload.externalId, "call-101");
    assert.equal(normalized.payload.customer.phone, "+255712345678");
    assert.equal(normalized.payload.agentName, "Amina");
    assert.equal(normalized.payload.durationSeconds, 142);
    assert.equal(normalized.payload.metadata?.recordingUrl, "https://phone.example.com/audio/101.mp3");
  });

  it("rejects call records that do not contain a recording URL", async () => {
    const connector = new GenericRestConnector({ entityType: "call" });
    await assert.rejects(() => connector.normalizeRecord({ id: "call-102" }), /recording URL/i);
  });

  it("converts a Twilio recording resource URI into authenticated MP3 media", async () => {
    const connector = new GenericRestConnector({
      entityType: "call",
      providerProfile: "twilio",
      fieldMapping: { id: "sid", recordingUrl: "uri", customerId: "call_sid" },
    });
    const normalized = await connector.normalizeRecord({
      sid: "RE123",
      call_sid: "CA123",
      uri: "/2010-04-01/Accounts/AC123/Recordings/RE123.json",
    });
    assert.equal(normalized.entityType, "interaction");
    if (normalized.entityType !== "interaction") return;
    assert.equal(normalized.payload.metadata?.recordingUrl, "https://api.twilio.com/2010-04-01/Accounts/AC123/Recordings/RE123.mp3");
  });
});

