import { stripNickname } from '../../src/lib/personName'
for (const n of ['Charles (CJ) Palmisano', 'Terrance (James) Fearon', 'Pinhao (Alex) Xu', 'Arjun (Danny) Monga', 'Ryan Kim', "Sean O'Neill", 'Antonio Cruz Jr']) console.log(JSON.stringify(n), '→', JSON.stringify(stripNickname(n)))
