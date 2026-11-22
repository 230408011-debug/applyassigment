import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import * as store from '../booksStore.js';

const base = 'http://localhost:3191';
async function start() {
  const child = spawn(process.execPath, ['server.js'], { cwd: new URL('../', import.meta.url), env: { ...process.env, PORT: '3191', CLIENT_ORIGIN: 'http://localhost:5179' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  for (let i = 0; i < 100; i++) {
    if (output.includes('Reading List API:')) return child;
    if (child.exitCode !== null) throw new Error(output);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  child.kill(); throw new Error('Server startup timed out');
}
async function stop(child) { const closed = once(child, 'exit'); child.kill(); await closed; }
async function request(path, method = 'GET', data, status = 200) {
  const options = { method };
  if (data !== undefined) { options.headers = { 'Content-Type': 'application/json' }; options.body = JSON.stringify(data); }
  const r = await fetch(base + path, options);
  assert.equal(r.status, status, `${method} ${path}: ${await r.clone().text()}`);
  if (status === 204) { assert.equal(await r.text(), ''); return { response: r, data: null }; }
  assert.ok(r.headers.get('content-type').includes('application/json'));
  const body = await r.json();
  if (status >= 400) assert.deepEqual(Object.keys(body), ['error']);
  return { response: r, data: body };
}
const book = { title: 'Test Book', author: 'Test Author', year: 2020, genre: 'science' };

test('REST methods, validation, filters, CORS, statistics and reset', async () => {
  let child = await start();
  try {
    const seed = (await request('/api/books')).data;
    assert.equal(seed.length, 6);
    assert.ok(new Set(seed.map((b) => b.genre)).size >= 3);
    const stats = (await request('/api/stats')).data;
    assert.equal(stats.total,6); assert.equal(stats.read,3); assert.equal(stats.averageRating,13/3);
    for (const id of ['0','-1','1.5','abc','1e2','9007199254740992']) await request('/api/books/'+id,'GET',undefined,400);
    await request('/api/books/99999','GET',undefined,404);
    await request('/api/unknown','GET',undefined,404);
    await request('/api/books','DELETE',undefined,404);
    for (const query of ['genre=wrong','read=1','read=TRUE','sort=id','sort=wrong','order=up','limit=0','limit=51','limit=2.5','page=0','page=abc','genre=science&genre=history','q=a&q=b','sort=title&sort=year','x=1','genre[x]=fiction']) {
      await request('/api/books?'+query,'GET',undefined,400);
    }
    const filtered=(await request('/api/books?genre=fiction&read=true&q=PRINCE&sort=year&order=desc')).data;
    assert.equal(filtered.length,1); assert.equal(filtered[0].id,5);
    assert.equal((await request('/api/books?q=hawking')).data[0].id,3);
    assert.deepEqual((await request('/api/books?limit=2&page=2')).data.map((b)=>b.id),[3,4]);
    assert.deepEqual((await request('/api/books?page=100')).data,[]);
    for (const order of ['asc','desc']) {
      const result=(await request('/api/books?sort=rating&order='+order)).data;
      const firstNull=result.findIndex((b)=>b.rating===null);
      assert.ok(result.slice(firstNull).every((b)=>b.rating===null));
      const nums=result.filter((b)=>b.rating!==null).map((b)=>b.rating);
      assert.deepEqual(nums,[...nums].sort((a,b)=>order==='asc'?a-b:b-a));
    }
    assert.deepEqual((await request('/api/books')).data,seed,'Sorting changed stored data');
    for (const data of [null,[],42,{},{...book,title:' '},{...book,author:'x'.repeat(101)},{...book,year:'2020'},
      {...book,year:999},{...book,year:new Date().getFullYear()+1},{...book,genre:'bad'},
      {...book,read:'true'},{...book,rating:5},{...book,read:true,rating:0},{...book,read:true,rating:1.5}]) {
      await request('/api/books','POST',data,400);
    }
    const malformed=await fetch(base+'/api/books',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"title":'});
    assert.equal(malformed.status,400); assert.equal((await malformed.json()).error,'Malformed JSON body');
    const created=await request('/api/books','POST',{...book,title:' Test Book ',id:999,unknown:'ignored'},201);
    assert.equal(created.data.id,7); assert.equal(created.response.headers.get('location'),'/api/books/7');
    assert.equal(created.data.title,'Test Book'); assert.equal(created.data.read,false);assert.equal(created.data.rating,null);assert.ok(!Object.hasOwn(created.data,'unknown'));
    await request('/api/books','POST',{...book,title:'TEST BOOK',author:'test author'},409);
    const patched=(await request('/api/books/7','PATCH',{read:true,rating:3,id:88},200)).data;
    assert.equal(patched.title,'Test Book');assert.equal(patched.id,7); assert.equal(patched.rating,3);
    await request('/api/books/7','PATCH',{read:false},400);
    await request('/api/books/7','PUT',{title:'Only a title'},400);
    const replaced=(await request('/api/books/7','PUT',{...book,title:'Replaced'},200)).data;
    assert.equal(replaced.read,false); assert.equal(replaced.rating,null);
    await request('/api/books/7','PATCH',{title:'THE HOBBIT',author:'j. r. r. tolkien'},409);
    await request('/api/books/7','PUT',{title:'The Hobbit',author:'J. R. R. Tolkien',year:1937,genre:'fantasy'},409);
    await request('/api/books/999','PATCH',{read:true},404);
    await request('/api/books/999','PUT',book,404);
    assert.equal((await request('/api/stats')).data.total,7);
    await request('/api/books/7','DELETE',undefined,204);
    await request('/api/books/7','DELETE',undefined,404);
    const concurrent=await Promise.all([fetch(base+'/api/books',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(book)}),fetch(base+'/api/books',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(book)})]);
    assert.deepEqual(concurrent.map((r)=>r.status).sort(),[201,409]);
    const preflight=await fetch(base+'/api/books',{method:'OPTIONS',headers:{Origin:'http://localhost:5179','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
    assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),'http://localhost:5179');
    assert.ok(preflight.headers.get('access-control-allow-methods').includes('PATCH'));
    const wrong=await fetch(base+'/api/books',{headers:{Origin:'http://wrong.example'}});
    assert.notEqual(wrong.headers.get('access-control-allow-origin'),'http://wrong.example');
    const crash=(await request('/api/crash','GET',undefined,500)).data;
    assert.deepEqual(crash,{error:'Something went wrong'});
    for (const item of (await request('/api/books')).data) await request('/api/books/'+item.id,'DELETE',undefined,204);
    assert.deepEqual((await request('/api/stats')).data,{total:0,read:0,unread:0,averageRating:null,byGenre:{}});
    await stop(child); child=await start();
    assert.equal((await request('/api/books')).data.length,6,'Restart did not restore seeds');
  } finally { await stop(child); }
});

test('store returns copies and updates without altering previous objects', async () => {
  const before=await store.listBooks();
  const original=await store.getBook(1);
  const changed=await store.updateBook(1,{rating:2},true);
  assert.equal(changed.rating,2);assert.equal(original.rating,5);assert.equal(before[0].rating,5);
  changed.title='client-side change';
  assert.equal((await store.getBook(1)).title,'The Hobbit');
  await store.listBooks({sort:'title',order:'desc'});
  assert.deepEqual((await store.listBooks()).map((b)=>b.id),[1,2,3,4,5,6]);
});
