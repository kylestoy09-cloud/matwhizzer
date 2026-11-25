import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
for (const f of ['2026 NHSCA National Duals.rtf', '2026 AAU Scholastic Duals Boys:Girls.rtfd/TXT.rtf', 'Super 32 Roster.rtf', 'Journeymen Fall Classic.rtf', '2026 Journeymen Fall Classic.rtfd/TXT.rtf', '2026 Phil Portuese Northeast Regional Championships.rtf'])
  console.log(f.padEnd(52), H.detectKind(f, H.rtfToText(readFileSync(`${B}/${f}`, 'utf8'))))
