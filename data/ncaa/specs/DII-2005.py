HEADER = "# NCAA Division II Championships 2005 — source: 2005.pdf (scan; typed from the bracket pages, 2026-11-18; no records printed)"
CODES = {'UPJ':'Pitt-Johnstown','UF':'Findlay','UNO':'Nebraska-Omaha','WSC':'Western State College','ASH':'Ashland','SU':'Shippensburg','ASC':'Adams State','MSUMA':'Minnesota State Mankato','AUG':'Augustana SD','FHSU':'Fort Hays State','KU':'Kutztown','TSU':'Truman State','UNK':'Nebraska-Kearney','NSU':'Northern State','CNC':'Carson-Newman','MC':'Mercyhurst','UNCP':'UNC Pembroke','UCO':'Central Oklahoma','GU':'Gannon','UI':'Indianapolis','CMSU':'Central Missouri','CSM':'Colorado School of Mines','MSUMO':'Minnesota State Moorhead','WLSC':'West Liberty State','SIUE':'SIU Edwardsville','SFSU':'San Francisco State','SCSU':'St. Cloud State','CSC':'Chadron State','UWP':'Wisconsin-Parkside','SWMS':'Southwest Minnesota State','ACSC':'Anderson College','LC':'Limestone'}
W = {}
W['125'] = ("""
Ryon Mazzocco|UPJ
Mitch Aring|UF
Dustin Tovar|UNO
Marques Bravo|WSC
James Phillips|ASH
Jamie Thomas|SU
Rob McCabe|ASC
Nick Smith|MSUMA
Aaron Graumann|AUG
Kory Lira|FHSU
Brandon Clemmer|KU
Dan Keller|TSU
Bryce Abbey|UNK
Chas Welch|NSU
Chonci Houston|CNC
Ricky Randazzo|MC""", """
r1 Mazzocco > Aring | M;15-4
r1 Tovar > Bravo | D;3-1
r1 Phillips > Thomas | D;4-1
r1 McCabe > Smith | D;6-4
r1 Graumann > Lira | M;13-5
r1 Clemmer > Keller | D;7-0
r1 Abbey > Welch | M;11-1
r1 Randazzo > Houston | D;4-2;TB1
qf Mazzocco > Tovar | D;3-1;TB1
qf McCabe > Phillips | D;7-6
qf Graumann > Clemmer | F;2:06
qf Abbey > Randazzo | D;7-3
sf Mazzocco > McCabe | D;7-6
sf Graumann > Abbey | D;5-4
f Graumann > Mazzocco | D;4-3
c1 Bravo > Aring | D;5-0
c1 Thomas > Smith | D;6-4
c1 Keller > Lira | D;9-6
c1 Houston > Welch | D;2-1;TB1
c2 Randazzo > Bravo | D;5-1
c2 Thomas > Clemmer | D;5-2
c2 Phillips > Keller | D;10-6
c2 Tovar > Houston | D;2-1
cqf Thomas > Randazzo | M;10-1
cqf Tovar > Phillips | D;4-1
csf McCabe > Thomas | F;7:44
csf Tovar > Abbey | D;3-2
3rd Tovar > McCabe | D;9-3
5th Abbey > Thomas | F;M FOR
7th Phillips > Randazzo | D;3-2""")
W['133'] = ("""
Curry Pickard|UNCP
Justin Bohlke|AUG
Raymond Dunning|ASC
Jared Henning|UCO
Dan Hilario|UNO
Mike Sanders|GU
Shane Perkey|UI
Dustin Greenemeyer|FHSU
Adam Keiswetter|UNK
Mike Hansen|CMSU
JJ Zanetta|MC
Efrain Ayala|MSUMA
Andy Uhl|UF
Garrett Eller|CSM
Scott Ahlf|MSUMO
Matt Mossor|WLSC""", """
r1 Pickard > Bohlke | M;19-6
r1 Henning > Dunning | D;9-2
r1 Hilario > Sanders | D;6-2
r1 Perkey > Greenemeyer | T1.5;18-2;3:48
r1 Hansen > Keiswetter | D;3-1
r1 Ayala > Zanetta | D;3-2
r1 Uhl > Eller | T1.5;19-2;6:15
r1 Mossor > Ahlf | M;10-1
qf Pickard > Henning | F;0:58
qf Perkey > Hilario | D;11-7
qf Hansen > Ayala | D;4-3
qf Uhl > Mossor | D;11-4
sf Pickard > Perkey | T1.5;17-2;4:47
sf Uhl > Hansen | M;12-2
f Uhl > Pickard | F;5:35
c1 Dunning > Bohlke | M;16-3
c1 Sanders > Greenemeyer | D;8-3
c1 Keiswetter > Zanetta | F;2:40
c1 Ahlf > Eller | D;5-1
c2 Dunning > Mossor | F;1:32
c2 Sanders > Ayala | D;4-3
c2 Keiswetter > Hilario | F;3:58
c2 Henning > Ahlf | D;11-8
cqf Dunning > Sanders | M;13-1
cqf Keiswetter > Henning | F;5:48
csf Perkey > Dunning | D;11-7
csf Keiswetter > Hansen | F;1:26
3rd Keiswetter > Perkey | F;7:51
5th Hansen > Dunning | F;0:55
7th Henning > Sanders | M;10-1""")
W['141'] = ("""
Thad Benton|UPJ
Matt True|UNK
Wade Killgore|CMSU
Ben Keen|MSUMO
Donald Lockett|SFSU
Brandon Monin|GU
Brandon Girtz|MSUMA
Merrick Meyer|TSU
Kyle Evans|UCO
Andre VanderVelde|AUG
Don Cummings|MC
R.C. LaHaye|WSC
Eli Dominguez|UNO
Danny Norman|UI
Kortney Lake|ASC
Joseph Provini|SU""", """
r1 Benton > True | D;6-2
r1 Killgore > Keen | D;3-2
r1 Lockett > Monin | M;17-6
r1 Meyer > Girtz | F;FOR
r1 VanderVelde > Evans | M;12-4
r1 Cummings > LaHaye | F;6:26
r1 Dominguez > Norman | F;4:13
r1 Lake > Provini | D;4-2
qf Benton > Killgore | M;14-3
qf Lockett > Meyer | D;13-11;SV1
qf VanderVelde > Cummings | D;7-1
qf Dominguez > Lake | F;1:54
sf Benton > Lockett | D;11-4
sf Dominguez > VanderVelde | D;13-6
f Benton > Dominguez | D;9-4
c1 Keen > True | D;6-2
c1 Girtz > Monin | D;12-9;TB1
c1 Evans > LaHaye | D;8-3
c1 Norman > Provini | D;4-2
c2 Keen > Lake | D;9-2
c2 Cummings > Girtz | T1.5;20-3;5:08
c2 Evans > Meyer | D;4-2
c2 Killgore > Norman | D;8-5
cqf Cummings > Keen | M;8-0
cqf Evans > Killgore | D;5-2;TB2
csf Lockett > Cummings | M;13-5
csf VanderVelde > Evans | D;5-1
3rd Lockett > VanderVelde | D;12-7
5th Cummings > Evans | F;0:26
7th Killgore > Keen | D;4-3""")
W['149'] = ("""
R.J. Paterniti|GU
Joe Rujawitz|SIUE
Shane Unger|UNO
Anthony Aragon|ASC
Tony Guerra|UF
Andrew Steed|UNCP
Camille DuPont|WSC
Jason Rhoten|MSUMA
Ryan King|AUG
Pat True|UNK
Zack Leathers|SU
Dugan Bentley|ASH
Pacifico Garcia|SFSU
Danny Meyer|MSUMO
Shea Timothy|UCO
Ryan Ickes|UPJ""", """
r1 Paterniti > Rujawitz | D;3-1
r1 Unger > Aragon | D;5-2
r1 Guerra > Steed | M;13-2
r1 Rhoten > DuPont | D;3-0
r1 King > True | M;13-5
r1 Leathers > Bentley | D;6-2
r1 Garcia > Meyer | F;4:09
r1 Timothy > Ickes | D;8-4
qf Paterniti > Unger | D;2-1
qf Rhoten > Guerra | D;3-2
qf King > Leathers | D;9-7
qf Garcia > Timothy | D;6-2
sf Rhoten > Paterniti | D;4-3
sf Garcia > King | D;9-4
f Garcia > Rhoten | D;2-1
c1 Rujawitz > Aragon | D;8-6
c1 Steed > DuPont | F;2:37
c1 Bentley > True | D;10-4
c1 Ickes > Meyer | D;15-8
c2 Timothy > Rujawitz | D;7-4
c2 Leathers > Steed | T1.5;20-4;6:34
c2 Guerra > Bentley | D;8-7
c2 Ickes > Unger | M;9-1
cqf Leathers > Timothy | D;9-3
cqf Guerra > Ickes | D;10-8
csf Paterniti > Leathers | D;8-6
csf King > Guerra | D;3-2
3rd Paterniti > King | D;10-9
5th Guerra > Leathers | D;10-8
7th Timothy > Ickes | D;4-2""")
W['157'] = ("""
Matt Roncolato|UPJ
Shawn Plumley|SWMS
Scott Cleve|ASC
Dustin Teeman|TSU
Patrick Allibone|UNO
Hudson Harrison|MC
Mitch Napier|UI
Zach Lee|WSC
David Nordhues|FHSU
Pete Carnabuci|ASH
Aaron Gunning|UNCP
Math Bitz|MSUMA
Angelo Vettese|UF
Jaime Alvarez|SFSU
Austin Scarset|AUG
Luke Main|WLSC""", """
r1 Roncolato > Plumley | D;13-7
r1 Teeman > Cleve | D;9-7
r1 Allibone > Harrison | F;6:48
r1 Napier > Lee | F;6:59
r1 Nordhues > Carnabuci | D;8-3
r1 Bitz > Gunning | D;4-0
r1 Vettese > Alvarez | F;6:12
r1 Scarset > Main | D;6-4
qf Teeman > Roncolato | D;5-2
qf Allibone > Napier | D;7-6;TB1
qf Bitz > Nordhues | D;4-2;TB1
qf Vettese > Scarset | F;4:12
sf Allibone > Teeman | D;3-1
sf Vettese > Bitz | D;4-2
f Allibone > Vettese | D;6-2
c1 Cleve > Plumley | D;10-7
c1 Lee > Harrison | M;15-5
c1 Gunning > Carnabuci | D;11-6
c1 Main > Alvarez | D;9-6
c2 Scarset > Cleve | D;14-9
c2 Nordhues > Lee | D;3-2
c2 Gunning > Napier | D;6-5
c2 Main > Roncolato | D;2-1
cqf Nordhues > Scarset | M;19-11
cqf Main > Gunning | D;2-1
csf Nordhues > Teeman | D;8-1
csf Bitz > Main | D;3-1;SV1
3rd Bitz > Nordhues | D;3-2
5th Main > Teeman | D;3-1
7th Scarset > Gunning | D;9-7;SV1""")
W['165'] = ("""
Dwayne Coward|UNCP
Willy Jones|CSC
Adam Morris|UF
Nathan Schut|SCSU
Aaron Dalton|UNK
Jacob Tazzi|GU
Cody Henriksen|AUG
A.J. Morgan|UWP
Eric Lakia|ASH
Rockie Stavn|MSUMO
Zack Schafer|MC
Peter Jenson|CSM
Jeremiah Naig|UNO
Cort Petersen|UCO
Evan Copeland|ASC
Chris Gibbs|WLSC""", """
r1 Coward > Jones | F;5:12
r1 Morris > Schut | D;8-4
r1 Dalton > Tazzi | D;7-4
r1 Henriksen > Morgan | D;3-1;SV1
r1 Stavn > Lakia | D;2-1
r1 Schafer > Jenson | D;11-4
r1 Naig > Petersen | F;2:25
r1 Copeland > Gibbs | D;7-4
qf Coward > Morris | F;2:36
qf Henriksen > Dalton | D;6-3
qf Schafer > Stavn | D;9-6
qf Naig > Copeland | F;2:04
sf Coward > Henriksen | M;15-4
sf Naig > Schafer | M;12-1
f Naig > Coward | D;10-5
c1 Schut > Jones | D;3-1
c1 Tazzi > Morgan | M;10-1
c1 Jenson > Lakia | F;1:02
c1 Petersen > Gibbs | D;6-0
c2 Copeland > Schut | D;9-2
c2 Stavn > Tazzi | D;9-6
c2 Jenson > Dalton | D;9-4
c2 Petersen > Morris | D;6-1
cqf Copeland > Stavn | M;14-3
cqf Jenson > Petersen | D;7-3
csf Copeland > Henriksen | D;8-2
csf Schafer > Jenson | D;5-3
3rd Copeland > Schafer | D;10-8;SV1
5th Jenson > Henriksen | D;13-11;SV1
7th Petersen > Stavn | D;8-6""")
W['174'] = ("""
Careef Robertson|ACSC
Mike Jackson|UI
Dusty Wilking|AUG
Jake Schluckebier|CSC
Tom Bauer|ASH
Eli Garshnick|UPJ
Zac Rice|UNK
Steve Conlin|UNO
Travis Krinke|MSUMA
James Reynolds|ASC
Tommy Clark|WLSC
Ben Thiem|UWP
Matt Trout|WSC
Tim Johns|SWMS
Eric Scholle|SIUE
Ryan Wasser|KU""", """
r1 Robertson > Jackson | D;6-4
r1 Wilking > Schluckebier | D;8-5
r1 Garshnick > Bauer | D;8-7;TB1
r1 Conlin > Rice | D;3-2
r1 Krinke > Reynolds | D;14-8
r1 Clark > Thiem | D;3-1;SV1
r1 Johns > Trout | D;8-5
r1 Wasser > Scholle | D;12-11
qf Robertson > Wilking | D;3-2
qf Garshnick > Conlin | F;5:55
qf Krinke > Clark | D;9-8
qf Johns > Wasser | M;14-4
sf Robertson > Garshnick | D;6-4;SV1
sf Krinke > Johns | D;9-4
f Robertson > Krinke | D;6-4;SV1
c1 Jackson > Schluckebier | D;6-1
c1 Bauer > Rice | F;1:54
c1 Thiem > Reynolds | D;6-3
c1 Trout > Scholle | D;3-2
c2 Jackson > Wasser | F;3:46
c2 Clark > Bauer | D;6-4
c2 Conlin > Thiem | D;5-0
c2 Trout > Wilking | D;10-3
cqf Jackson > Clark | D;9-4
cqf Trout > Conlin | D;5-1
csf Jackson > Garshnick | D;9-4
csf Trout > Johns | D;12-6
3rd Jackson > Trout | F;1:55
5th Johns > Garshnick | M;14-2
7th Conlin > Clark | D;6-5""")
W['184'] = ("""
Derek Brunson|UNCP
Todd Naasz|NSU
Don Ortega|ASC
Clint Carmony|ASH
Tom Meester|AUG
Mark Murphy|SU
Anthony Morgan|CNC
Dan Hospodka|UNK
Mike Howell|FHSU
Kristopher Klepacz|UF
Ben McAvinew|MC
John Koons|MSUMA
Gordon Harrison|TSU
Dillon Blackman|CSM
Eric Hageman|MSUMO
Mike Corcetti|UPJ""", """
r1 Brunson > Naasz | D;12-5
r1 Carmony > Ortega | D;8-7
r1 Meester > Murphy | M;12-3
r1 Morgan > Hospodka | D;10-5
r1 Howell > Klepacz | D;5-4
r1 McAvinew > Koons | D;5-4
r1 Harrison > Blackman | D;3-0
r1 Corcetti > Hageman | M;12-1
qf Carmony > Brunson | D;8-5
qf Meester > Morgan | F;2:52
qf McAvinew > Howell | F;2:27
qf Corcetti > Harrison | D;16-14
sf Meester > Carmony | T1.5;16-0;5:06
sf McAvinew > Corcetti | D;12-6
f Meester > McAvinew | M;12-2
c1 Ortega > Naasz | D;6-2
c1 Murphy > Hospodka | F;1:01
c1 Klepacz > Koons | D;6-3
c1 Blackman > Hageman | D;5-2
c2 Ortega > Harrison | D;9-4
c2 Murphy > Howell | D;17-12
c2 Klepacz > Morgan | D;7-4
c2 Brunson > Blackman | F;1:58
cqf Murphy > Ortega | D;4-3
cqf Klepacz > Brunson | F;4:08
csf Carmony > Murphy | D;10-4
csf Corcetti > Klepacz | D;9-4
3rd Carmony > Corcetti | M;14-5
5th Murphy > Klepacz | F;3:13
7th Ortega > Brunson | D;5-3""")
W['197'] = ("""
Howard Bell|UPJ
D.C. Hazen|CSM
Kevin Lochner|UCO
Cory Wellnitz|NSU
Jeff Sylvester|UNK
Daryl Scott|ACSC
Tim Boldt|AUG
Ryan Kirst|ASH
Plamen Paskalev|CMSU
Ben Strandberg|UNO
Corey Jacoby|SU
Josh Vialpando|ASC
Josh Janousek|MSUMA
John Goral|UWP
Dustin Trego|FHSU
Justin Mautz|MC""", """
r1 Bell > Hazen | M;12-4
r1 Lochner > Wellnitz | D;10-5
r1 Sylvester > Scott | F;5:36
r1 Boldt > Kirst | D;10-5
r1 Paskalev > Strandberg | D;14-8
r1 Jacoby > Vialpando | M;10-0
r1 Goral > Janousek | D;5-4
r1 Trego > Mautz | D;5-2
qf Bell > Lochner | D;3-1;SV1
qf Boldt > Sylvester | D;10-8;SV1
qf Jacoby > Paskalev | D;4-3;TB1
qf Goral > Trego | D;9-5
sf Boldt > Bell | D;5-2
sf Jacoby > Goral | M;13-2
f Jacoby > Boldt | D;5-3
c1 Wellnitz > Hazen | M;13-3
c1 Kirst > Scott | D;13-9
c1 Strandberg > Vialpando | D;8-7
c1 Janousek > Mautz | F;1:19
c2 Wellnitz > Trego | D;10-5
c2 Paskalev > Kirst | F;6:45
c2 Sylvester > Strandberg | F;3:58
c2 Janousek > Lochner | D;3-0
cqf Paskalev > Wellnitz | F;6:47
cqf Janousek > Sylvester | D;7-2
csf Paskalev > Bell | D;6-4
csf Janousek > Goral | D;2-1;TB1
3rd Paskalev > Janousek | D;2-1
5th Bell > Goral | D;4-2
7th Sylvester > Wellnitz | F;3:56""")
W['285'] = ("""
Zach Majocha|UPJ
Justin Tazzi|UF
Chris Tuscherer|MSUMO
Kipp Cullin|WSC
Josh Leadingfox|UCO
Jared Dubbs|SU
Derek Thompson|CSM
Mike Engelmann|MSUMA
Les Sigman|UNO
Heath Soderstrom|ASC
Angelo Caponi|MC
Matt Meyer|UWP
Tervel Dlagnev|UNK
Chris Bietz|AUG
Aldo Campea|ASH
Jon Richard|LC""", """
r1 Tazzi > Majocha | F;1:47
r1 Tuscherer > Cullin | D;3-2;TB1
r1 Leadingfox > Dubbs | M;10-2
r1 Engelmann > Thompson | F;4:47
r1 Sigman > Soderstrom | F;6:13
r1 Meyer > Caponi | F;5:15
r1 Dlagnev > Bietz | D;7-5
r1 Campea > Richard | D;6-3
qf Tuscherer > Tazzi | D;10-5
qf Leadingfox > Engelmann | D;3-2
qf Sigman > Meyer | F;2:28
qf Dlagnev > Campea | D;3-2
sf Tuscherer > Leadingfox | D;5-3
sf Sigman > Dlagnev | M;13-5
f Sigman > Tuscherer | M;18-4
c1 Cullin > Majocha | F;M FOR
c1 Thompson > Dubbs | D;4-1
c1 Soderstrom > Caponi | D;3-1
c1 Richard > Bietz | F;2:52
c2 Campea > Cullin | D;3-2
c2 Thompson > Meyer | F;2:16
c2 Engelmann > Soderstrom | F;0:54
c2 Richard > Tazzi | D;11-6
cqf Campea > Thompson | D;3-2
cqf Engelmann > Richard | F;4:05
csf Campea > Leadingfox | D;2-1;TB1
csf Engelmann > Dlagnev | D;6-4
3rd Engelmann > Campea | F;4:03
5th Leadingfox > Dlagnev | D;6-5
7th Richard > Thompson | D;13-9""")
