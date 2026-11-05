import { phaseOn } from '../../src/lib/phaseDates'
const rows = [{ season_id: 2027, gender: 'M' as const, label: '2026-27', preseason_start: '2026-10-01', season_start: '2026-12-07', postseason_start: '2027-01-25', postseason_end: '2027-03-15' }]
for (const d of ['2026-09-30', '2026-10-01', '2026-11-04', '2026-12-06', '2026-12-07', '2027-01-25', '2027-03-15', '2027-03-16']) { const p = phaseOn(rows, d); console.log(d, p.phase, p.from, p.to) }
