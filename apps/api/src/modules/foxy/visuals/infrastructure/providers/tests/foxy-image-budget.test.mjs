import test from 'node:test';
import assert from 'node:assert/strict';
const input=(changes={})=>({inputTokenCap:65536,outputTokenCap:4096,inputUsdPerMillion:'0.25',textOutputUsdPerMillion:'1.50',imageOutputUsdPerMillion:'30',...changes});
const quote=async value=>(await import("../foxy-image-budget.ts")).quoteFoxyImageBudget(value);
test('reserves both full caps using highest output price and exact bigint microUSD ceilings',async()=>{
 assert.equal(await quote(input()),139264n);
 assert.equal(await quote(input({inputTokenCap:1,outputTokenCap:1,inputUsdPerMillion:'0.000001',textOutputUsdPerMillion:'0.000001',imageOutputUsdPerMillion:'0.000001'})),2n);
 assert.equal(await quote(input({inputTokenCap:3,outputTokenCap:7,inputUsdPerMillion:'0.333333',textOutputUsdPerMillion:'2.000001',imageOutputUsdPerMillion:'1.000000'})),16n);
 assert.equal(await quote(input({inputTokenCap:1,outputTokenCap:1,inputUsdPerMillion:'999999.999999',textOutputUsdPerMillion:'999999.999999',imageOutputUsdPerMillion:'1'})),2000000n);
});
test('rate and cap parsing is strict, rejects unknown fields and preserves caller input',async()=>{
 for(const malformed of ['0','-1','+1','01','1.0000000','1e2',' 1','NaN','1000000','',1,null])
  await assert.rejects(()=>quote(input({inputUsdPerMillion:malformed})));
 for(const changes of [{inputTokenCap:0},{inputTokenCap:65537},{outputTokenCap:0},{outputTokenCap:4097},{inputTokenCap:1.5},{outputTokenCap:NaN},{extra:1}])
  await assert.rejects(()=>quote(input(changes)));
 const value=input(),before=structuredClone(value);await quote(value);assert.deepEqual(value,before);
});
test('prices text and image output separately and leaves ambiguous mixed usage unconfirmed', async () => {
 const { priceFoxyImageUsage } = await import('../foxy-image-budget.ts');
 const usage = { inputTokens: 20, outputTokens: 1010, textOutputTokens: 10, imageOutputTokens: 1000 };
 assert.equal(priceFoxyImageUsage(input(), usage), 30020n);
 assert.equal(priceFoxyImageUsage(input(), { inputTokens: 20, outputTokens: 1010 }), null);
 assert.equal(priceFoxyImageUsage(input(), { ...usage, textOutputTokens: 11 }), null);
 assert.equal(priceFoxyImageUsage(input(), { inputTokens: 0, outputTokens: 0 }), 0n);
});
