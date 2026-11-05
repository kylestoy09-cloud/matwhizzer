const html = await (await fetch('https://matwhizzer.com/meets/fbdd3110-e8ae-40e6-a05d-7197ee3f6eb0')).text()
const t = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '\n').split('\n').map(x => x.trim()).filter(Boolean)
const i = t.indexOf('Unknown'); console.log(t.slice(i - 8, i + 6).join(' | '))
