import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadAllJourneyRows } from "@/lib/customer-intelligence-query";
describe("Workspace history queries", () => {
  it("includes records beyond the database's default 1000-row limit", async () => {
    const history = Array.from({length:1205}, (_,id) => ({id}));
    const result=await loadAllJourneyRows(async (from,to)=>({data:history.slice(from,to+1),error:null}));
    assert.deepEqual(result.data,history);
  });
  it("does not present partial history as complete when a later page fails", async () => {
    const result=await loadAllJourneyRows(async from=>from===0?{data:Array.from({length:500},(_,id)=>({id})),error:null}:{data:null,error:{message:"Connection lost"}});
    assert.equal(result.data,null);
    assert.equal(result.error?.message,"Connection lost");
  });
});
