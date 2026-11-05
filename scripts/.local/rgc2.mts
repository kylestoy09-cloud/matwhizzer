import { completeSchoolIds } from '../../src/lib/rosterGradeComplete'
for (const g of ['M', 'F'] as const) console.log('route helper', g, (await completeSchoolIds(g)).size)
