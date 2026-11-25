HEADER = "# NCAA Division II Championships 2003 — source: 2003.pdf (scan; typed from the bracket pages, 2026-11-18; no records printed)\n# Spelled as the 2004–2005 sheets print them: Joey Simcoe (printed Simco), Andre VanderVelde (Vandervelde), Plamen Paskalev (Pasklev). UNC = Northern Colorado, UNCP = UNC Pembroke"
CODES = {'AU':'Ashland','Aug':'Augustana SD','WSC':'Western State College','MSUM':'Minnesota State Moorhead','MSM':'Minnesota State Mankato','UNO':'Nebraska-Omaha','UF':'Findlay','CMSU':'Central Missouri','UNK':'Nebraska-Kearney','SFS':'San Francisco State','UI':'Indianapolis','UPJ':'Pitt-Johnstown','NDSU':'North Dakota State','UCO':'Central Oklahoma','CWU':'Central Washington','UNC':'Univ Northern Colorado','WLS':'West Liberty State','UWP':'Wisconsin-Parkside','UNCP':'UNC Pembroke','SSU':'Southwest State','SDSU':'South Dakota State','AS':'Adams State','TSU':'Truman State','SU':'Shippensburg','GU':'Gannon','MC':'Mercyhurst','FHS':'Fort Hays State','CSC':'Chadron State','SCSU':'St. Cloud State','KU':'Kutztown','CSM':'Colorado School of Mines','SIUE':'SIU Edwardsville','AC':'Anderson College','NSU':'Northern State','CNC':'Carson-Newman'}
W = {}
W['125'] = ("""
James Phillips|AU
Aaron Graumann|Aug
Jared Haberman|WSC
Desmond Radunz|MSUM
Dan Hilario|UNO
Donald Dew|UF
Drew Passley|CMSU
Bryce Abbey|UNK
Joey Bareng|SFS
Wiley Craft|UI
Ryon Mazzocco|UPJ
Matt Strawser|NDSU
Mark Dodgen|UCO
Aaron Mann|CWU
Mark Hastings|UNC
Doug Curnes|WLS""", """
r1 Phillips > Graumann | D;2-1;TB
r1 Haberman > Radunz | M;14-1
r1 Hilario > Dew | D;8-2
r1 Abbey > Passley | D;6-4
r1 Bareng > Craft | D;6-4
r1 Strawser > Mazzocco | F;4:09
r1 Dodgen > Mann | D;10-5
r1 Curnes > Hastings | D;7-5
qf Haberman > Phillips | D;7-2
qf Abbey > Hilario | D;3-1
qf Strawser > Bareng | D;2-2;TB
qf Dodgen > Curnes | D;2-0
sf Haberman > Abbey | D;8-2
sf Dodgen > Strawser | D;7-1
f Dodgen > Haberman | F;3:53
c1 Graumann > Radunz | D;6-1
c1 Passley > Dew | M;11-3
c1 Craft > Mazzocco | D;7-4
c1 Mann > Hastings | D;5-4
c2 Graumann > Curnes | D;3-2
c2 Passley > Bareng | D;3-2
c2 Craft > Hilario | D;6-1
c2 Mann > Phillips | D;2-1
cqf Graumann > Passley | D;7-5
cqf Mann > Craft | F;5:56
csf Abbey > Graumann | D;6-4
csf Strawser > Mann | D;12-7
3rd Abbey > Strawser | D;6-1
5th Mann > Graumann | M;9-1
7th Passley > Craft | F;1:16""")
W['133'] = ("""
Joey Simcoe|UF
Ross Kondo|CWU
Earl Wilson|UI
Andre VanderVelde|Aug
Donald Lockett|SFS
Zach Meissner|AU
Mitch Waite|UNO
Matt Jacobs|UWP
Cole Province|UCO
Nick Magee|NDSU
Curry Pickard|UNCP
Adam Keiswetter|UNK
Tony Fratzke|MSM
Keefer Jensen|SSU
Adam Mars|AS
Thad Benton|UPJ""", """
r1 Simcoe > Kondo | T1.5;17-0;6:00
r1 VanderVelde > Wilson | D;9-4
r1 Lockett > Meissner | T1.5;16-1;3:57
r1 Waite > Jacobs | D;7-3
r1 Province > Magee | M;10-2
r1 Keiswetter > Pickard | D;11-9
r1 Fratzke > Jensen | F;6:18
r1 Benton > Mars | F;6:51
qf Simcoe > VanderVelde | M;13-2
qf Waite > Lockett | D;2-1;TB
qf Province > Keiswetter | D;6-4
qf Fratzke > Benton | D;5-3
sf Waite > Simcoe | D;6-5
sf Province > Fratzke | M;12-4
f Province > Waite | D;6-1
c1 Wilson > Kondo | F;2:49
c1 Meissner > Jacobs | D;4-3
c1 Pickard > Magee | F;2:57
c1 Mars > Jensen | F;5:31
c2 Benton > Wilson | F;1:41
c2 Keiswetter > Meissner | D;5-3
c2 Pickard > Lockett | D;14-8
c2 Mars > VanderVelde | M;17-6
cqf Benton > Keiswetter | D;6-2
cqf Mars > Pickard | D;10-6
csf Simcoe > Benton | D;4-3
csf Fratzke > Mars | D;12-5
3rd Fratzke > Simcoe | D;8-2
5th Benton > Mars | F;2:45
7th Keiswetter > Pickard | F;3:19""")
W['141'] = ("""
Ronald Paterniti|GU
Mitch Jackson|MSUM
Jeremy Roe|SDSU
Shaine Jaime|CWU
Merrick Meyer|TSU
Zach Leathers|SU
Pacifico Garcia|SFS
Ronald Stafford|UNC
Roderick Ratcliff|UNO
RC LaHaye|WSC
Will Tedder|MC
Brad Russell|UWP
Shane Barnes|AS
Ryan King|Aug
Matt Dodgen|UCO
Jason Nestor|UPJ""", """
r1 Paterniti > Jackson | D;13-7
r1 Jaime > Roe | D;7-2
r1 Meyer > Leathers | F;2:18
r1 Garcia > Stafford | D;3-1
r1 LaHaye > Ratcliff | M;12-0
r1 Russell > Tedder | D;8-2
r1 Barnes > King | D;6-2
r1 Nestor > Dodgen | D;1-1;TB
qf Jaime > Paterniti | D;3-2
qf Meyer > Garcia | D;6-1
qf Russell > LaHaye | M;14-4
qf Barnes > Nestor | D;2-1;TB
sf Meyer > Jaime | F;3:23
sf Barnes > Russell | D;3-1
f Barnes > Meyer | M;15-3
c1 Jackson > Roe | M;12-3
c1 Stafford > Leathers | D;13-12
c1 Tedder > Ratcliff | D;6-1
c1 Dodgen > King | D;6-0
c2 Nestor > Jackson | D;2-1
c2 Stafford > LaHaye | D;8-7
c2 Garcia > Tedder | F;M FOR
c2 Paterniti > Dodgen | D;9-5
cqf Stafford > Nestor | D;2-0
cqf Paterniti > Garcia | D;9-3
csf Jaime > Stafford | D;1-1;TB
csf Russell > Paterniti | D;2-1
3rd Jaime > Russell | D;4-2
5th Stafford > Paterniti | D;8-4
7th Garcia > Nestor | D;6-3""")
W['149'] = ("""
Waylon Lowe|UF
Loren Hutchins|UNC
Andy Messersmith|AS
Brad Becker|UWP
Austin Scarset|Aug
Brendon Bosco|GU
Mitch Napier|UI
Luke Santos|SFS
Brandon Pfizenmaier|UNK
Jerrod Goodwin|UCO
Ryan Ickes|UPJ
Jared Barnes|SDSU
Eric Pizzi|CMSU
Jared Webster|CSC
Zach Stevens|NDSU
Aaron Monseau|WLS""", """
r1 Lowe > Hutchins | M;13-5
r1 Messersmith > Becker | D;13-8
r1 Bosco > Scarset | M;14-6
r1 Napier > Santos | D;4-3
r1 Pfizenmaier > Goodwin | D;5-3
r1 Ickes > Barnes | D;4-0
r1 Pizzi > Webster | D;5-4
r1 Monseau > Stevens | D;11-8
qf Lowe > Messersmith | D;7-4
qf Napier > Bosco | D;6-4
qf Pfizenmaier > Ickes | D;8-7
qf Monseau > Pizzi | D;4-4;TB
sf Lowe > Napier | M;15-7
sf Pfizenmaier > Monseau | D;8-3
f Lowe > Pfizenmaier | D;5-3
c1 Becker > Hutchins | F;6:45
c1 Santos > Scarset | D;4-3
c1 Goodwin > Barnes | D;5-2
c1 Stevens > Webster | D;7-3;SV
c2 Becker > Pizzi | D;6-3
c2 Santos > Ickes | D;9-7
c2 Goodwin > Bosco | D;4-1
c2 Messersmith > Stevens | D;10-9
cqf Santos > Becker | D;9-4
cqf Messersmith > Goodwin | M;14-2
csf Napier > Santos | D;4-1
csf Messersmith > Monseau | T1.5;15-0;3:00
3rd Messersmith > Napier | M;16-8
5th Santos > Monseau | D;5-3
7th Goodwin > Becker | M;11-3""")
W['157'] = ("""
Adam Morris|UF
Travis Peak|CSC
Jared Cooley|SSU
Daniel Dutch|SCSU
Travis Koppenhafer|AS
Skyler Waddell|GU
Brody Olson|UNC
Dan Dempsey|UWP
Corey Crandall|TSU
Matt McDougall|Aug
Gary Skoch|AU
Aaron Dalton|UNK
Paul Carlson|NDSU
Ryan Hunter|CMSU
Jack Quintana|WSC
Bruno Iorfido|UPJ""", """
r1 Morris > Peak | D;10-6
r1 Cooley > Dutch | D;10-3
r1 Koppenhafer > Waddell | M;20-7
r1 Olson > Dempsey | M;16-7
r1 Crandall > McDougall | D;7-5
r1 Skoch > Dalton | D;7-4
r1 Carlson > Hunter | M;16-4
r1 Iorfido > Quintana | D;4-2;SV
qf Morris > Cooley | D;12-7
qf Olson > Koppenhafer | D;5-2
qf Skoch > Crandall | F;8:13
qf Carlson > Iorfido | D;10-3
sf Olson > Morris | D;3-1
sf Carlson > Skoch | D;3-2
f Carlson > Olson | D;2-1
c1 Peak > Dutch | D;4-3
c1 Dempsey > Waddell | F;3:43
c1 Dalton > McDougall | D;17-11
c1 Quintana > Hunter | M;8-0
c2 Iorfido > Peak | D;3-1
c2 Dempsey > Crandall | M;11-3
c2 Koppenhafer > Dalton | M;13-5
c2 Quintana > Cooley | F;6:46
cqf Dempsey > Iorfido | F;1:16
cqf Quintana > Koppenhafer | D;14-12;SV
csf Dempsey > Morris | D;10-5
csf Quintana > Skoch | D;7-2
3rd Quintana > Dempsey | D;7-3
5th Morris > Skoch | F;M FOR
7th Koppenhafer > Iorfido | F;5:43""")
W['165'] = ("""
Dwayne Coward|UNCP
Lee Gatlin|CMSU
Tyler Bryant|SDSU
Josh McDonald|SFS
Shawn Silvis|UCO
Anthony Corpora|KU
Riley Ross|UNK
Jared Deaguero|UNC
Jake Emerick|MSM
Jordan Johnson|CSC
Matt Neely|AU
Fred Joseph|UWP
Greg Chirieleison|CSM
Matt Neumuller|SCSU
Derek Donelson|UI
Lucas Mackesey|UF""", """
r1 Coward > Gatlin | D;15-9
r1 Bryant > McDonald | D;5-2
r1 Silvis > Corpora | D;7-1
r1 Ross > Deaguero | D;4-2
r1 Emerick > Johnson | M;19-6
r1 Neely > Joseph | D;3-1;SV
r1 Chirieleison > Neumuller | D;5-0
r1 Mackesey > Donelson | M;11-3
qf Coward > Bryant | D;5-3;SV
qf Silvis > Ross | D;5-2
qf Emerick > Neely | F;6:19
qf Mackesey > Chirieleison | D;2-1;TB
sf Silvis > Coward | D;14-7
sf Emerick > Mackesey | D;10-3
f Silvis > Emerick | D;8-4
c1 McDonald > Gatlin | D;11-9
c1 Deaguero > Corpora | F;3:30
c1 Johnson > Joseph | F;5:49
c1 Neumuller > Donelson | D;6-5
c2 Chirieleison > McDonald | D;8-3
c2 Deaguero > Neely | M;18-6
c2 Ross > Johnson | M;14-3
c2 Neumuller > Bryant | D;4-1;TB
cqf Deaguero > Chirieleison | D;7-3
cqf Neumuller > Ross | D;10-3
csf Deaguero > Coward | F;3:44
csf Neumuller > Mackesey | D;9-2
3rd Neumuller > Deaguero | D;5-2
5th Coward > Mackesey | F;6:43
7th Ross > Chirieleison | D;3-2""")
W['174'] = ("""
Randy Pyle|UPJ
Tanner Linsacum|UNC
Cameron Bretz|WSC
Drew Bouwman|SSU
Jon Duncombe|SCSU
Careef Robertson|AC
Jason Tapia|UCO
Erich Singer|FHS
Frank Kuchera|UNK
Brett Barbarick|CMSU
Tommy Bauer|AU
Thad Pike|NDSU
Zach Stephens|SIUE
Don Ortega|AS
Bryan Cowdin|SDSU
Nick Brumbaugh|KU""", """
r1 Linsacum > Pyle | D;3-1
r1 Bouwman > Bretz | M;9-1
r1 Duncombe > Robertson | M;15-2
r1 Tapia > Singer | F;4:12
r1 Kuchera > Barbarick | F;4:23
r1 Pike > Bauer | D;3-1
r1 Stephens > Ortega | D;10-3
r1 Brumbaugh > Cowdin | F;3:59
qf Linsacum > Bouwman | D;8-7;TB
qf Duncombe > Tapia | D;5-3
qf Kuchera > Pike | D;4-1
qf Stephens > Brumbaugh | D;10-4
sf Duncombe > Linsacum | D;12-5
sf Kuchera > Stephens | D;3-1
f Kuchera > Duncombe | D;3-2
c1 Bretz > Pyle | D;7-3
c1 Robertson > Singer | D;4-1
c1 Bauer > Barbarick | D;11-5
c1 Cowdin > Ortega | M;14-5
c2 Brumbaugh > Bretz | F;1:57
c2 Pike > Robertson | D;5-2
c2 Bauer > Tapia | D;7-4
c2 Cowdin > Bouwman | D;4-3
cqf Pike > Brumbaugh | D;6-3
cqf Bauer > Cowdin | M;13-5
csf Pike > Linsacum | D;12-6
csf Stephens > Bauer | D;8-7
3rd Pike > Stephens | D;1-1;TB
5th Linsacum > Bauer | F;M FOR
7th Cowdin > Brumbaugh | F;1:56""")
W['184'] = ("""
Derek Brunson|UNCP
Ben Holscher|CSC
Rory Herring|UWP
Sam Kenton|Aug
Mauricio Wright|SFS
Kris Klepacz|UF
Zach Stalder|UNO
Tim Johns|SSU
Jeff Henning|UCO
Joel Schrimpf|MSM
Ben McAvinew|MC
Jordan Nichols|FHS
Tyler Jones|SDSU
Ryan Kopiasz|MSUM
Mark Dubrovich|CSM
John Burda|UPJ""", """
r1 Brunson > Holscher | D;11-5
r1 Kenton > Herring | D;11-9
r1 Wright > Klepacz | T1.5;18-1;5:23
r1 Stalder > Johns | T1.5;26-9;7:00
r1 Henning > Schrimpf | F;5:23
r1 McAvinew > Nichols | D;12-5
r1 Jones > Kopiasz | F;4:13
r1 Burda > Dubrovich | D;2-1;TB
qf Brunson > Kenton | D;5-3
qf Wright > Stalder | D;5-4
qf Henning > McAvinew | M;15-6
qf Jones > Burda | T1.5;18-1;5:26
sf Wright > Brunson | D;11-5
sf Jones > Henning | D;8-2
f Wright > Jones | D;3-2
c1 Herring > Holscher | F;4:26
c1 Klepacz > Johns | D;9-7
c1 Nichols > Schrimpf | D;12-5
c1 Dubrovich > Kopiasz | D;7-4
c2 Burda > Herring | M;13-5
c2 McAvinew > Klepacz | D;5-2
c2 Stalder > Nichols | D;4-2
c2 Kenton > Dubrovich | D;5-3
cqf McAvinew > Burda | D;7-3
cqf Stalder > Kenton | D;3-1
csf Brunson > McAvinew | D;10-5
csf Henning > Stalder | D;4-0
3rd Henning > Brunson | T1.5;18-2;4:58
5th Stalder > McAvinew | D;3-2
7th Burda > Kenton | D;4-2;SV""")
W['197'] = ("""
Ryan Kirst|AU
John Goral|UWP
Brian Kraemer|NDSU
Jeff Sylvester|UNK
Seth Shippy|CMSU
Corey Winston|UNCP
Drew Dunbar|SFS
Mike Engelmann|MSM
Chad Wallace|UNO
DC Hazen|CWU
Justin Mautz|MC
Brian Tesch|SSU
Jeff Rusher|CSC
Tim Boldt|SDSU
Cory Wellnitz|NSU
Clinton Salisbury|UF""", """
r1 Kirst > Goral | F;4:25
r1 Kraemer > Sylvester | D;12-5
r1 Winston > Shippy | D;11-4
r1 Dunbar > Engelmann | D;8-6
r1 Wallace > Hazen | M;19-7
r1 Mautz > Tesch | F;5:22
r1 Rusher > Boldt | D;13-10
r1 Salisbury > Wellnitz | F;6:45
qf Kraemer > Kirst | D;7-5;SV
qf Dunbar > Winston | D;11-7
qf Wallace > Mautz | D;8-2
qf Rusher > Salisbury | D;15-8
sf Kraemer > Dunbar | M;11-2
sf Wallace > Rusher | D;7-5;SV
f Wallace > Kraemer | D;10-3
c1 Sylvester > Goral | T1.5;16-0;3:14
c1 Shippy > Engelmann | F;5:31
c1 Hazen > Tesch | D;6-4
c1 Boldt > Wellnitz | M;9-1
c2 Sylvester > Salisbury | M;9-1
c2 Mautz > Shippy | D;7-3
c2 Hazen > Winston | D;6-5
c2 Boldt > Kirst | F;6:32
cqf Mautz > Sylvester | D;9-3
cqf Boldt > Hazen | M;10-1
csf Mautz > Dunbar | D;10-9
csf Rusher > Boldt | D;6-2
3rd Rusher > Mautz | F;M FOR
5th Boldt > Dunbar | D;7-1
7th Sylvester > Hazen | F;2:42""")
W['285'] = ("""
Lyneil Mitchell|GU
Joe Bryce|NDSU
Andrew Ubben|FHS
Evan Love|UI
Les Sigman|UNO
Aldo Campea|AU
Baron Blanchard|NSU
Chuck Halstead|CSM
Bob Murphy|UNK
Celester O'Garro|CNC
Howard Bell|UPJ
Dusty Hoffschneider|UNC
Plamen Paskalev|CMSU
Luke Roberts|CWU
Dustin Darveaux|SCSU
Tom Poe|WLS""", """
r1 Mitchell > Bryce | F;3:25
r1 Ubben > Love | D;3-1
r1 Sigman > Campea | D;6-0
r1 Blanchard > Halstead | D;6-1
r1 Murphy > O'Garro | D;5-3
r1 Bell > Hoffschneider | D;4-2
r1 Paskalev > Roberts | D;13-6
r1 Darveaux > Poe | D;9-4
qf Ubben > Mitchell | F;4:32
qf Sigman > Blanchard | D;6-1
qf Bell > Murphy | D;6-0
qf Darveaux > Paskalev | D;7-1
sf Sigman > Ubben | D;10-5
sf Darveaux > Bell | M;11-2
f Sigman > Darveaux | D;6-0
c1 Bryce > Love | D;3-2;TB
c1 Campea > Halstead | D;3-2
c1 Hoffschneider > O'Garro | D;9-6
c1 Roberts > Poe | D;10-4
c2 Paskalev > Bryce | D;2-1
c2 Campea > Murphy | D;3-2
c2 Blanchard > Hoffschneider | D;5-2
c2 Mitchell > Roberts | M;10-2
cqf Paskalev > Campea | D;4-2;TB
cqf Mitchell > Blanchard | F;4:53
csf Paskalev > Ubben | D;5-3
csf Mitchell > Bell | F;M FOR
3rd Mitchell > Paskalev | D;5-4
5th Ubben > Bell | F;M FOR
7th Blanchard > Campea | D;3-0""")
