import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeRecordingName, recordingIdentityKey } from "@/lib/recording-identity";

describe("Physical recording identity", () => {
  it("recognises the same recording when separate audits have different call IDs", () => {
    const first = recordingIdentityKey({
      callId: "audit-1",
      fileName: "20260814T131240.888Z_1-001786713160.2254033_750014190_255625745607_6223.mp3",
      durationSeconds: 150.1,
    });
    const second = recordingIdentityKey({
      callId: "audit-2",
      fileName: "20260814T131240.888Z_1-001786713160.2254033_750014190_255625745607_6223.mp3",
      durationSeconds: 150.2,
    });
    assert.equal(first, second);
  });

  it("does not merge a later real call from the same customer", () => {
    const first = recordingIdentityKey({ callId: "call-1", fileName: "call-001.mp3", durationSeconds: 150 });
    const later = recordingIdentityKey({ callId: "call-2", fileName: "call-002.mp3", durationSeconds: 150 });
    assert.notEqual(first, later);
  });

  it("does not merge ambiguous generic recording names", () => {
    assert.equal(recordingIdentityKey({ callId: "a", fileName: "recording.mp3", durationSeconds: 30 }), "call:a");
    assert.equal(recordingIdentityKey({ callId: "b", fileName: "recording.mp3", durationSeconds: 30 }), "call:b");
  });

  it("normalises browser copy suffixes without changing the underlying name", () => {
    assert.equal(normalizeRecordingName("Customer-call (1).wav"), "customer call");
  });
});

