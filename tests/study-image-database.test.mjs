import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import test from 'node:test';
import sharp from 'sharp';
import { createStudyImages } from '../apps/api/src/bootstrap/study-images.ts';
import { createStudyService } from '../apps/api/src/bootstrap/study-composition.ts';
import { createStudyHandler } from '../apps/api/src/modules/study/folders/presentation/http.ts';
import { reserveAiMonthlyBudget, settleAiMonthlyBudget } from '../apps/api/src/platform/ai/monthly-budget.ts';
import { proxyStudyRequest } from '../apps/web/src/application/server/study-proxy.ts';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';

function studyDatabase(pool) {
  return { async $transaction(operation) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation({ $queryRawUnsafe: async (sql, ...args) => (await client.query(sql, args)).rows });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  } };
}

async function withServer(handler, operation) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { return await operation(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

test('Study images persist privately, settle both quotas and replay the receipt without dispatching again', { timeout: 90_000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const owner = randomUUID(), stranger = randomUUID();
    for (const id of [owner, stranger]) {
      await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
        VALUES($1,now(),$2,$2,'Synthetic','Study','no-login',now(),'student')`, [id, `${id}@example.invalid`]);
    }
    const database = studyDatabase(pool);
    const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#318864' } }).png().toBuffer();
    const scans = [], prompts = [];
    let damaged = false, counts = 0;
    const images = createStudyImages(database, { async scan(bytes) { scans.push(bytes); } }, {
      ai: { dailyActorRequests: 3, dailyGlobalRequests: 10, dailyBudgetUsd: 10 }, studyQuotaBytes: 2_000_000n,
      foxyVisual: { imageProviderDeadlineMs: 5000, configuration: { enabled: { IMAGE: true }, maxConcurrency: 1, profiles: {
        IMAGE: { kind: 'IMAGE', model: 'gemini-3.1-flash-lite-image', profileVersion: 'foxy-gemini-image-v4', maxInputTokens: 100,
          maxOutputTokens: 100, inputUsdPerMillion: '1', outputUsdPerMillion: '30', textOutputUsdPerMillion: '2', imageOutputUsdPerMillion: '30' },
      } } },
    }, { enabled: true, provider: {
      async countTokens(input) { counts++; assert.deepEqual(input.sources, []); return 5; },
      async generate(input) {
        prompts.push(input.prompt);
        return { bytes: damaged ? Buffer.from('invalid image') : png,
          usage: { inputTokens: 5, outputTokens: 6, textOutputTokens: 2, imageOutputTokens: 4 } };
      },
    } });
    const planFileId = randomUUID();
    const service = createStudyService({ database, images, authenticate: (_tx, request) => request.headers.cookie?.slice('actor='.length),
      files: { async assertOwn(_tx, actor, _folder, file) { assert.equal(actor, owner); assert.equal(file, planFileId); } } });
    const handler = createStudyHandler(service, async () => {});
    await withServer((req, res) => handler(req, res, () => res.writeHead(404).end()), async api => {
      await withServer((req, res) => void proxyStudyRequest(req, res, api), async web => {
        const root = '/api/v1/study-folders', message = 'Ilustrá una célula vegetal.';
        const request = (path, body, actor = owner) => fetch(`${web}${path}`, {
          method: body ? 'POST' : 'GET', headers: { cookie: `actor=${actor}`, 'content-type': 'application/json' },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const created = await request(root, { name: 'Biología', status: 'ACTIVE', academicYear: 2026, bannerKey: 'biology',
          planFileId, units: [{ id: randomUUID(), title: 'Vida', topics: [{ id: randomUUID(), title: 'Célula' }] }] });
        assert.equal(created.status, 200, await created.clone().text());
        const { folder } = await created.json();
        const route = `${root}/${folder.id}`, commands = `${route}/commands`;
        const chatResponse = await request(commands, { action: 'NEW_CONVERSATION', revision: folder.revision, requestId: randomUUID(), title: 'Imágenes' });
        assert.equal(chatResponse.status, 200, await chatResponse.clone().text());
        const chat = await chatResponse.json();
        const command = { action: 'GENERATE', kind: 'IMAGE', requestId: randomUUID(), revision: chat.folder.revision,
          conversationId: chat.result.conversation.id, message };
        const generated = await request(commands, command);
        assert.equal(generated.status, 200, await generated.clone().text());
        const result = await generated.json();
        assert.equal(result.result.creation.kind, 'IMAGE');
        const imagePath = `${route}/images/${result.result.creation.id}`;
        const replay = await request(commands, command);
        assert.equal(replay.status, 200);
        assert.deepEqual((await replay.json()).result, result.result);
        assert.deepEqual(prompts, [message]);
        assert.deepEqual(scans, [png]);
        const detail = await (await request(route)).json();
        assert.equal(detail.imageGenerationAvailable, true);
        assert.equal(detail.creations[0].id, result.result.creation.id);
        const messages = detail.conversations[0].turns;
        assert.equal(messages.find(item => item.role === 'user').generation.status, 'COMPLETE');
        assert.equal(messages.find(item => item.role === 'assistant').creationId, result.result.creation.id);
        const preview = await request(imagePath);
        assert.equal(preview.status, 200);
        assert.equal(preview.headers.get('content-type'), 'image/png');
        assert.equal(preview.headers.get('cache-control'), 'no-store');
        assert.equal(preview.headers.get('cross-origin-resource-policy'), 'same-origin');
        assert.deepEqual(Buffer.from(await preview.arrayBuffer()), png);
        const download = await request(`${imagePath}?mode=download`);
        assert.equal(download.headers.get('content-disposition'), 'attachment; filename="imagen.png"');
        assert.deepEqual(Buffer.from(await download.arrayBuffer()), png);
        assert.equal((await request(imagePath, undefined, stranger)).status, 403);
        assert.equal((await request(`${imagePath}?mode=download`, undefined, stranger)).status, 403);
        assert.deepEqual((await pool.query(`SELECT status,actor_microusd,reserved_microusd FROM ai_monthly_reservations WHERE owner_id=$1 AND capability='study_image'`, [owner])).rows,
          [{ status: 'SETTLED', actor_microusd: '129', reserved_microusd: '3100' }]);
        const daily = () => pool.query('SELECT request_count,consumed_microusd FROM ai_usage_daily WHERE scope=$1', [owner]).then(result => result.rows[0]);
        assert.deepEqual(await daily(), { request_count: 1, consumed_microusd: '129' });

        damaged = true;
        const invalid = await request(commands, { ...command, requestId: randomUUID(), revision: detail.folder.revision });
        assert.notEqual(invalid.status, 200);
        const afterInvalid = await (await request(route)).json();
        assert.equal(afterInvalid.creations.length, 1);
        assert.equal(scans.length, 1);
        assert.deepEqual(await daily(), { request_count: 2, consumed_microusd: '258' });

        const fill = { namespace: 'study_ai_dispatches', jobId: randomUUID(), ownerId: owner };
        await database.$transaction(async raw => {
          const tx = { query: raw.$queryRawUnsafe };
          assert.equal(await reserveAiMonthlyBudget(tx, fill, 2_998_742n, { capability: 'study', provider: 'gemini', model: 'synthetic',
            pricing: { inputUsdPerMillion: 1, outputUsdPerMillion: 1 } }), true);
          await settleAiMonthlyBudget(tx, fill, 2_998_742n);
        });
        const monthlyCommand = { ...command, requestId: randomUUID(), revision: afterInvalid.folder.revision };
        const exhausted = await request(commands, monthlyCommand);
        assert.equal(exhausted.status, 429);
        const { error: monthly } = await exhausted.json();
        assert.equal(monthly.code, 'AI_MONTHLY_BUDGET_EXCEEDED');
        assert.equal(monthly.quota.availableMicrousd, 1000);
        assert.equal(monthly.quota.requiredMicrousd, 3100);
        assert.match(monthly.quota.renewsAt, /T03:00:00\.000Z$/u);
        const rejectedReplay = await (await request(commands, monthlyCommand)).json();
        assert.deepEqual(rejectedReplay.result, { status: 'FAILED', errorCode: monthly.code, quota: monthly.quota });
        const afterMonthly = await (await request(route)).json();
        const receipt = afterMonthly.conversations[0].turns.at(-1).generation;
        assert.equal(receipt.errorCode, 'AI_MONTHLY_BUDGET_EXCEEDED');
        assert.deepEqual(receipt.quota, monthly.quota);
        assert.deepEqual(await daily(), { request_count: 2, consumed_microusd: '258' });

        await pool.query('UPDATE ai_usage_daily SET request_count=3 WHERE scope=$1', [owner]);
        const operational = await request(commands, { ...command, requestId: randomUUID(), revision: afterMonthly.folder.revision });
        assert.equal(operational.status, 429);
        assert.equal((await operational.json()).error.code, 'AI_BUDGET_EXCEEDED');
        const afterOperational = await (await request(route)).json();
        await pool.query("UPDATE ai_usage_daily SET request_count=CASE WHEN scope='global' THEN 10 ELSE 2 END");
        const global = await request(commands, { ...command, requestId: randomUUID(), revision: afterOperational.folder.revision });
        assert.equal(global.status, 429);
        assert.deepEqual((await global.json()).error, { code: 'AI_GLOBAL_DAILY_BUDGET_EXCEEDED' });
        assert.equal(counts, 2);
        assert.equal(prompts.length, 2);

        const afterGlobal = await (await request(route)).json();
        const archived = await request(commands, { action: 'ARCHIVE', requestId: randomUUID(), revision: afterGlobal.folder.revision });
        assert.equal(archived.status, 200);
        assert.deepEqual(Buffer.from(await (await request(imagePath)).arrayBuffer()), png);
        const deleted = await request(commands, { action: 'DELETE', requestId: randomUUID(), confirmed: true,
          revision: (await archived.json()).folder.revision });
        assert.equal(deleted.status, 200);
        assert.equal((await request(imagePath)).status, 403);
      });
    });
  });
});
