import { ppMeetsCounted } from '../../src/lib/power-points'
for (const n of [5, 9, 10, 11, 12, 15, 20]) console.log(n, 'boys 2026', ppMeetsCounted(n, 'M', 2026), 'boys 2027', ppMeetsCounted(n, 'M', 2027), 'girls 2027', ppMeetsCounted(n, 'F', 2027))
