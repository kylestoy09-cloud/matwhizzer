HEADER = "# NCAA Division II Championships 2004 — source: 2004.pdf (scan; typed from the bracket pages, 2026-11-18; no records printed; page 2 is blank)\n# 197: printed \"Justi Mautz\" — Justin Mautz of Mercyhurst (the 2005 sheet)"
CODES = {}
W = {}
W['125'] = ("""
Curry Pickard|UNC.-Pembroke
Joey Bareng|San Fran. St.
James Phillips|Ashland
Desmond Radunz|Minn. St. Moorhead
Jared Haberman|Western State
Ricky Randazzo|Mercyhurst
Aaron Graumann|Augustana S.D.
Chonci Houston|Carson-Newman
Andy Uhl|Findlay
Eric Sanders|North Dakota St.
Doug Curnes|West Liberty St.
Seth Groff|Chadron St.
Dustin Tovar|Neb.-Omaha
Wiley Craft|Indianapolis
Bryce Abbey|Neb.-Kearney
Jamie Thomas|Shippensburg""", """
r1 Bareng > Pickard | D;6-5;TB1
r1 Phillips > Radunz | D;3-1
r1 Haberman > Randazzo | T1.5;16-0;5:31
r1 Graumann > Houston | D;6-2
r1 Uhl > Sanders | D;5-3
r1 Groff > Curnes | D;4-1
r1 Tovar > Craft | T1.5;17-2;4:53
r1 Abbey > Thomas | F;4:45
qf Bareng > Phillips | D;7-4
qf Haberman > Graumann | M;13-2
qf Uhl > Groff | D;6-3
qf Tovar > Abbey | D;8-6
sf Haberman > Bareng | T1.5;16-1;7:00
sf Tovar > Uhl | D;11-5
f Haberman > Tovar | D;8-1
c1 Pickard > Radunz | D;7-4
c1 Randazzo > Houston | D;3-2
c1 Sanders > Curnes | D;4-3
c1 Thomas > Craft | D;6-1
c2 Abbey > Pickard | D;11-10
c2 Randazzo > Groff | D;6-5
c2 Graumann > Sanders | D;3-2
c2 Thomas > Phillips | D;4-2
cqf Abbey > Randazzo | F;4:50
cqf Thomas > Graumann | M;10-2
csf Abbey > Bareng | F;2:01
csf Thomas > Uhl | D;10-3
3rd Abbey > Thomas | M;12-0
5th Bareng > Uhl | D;11-5
7th Randazzo > Graumann | F;M FOR""")
W['133'] = ("""
Roylando Lucas|UNC.-Pembroke
Mike Hansen|Central Mo. St.
Mitch Waite|Neb.-Omaha
Adam Keiswetter|Neb.-Kearney
Cole Province|Central Okla.
Sonny Phillip|Shippensburg
Kourtney Lake|Adams State
Jamie Andersh|Northern St.
Nick Magee|North Dakota St.
Aaron Mann|Central Wash.
Ryan Finn|Mercyhurst
Zach Meissner|Ashland
Donald Lockett|San Fran. St.
Derek Miller|St. Cloud St.
Jack Scott|Findlay
Ryon Mazzocco|Pitt.-Johnstown""", """
r1 Lucas > Hansen | D;4-2
r1 Waite > Keiswetter | D;4-3
r1 Province > Phillip | F;3:51
r1 Lake > Andersh | D;5-1
r1 Magee > Mann | D;7-4
r1 Meissner > Finn | D;5-4
r1 Lockett > Miller | M;12-3
r1 Scott > Mazzocco | D;8-2
qf Lucas > Waite | D;5-4
qf Province > Lake | D;5-4;TB1
qf Magee > Meissner | D;4-2
qf Lockett > Scott | F;6:22
sf Province > Lucas | D;7-1
sf Lockett > Magee | M;12-4
f Province > Lockett | D;6-3
c1 Keiswetter > Hansen | M;14-2
c1 Andersh > Phillip | F;4:42
c1 Mann > Finn | M;11-1
c1 Miller > Mazzocco | D;14-9
c2 Keiswetter > Scott | D;12-5
c2 Andersh > Meissner | F;8:23
c2 Lake > Mann | D;4-2
c2 Waite > Miller | F;6:59
cqf Keiswetter > Andersh | M;12-3
cqf Lake > Waite | D;3-1
csf Lucas > Keiswetter | D;5-3
csf Magee > Lake | D;5-3;SV1
3rd Lucas > Magee | D;5-2
5th Keiswetter > Lake | F;1:27
7th Waite > Andersh | D;5-2""")
W['141'] = ("""
Jason Nestor|Pitt.-Johnstown
Eli Dominguez|Neb.-Omaha
Pacifico Garcia|San Fran. St.
Merrick Meyer|Truman State
Jason Rhoten|Minn. St. Mankato
Gerry Braun|Anderson S.C.
Brad Russell|Wisc.-Parkside
R.C. LaHaye|Western State
Shane Barnes|Adams State
Wade Bramlitt|Central Okla.
Joe Hagedorn|West Liberty St.
Mathias Bitz|North Dakota St.
Joey Simcoe|Findlay
Matt True|Neb.-Kearney
Andre VanderVelde|Augustana S.D.
Willie Hilton|UNC.-Pembroke""", """
r1 Dominguez > Nestor | D;3-1;SV1
r1 Meyer > Garcia | D;6-0
r1 Rhoten > Braun | D;2-0
r1 Russell > LaHaye | D;8-2
r1 Barnes > Bramlitt | M;12-0
r1 Hagedorn > Bitz | D;5-4
r1 Simcoe > True | D;1-0
r1 Hilton > VanderVelde | D;7-5;SV1
qf Meyer > Dominguez | F;2:51
qf Rhoten > Russell | D;4-3
qf Barnes > Hagedorn | M;10-0
qf Simcoe > Hilton | M;11-3
sf Meyer > Rhoten | M;15-1
sf Barnes > Simcoe | D;6-1
f Meyer > Barnes | D;6-3
c1 Nestor > Garcia | D;2-0
c1 LaHaye > Braun | T1.5;17-1;4:18
c1 Bramlitt > Bitz | D;5-2
c1 VanderVelde > True | M;13-5
c2 Hilton > Nestor | D;3-1;SV1
c2 LaHaye > Hagedorn | D;8-6
c2 Bramlitt > Russell | F;DQ
c2 Dominguez > VanderVelde | D;10-6
cqf LaHaye > Hilton | D;4-2
cqf Dominguez > Bramlitt | D;10-8;SV1
csf Rhoten > LaHaye | F;4:27
csf Dominguez > Simcoe | D;7-6
3rd Dominguez > Rhoten | D;9-7
5th Simcoe > LaHaye | F;4:41
7th Bramlitt > Hilton | D;4-1""")
W['149'] = ("""
R.J. Paterniti|Gannon
David Nordhues|Fort Hays St.
Jerod Goodwin|Central Okla.
Jeremy Roe|South Dakota St.
Luke Santos|San Fran. St.
Will Tedder|Mercyhurst
Patrick Allibone|Neb.-Omaha
Angelo Vettese|Findlay
Mitch Napier|Indianapolis
Zach Stevens|North Dakota St.
Zack Leathers|Shippensburg
Adrian Jiron|Western State
Ryan King|Augustana S.D.
Mike Neely|Ashland
Nathan Peterson|Colorado Mines
Ryan Ickes|Pitt.-Johnstown""", """
r1 Nordhues > Paterniti | D;11-5
r1 Roe > Goodwin | D;5-2
r1 Santos > Tedder | D;7-4
r1 Allibone > Vettese | F;3:41
r1 Napier > Stevens | D;6-4;SV1
r1 Jiron > Leathers | D;8-3
r1 King > Neely | D;10-4
r1 Ickes > Peterson | D;7-4
qf Roe > Nordhues | D;7-5
qf Allibone > Santos | D;5-4;TB1
qf Jiron > Napier | F;4:46
qf Ickes > King | F;2:05
sf Allibone > Roe | D;6-4;TB1
sf Jiron > Ickes | D;5-3
f Jiron > Allibone | D;6-2
c1 Paterniti > Goodwin | M;11-3
c1 Vettese > Tedder | F;1:07
c1 Leathers > Stevens | F;5:06
c1 Peterson > Neely | D;10-7
c2 King > Paterniti | D;13-6
c2 Vettese > Napier | M;13-5
c2 Leathers > Santos | D;8-6
c2 Peterson > Nordhues | D;8-2
cqf King > Vettese | D;7-1
cqf Leathers > Peterson | D;6-3
csf King > Roe | M;14-2
csf Ickes > Leathers | F;2:29
3rd King > Ickes | D;8-3
5th Leathers > Roe | F;1:49
7th Vettese > Peterson | F;0:35""")
W['157'] = ("""
Matt Roncolato|Pitt.-Johnstown
Josh Holden|Indianapolis
Chas DeVetter|Neb.-Omaha
Travis Peak|Chadron St.
Ryan Hunter|Central Mo. St.
A.J. Sayles|Gannon
Travis Koppenhafer|Adams State
Joe Kenton|South Dakota St.
Paul Carlson|North Dakota St.
Rick Rank|Colorado Mines
Jerome Benjamin|UNC.-Pembroke
Dan Dempsey|Wisc.-Parkside
Jack Quintana|Western State
Josh Jansen|Minn. St. Moorhead
Dugan Bentley|Ashland
Luke Main|West Liberty St.""", """
r1 Roncolato > Holden | D;6-4
r1 Peak > DeVetter | F;6:44
r1 Hunter > Sayles | T1.5;18-2;6:31
r1 Koppenhafer > Kenton | M;15-2
r1 Carlson > Rank | D;7-6
r1 Dempsey > Benjamin | F;4:12
r1 Quintana > Jansen | F;1:42
r1 Main > Bentley | D;2-1
qf Peak > Roncolato | D;6-4;SV1
qf Koppenhafer > Hunter | M;15-1
qf Carlson > Dempsey | D;6-5
qf Quintana > Main | M;12-0
sf Koppenhafer > Peak | M;15-1
sf Quintana > Carlson | D;8-2
f Koppenhafer > Quintana | D;10-6
c1 DeVetter > Holden | D;5-3;SV1
c1 Kenton > Sayles | F;3:57
c1 Rank > Benjamin | D;10-4
c1 Jansen > Bentley | D;7-5
c2 Main > DeVetter | M;10-2
c2 Dempsey > Kenton | D;6-2
c2 Rank > Hunter | D;9-2
c2 Jansen > Roncolato | M;12-4
cqf Main > Dempsey | D;3-2
cqf Rank > Jansen | F;1:08
csf Main > Peak | D;5-2
csf Carlson > Rank | D;8-7
3rd Carlson > Main | D;4-2
5th Rank > Peak | F;2:07
7th Dempsey > Jansen | F;0:23""")
W['165'] = ("""
Dwayne Coward|UNC.-Pembroke
Brett Batholomaus|Southwest Minn. St.
Scott Cleve|Adams State
Derek Donelson|Indianapolis
Mike Fiedler|North Dakota St.
Zachary Schafer|Mercyhurst
Waylon Lowe|Findlay
Aaron Dalton|Neb.-Kearney
Jordan Johnson|Chadron St.
Matt Neely|Ashland
Mark Murphy|Shippensburg
Nathan Althoff|South Dakota St.
Shawn Silvis|Central Okla.
Tyler Lancaster|Western State
J.D. Naig|Neb.-Omaha
Mark Glova|Pitt.-Johnstown""", """
r1 Coward > Batholomaus | D;10-5
r1 Donelson > Cleve | D;4-1
r1 Fiedler > Schafer | D;15-8
r1 Lowe > Dalton | M;17-7
r1 Johnson > Neely | D;2-1
r1 Althoff > Murphy | D;8-4
r1 Silvis > Lancaster | T1.5;15-0;7:00
r1 Naig > Glova | D;5-0
qf Coward > Donelson | M;13-4
qf Lowe > Fiedler | D;9-3
qf Althoff > Johnson | D;8-3
qf Silvis > Naig | D;7-1
sf Lowe > Coward | D;5-3;SV1
sf Silvis > Althoff | M;10-2
f Lowe > Silvis | D;8-6
c1 Cleve > Batholomaus | D;7-3
c1 Schafer > Dalton | D;19-14
c1 Neely > Murphy | D;5-3
c1 Glova > Lancaster | D;5-0
c2 Naig > Cleve | M;13-2
c2 Johnson > Schafer | D;8-5
c2 Fiedler > Neely | D;3-2
c2 Glova > Donelson | D;4-0
cqf Naig > Johnson | F;5:34
cqf Fiedler > Glova | D;4-2
csf Naig > Coward | F;6:36
csf Fiedler > Althoff | D;5-2
3rd Naig > Fiedler | D;4-1
5th Althoff > Coward | D;13-8
7th Johnson > Glova | D;6-2""")
W['174'] = ("""
John Burda|Pitt.-Johnstown
Zac Cornett|Colorado Mines
Tommy Bauer|Ashland
Dusty Wilking|Augustana S.D.
Aaron Meister|Fort Hays St.
Paul Bergman|Mercyhurst
Travis Krinkie|Minn. St. Mankato
Brett Barbarick|Central Mo. St.
Jason Tapia|Central Okla.
Andy Sinclair|Northern St.
Jason Radtke|Gannon
Caleb Young|Neb.-Kearney
Thad Pike|North Dakota St.
Nathan Jones|Carson-Newman
Cameron Bretz|Western State
Careef Robertson|Anderson S.C.""", """
r1 Burda > Cornett | F;3:17
r1 Bauer > Wilking | F;3:34
r1 Meister > Bergman | D;2-0
r1 Barbarick > Krinkie | F;4:18
r1 Tapia > Sinclair | F;2:18
r1 Radtke > Young | F;2:06
r1 Pike > Jones | T1.5;19-4;6:43
r1 Robertson > Bretz | D;5-4
qf Burda > Bauer | D;3-2
qf Meister > Barbarick | F;6:35
qf Tapia > Radtke | T1.5;25-8;6:54
qf Pike > Robertson | D;4-2;SV1
sf Burda > Meister | D;8-2
sf Tapia > Pike | D;7-2
f Tapia > Burda | F;1:25
c1 Wilking > Cornett | F;0:29
c1 Krinkie > Bergman | D;10-7
c1 Sinclair > Young | F;4:52
c1 Bretz > Jones | F;1:38
c2 Wilking > Robertson | D;3-2
c2 Krinkie > Radtke | D;7-6
c2 Barbarick > Sinclair | F;0:54
c2 Bauer > Bretz | M;17-5
cqf Wilking > Krinkie | F;M FOR
cqf Barbarick > Bauer | D;8-6
csf Meister > Wilking | D;6-3
csf Pike > Barbarick | F;2:24
3rd Pike > Meister | D;3-2
5th Barbarick > Wilking | D;5-4
7th Bauer > Krinkie | F;M FOR""")
W['184'] = ("""
Randy Pyle|Pitt.-Johnstown
Bryan Tapley|Central Okla.
Ryan Kopiasz|Minn. St. Moorhead
Ben Holscher|Chadron St.
Greg Nurrenbern|Truman State
Derek Brunson|UNC.-Pembroke
Matt Trout|Western State
Matt Hermann|North Dakota St.
Tom Meester|Augustana S.D.
Casey Woodall|Adams State
Corey Jacoby|Shippensburg
Kris Klepacz|Findlay
Jordan Nichols|Fort Hays St.
Jon Dierks|Minn. St. Mankato
Kevin Grece|Central Mo. St.
Ben McAvinew|Mercyhurst""", """
r1 Pyle > Tapley | M;10-2
r1 Kopiasz > Holscher | M;9-1
r1 Nurrenbern > Brunson | D;10-4
r1 Hermann > Trout | D;10-6
r1 Meester > Woodall | F;4:32
r1 Jacoby > Klepacz | D;10-6
r1 Nichols > Dierks | M;10-2
r1 McAvinew > Grece | D;6-2
qf Kopiasz > Pyle | D;12-11
qf Hermann > Nurrenbern | D;6-5
qf Meester > Jacoby | M;13-5
qf Nichols > McAvinew | D;6-4
sf Hermann > Kopiasz | D;4-2;SV1
sf Meester > Nichols | D;5-2
f Meester > Hermann | M;10-1
c1 Tapley > Holscher | D;10-3
c1 Brunson > Trout | M;16-6
c1 Klepacz > Woodall | M;14-1
c1 Dierks > Grece | D;5-2
c2 Tapley > McAvinew | D;3-1;SV1
c2 Jacoby > Brunson | D;2-1;TB1
c2 Nurrenbern > Klepacz | D;9-2
c2 Pyle > Dierks | F;M FOR
cqf Jacoby > Tapley | F;6:59
cqf Pyle > Nurrenbern | D;6-2
csf Jacoby > Kopiasz | D;7-4
csf Pyle > Nichols | D;4-1
3rd Pyle > Jacoby | D;6-2
5th Kopiasz > Nichols | F;0:38
7th Nurrenbern > Tapley | D;9-2""")
W['197'] = ("""
Justin Mautz|Mercyhurst
Ben Strandberg|Neb.-Omaha
Jeff Rusher|Chadron St.
John Goral|Wisc.-Parkside
Brian Kraemer|North Dakota St.
Bret Wade|Kutztown
Ryan Kirst|Ashland
Brian King|Fort Hays St.
Jeff Sylvester|Neb.-Kearney
Clint Salisbury|Findlay
Howard Bell|Pitt.-Johnstown
Josh Janousek|Minn. St. Mankato
Kevin Lochner|Central Okla.
Blake Wilson|Western State
Tim Boldt|South Dakota St.
Corey Winston|UNC.-Pembroke""", """
r1 Mautz > Strandberg | F;FOR
r1 Rusher > Goral | D;4-2
r1 Kraemer > Wade | F;2:29
r1 Kirst > King | M;13-5
r1 Sylvester > Salisbury | M;8-0
r1 Bell > Janousek | D;3-2
r1 Lochner > Wilson | F;1:29
r1 Winston > Boldt | F;FOR
qf Rusher > Mautz | D;3-1
qf Kraemer > Kirst | D;7-3
qf Sylvester > Bell | D;3-2
qf Lochner > Winston | D;5-0
sf Kraemer > Rusher | F;3:27
sf Sylvester > Lochner | D;6-2
f Sylvester > Kraemer | M;12-4
c1 Goral > Strandberg | F;FOR
c1 King > Wade | F;5:20
c1 Janousek > Salisbury | M;11-2
c1 Wilson > Boldt | F;FOR
c2 Winston > Goral | D;13-7
c2 Bell > King | M;8-0
c2 Janousek > Kirst | D;13-10
c2 Mautz > Wilson | D;3-0
cqf Bell > Winston | F;6:48
cqf Mautz > Janousek | D;8-5
csf Bell > Rusher | D;3-1;SV1
csf Lochner > Mautz | D;5-3
3rd Lochner > Bell | D;2-0
5th Mautz > Rusher | F;M FOR
7th Janousek > Winston | F;5:47""")
W['285'] = ("""
Zach Majocha|Pitt.-Johnstown
Kipp Cullin|Western State
Evan Love|Indianapolis
Joe Bryce|North Dakota St.
Andrew Ubben|Fort Hays St.
Josh Woodruff|UNC.-Pembroke
Baron Blanchard|Northern St.
Aldo Campea|Ashland
Willie McCowan|Central Mo. St.
Mike Engelmann|Minn. St. Mankato
Angelo Caponi|Mercyhurst
Daren Murphy|San Fran. St.
Les Sigman|Neb.-Omaha
Matt Meyer|Wisc.-Parkside
Derek Thompson|Colorado Mines
Chris Bulley|West Liberty St.""", """
r1 Majocha > Cullin | D;3-2
r1 Bryce > Love | F;10:29
r1 Ubben > Woodruff | F;5:48
r1 Campea > Blanchard | D;5-3
r1 McCowan > Engelmann | M;12-4
r1 Murphy > Caponi | D;3-2
r1 Sigman > Meyer | T1.5;17-2;6:54
r1 Thompson > Bulley | D;5-2
qf Bryce > Majocha | D;2-1;TB1
qf Ubben > Campea | D;5-2
qf McCowan > Murphy | F;2:37
qf Sigman > Thompson | F;4:06
sf Ubben > Bryce | D;7-1
sf Sigman > McCowan | T1.5;15-0;7:00
f Sigman > Ubben | F;M FOR
c1 Love > Cullin | D;2-1;TB1
c1 Blanchard > Woodruff | F;3:58
c1 Engelmann > Caponi | D;9-3
c1 Meyer > Bulley | F;0:47
c2 Thompson > Love | D;6-2
c2 Blanchard > Murphy | F;1:44
c2 Campea > Engelmann | D;5-4
c2 Meyer > Majocha | F;2:04
cqf Blanchard > Thompson | T1.5;16-0;4:42
cqf Campea > Meyer | D;3-2
csf Blanchard > Bryce | D;7-0
csf McCowan > Campea | D;4-1
3rd Blanchard > McCowan | D;8-2
5th Campea > Bryce | D;2-1
7th Meyer > Thompson | F;0:34""")
