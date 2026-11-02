// Run from frontend: node --test packages/api-client/tests/work-orders.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Execute the actual client implementation against a network-free transport.
const source = await readFile(new URL('../src/work-orders.ts', import.meta.url), 'utf8')
const transport = `export const calls = [];
const apiClient = {
 get: async (url, config) => {
  calls.push({url, config});
  if(url.includes('/missing')) throw new Error('Not found');
  return {status:url.includes('/empty/')?204:200, data:{id:'order-1'}};
 },
 post: async (url, body) => { calls.push({url, body}); return {status:200, data:{id:'comment-1'}}; }
};`
const compiled = ts.transpileModule(source.replace("import { apiClient } from './assets'",transport),
 {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText
const { workOrderService: client, calls } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

test('work-order callers retain their client methods',()=>{
 for(const name of ['getWorkOrderById','getPmOrigin','getImportEvidence','createWorkOrder','assign','setTaskCompleted','getTaskAttachments','uploadTaskPhoto','changeStatus','recordLabor','complete','getHistory','postComment','uploadTaskAttachment','getAttachmentBlob','createWorkRequest']) assert.equal(typeof client[name],'function',name)
})
test('detail and evidence reads use supported routes and preserve 204 absence',async()=>{
 assert.deepEqual(await client.getWorkOrderById('order-1'),{id:'order-1'})
 assert.equal(calls.at(-1).url,'/work-orders/order-1')
 await client.getPmOrigin('order-1')
 assert.equal(calls.at(-1).url,'/work-orders/order-1/pm-origin')
 await client.getImportEvidence('order-1')
 assert.equal(calls.at(-1).url,'/work-orders/order-1/import-evidence')
 assert.equal(await client.getPmOrigin('empty'),null)
 assert.equal(await client.getImportEvidence('empty'),null)
 await assert.rejects(client.getWorkOrderById('missing'),/Not found/)
})

test('work-order comments submit text and images as multipart form data',async()=>{
 const photo = new File([new Uint8Array([1,2,3])],'example.png',{type:'image/png'})
 await client.postComment('order-1','Inspection finding',[photo])
 const request = calls.at(-1)
 assert.equal(request.url,'/work-orders/order-1/comments')
 assert.equal(request.body.get('comment'),'Inspection finding')
 assert.equal(request.body.getAll('images').length,1)
 assert.equal(request.body.getAll('images')[0].name,'example.png')
})
