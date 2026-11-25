import { schoolNameMatches as m } from '../../src/lib/saintNames'
console.log(m('St. Rose','st'), m('West Deptford','st'), m('Mount St. Joes (MD)','saint jo'), m('St. Vincent-St. Mary (OH)','st mary'), m('Stanhope','sta'), m('St. Rose','saint rose'), m('Westfield','west'))
