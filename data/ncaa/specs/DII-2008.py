HEADER = "# NCAA Division II Championships 2008 — source: 2008.pdf (scan; typed from the bracket pages, 2026-11-18; colleges as the team standings name them). \"2008 (1).pdf\" is the same file."
CODES = {'UNCP':'UNC Pembroke','WSC':'Western State','TSU':'Truman State','MSUMA':'Minnesota St Mankato','ASC':'Adams State College','BAC':'Belmont Abbey','UIU':'Upper Iowa','UCM':'Central Missouri','UWP':'UW Parkside','NSU':'Northern State','NC':'Newberry College','CSC':'Chadron State College','UNO':'Nebraska Omaha','CNC':'Carson Newman College','SFSU':'San Francisco State','WLSC':'West Liberty State','UPJ':'Pittsburgh Johnstown','SCSU':'St. Cloud State','UINDY':'Indianapolis','GU':'Gannon','AC':'Augustana SD','UNK':'Nebraska Kearney','UCO':'Central Oklahoma','SU':'Shippensburg','UF':'Findlay','AU':'Ashland','FHSU':'Fort Hays State','MC':'Mercyhurst College','KU':'Kutztown','SIUE':'SIU Edwardsville','MESA':'Mesa State University','MSUMO':'Minnesota State Moorhead','NMHU':'New Mexico Highlands','LC':'Limestone College','MARY':'Mary','GCU':'Grand Canyon','SMSU':'Southwest State'}
W = {}
W['125'] = ("""
Joseph Mavins|UNCP|32-4
Eddie Lopez|WSC|16-8
Robert Nahlik|TSU|26-9
Nick Smith|MSUMA|20-5
Arsenia Barksdale|ASC|25-8
Christopher Neidermeier|BAC|25-10
Tyler Mumbulo|UIU|29-5
Caleb Hulse|UCM|11-7
Cody Zimmerman|UWP|29-13
Chas Welch|NSU|6-2
Matthew Oliver|NC|29-11
Devlon Webb|CSC|17-12
Cody Garcia|UNO|15-1
Kody Pierson|CNC|29-12
Curtis Schurkamp|SFSU|18-12
Lucas Huffman|WLSC|33-3""", """
r1 Lopez > Mavins | D;11-6
r1 Smith > Nahlik | D;7-4
r1 Barksdale > Neidermeier | D;3-1
r1 Mumbulo > Hulse | M;8-0
r1 Welch > Zimmerman | D;7-3
r1 Webb > Oliver | D;7-5
r1 Garcia > Pierson | F;1:09
r1 Schurkamp > Huffman | D;7-4
qf Smith > Lopez | D;12-6
qf Mumbulo > Barksdale | D;8-6
qf Webb > Welch | D;8-6
qf Garcia > Schurkamp | F;1:40
sf Smith > Mumbulo | D;12-9
sf Garcia > Webb | F;2:04
f Garcia > Smith | D;8-2
c1 Mavins > Nahlik | D;10-4
c1 Neidermeier > Hulse | D;3-2
c1 Zimmerman > Oliver | D;12-7
c1 Huffman > Pierson | D;4-3
c2 Schurkamp > Mavins | D;7-3
c2 Welch > Neidermeier | D;4-3
c2 Barksdale > Zimmerman | D;16-10
c2 Lopez > Huffman | D;9-7;SV1
cqf Schurkamp > Welch | D;7-2
cqf Barksdale > Lopez | D;10-4
csf Schurkamp > Mumbulo | D;9-6
csf Barksdale > Webb | D;4-1
3rd Schurkamp > Barksdale | D;9-8
5th Webb > Mumbulo | D;11-5
7th Lopez > Welch | D;5-0""")
W['133'] = ("""
Brandon Reasy|UPJ|32-5
Kent Pierson|CNC|37-11
Josh Williams|SCSU|19-7
Raymond Dunning|ASC|25-6
Shane Perkey|UINDY|35-5
Corey Bowers|GU|24-6
Jesse Cruz|WSC|21-6
Jason Jeremiason|AC|21-15
John Putman|MSUMA|18-10
Jimmy Savala|CSC|6-3
Andrew Young|NC|11-5
Craig DeGreef|UWP|22-7
Brett Allgood|UNK|3-1
Mario Morgan|UNO|26-16
Tim Elliott|UCO|19-3
Matt Mossor|WLSC|18-6""", """
r1 Reasy > Pierson | D;5-1
r1 Dunning > Williams | F;4:28
r1 Perkey > Bowers | D;11-7
r1 Cruz > Jeremiason | F;2:48
r1 Putman > Savala | T1.5;18-3;7:00
r1 Young > DeGreef | D;4-2;SV1
r1 Allgood > Morgan | D;12-6
r1 Elliott > Mossor | F;4:05
qf Reasy > Dunning | F;6:22
qf Perkey > Cruz | D;6-4
qf Putman > Young | D;3-2
qf Allgood > Elliott | D;9-5
sf Perkey > Reasy | M;11-3
sf Allgood > Putman | D;3-1
f Allgood > Perkey | D;5-3
c1 Williams > Pierson | D;4-3
c1 Jeremiason > Bowers | F;4:11
c1 DeGreef > Savala | D;15-10
c1 Morgan > Mossor | D;7-4
c2 Elliott > Williams | D;11-6
c2 Young > Jeremiason | D;5-2
c2 DeGreef > Cruz | D;13-8
c2 Dunning > Morgan | D;9-5
cqf Elliott > Young | M;16-2
cqf Dunning > DeGreef | F;3:55
csf Reasy > Elliott | F;1:09
csf Dunning > Putman | D;7-6
3rd Dunning > Reasy | F;4:01
5th Elliott > Putman | M;9-0
7th Young > DeGreef | D;5-3""")
W['141'] = ("""
Steven Fittery|SU|21-4
Jay Sherer|AC|24-12
Josh Hensley|ASC|23-11
Joshua Falk|UF|20-18
Travis Elg|MSUMA|20-4
Shane Valko|UPJ|25-13
Kyle Kanaga|AU|15-13
Kyle Francis|WSC|18-13
Jeff Rutledge|UNK|35-12
Cory Bloodgood|UCM|26-17
Tony Washington|NC|20-6
Yasiim Bribieseca|UNO|26-11
Kyle Evans|UCO|28-2
James Annon|FHSU|21-9
Gabriel Suarez|SCSU|32-4
Doug Surra|WLSC|28-4""", """
r1 Fittery > Sherer | F;1:55
r1 Hensley > Falk | D;7-4
r1 Valko > Elg | D;7-6
r1 Francis > Kanaga | F;6:20
r1 Rutledge > Bloodgood | D;8-3
r1 Bribieseca > Washington | D;5-3;SV1
r1 Evans > Annon | D;4-0
r1 Surra > Suarez | F;2:56
qf Fittery > Hensley | F;3:44
qf Valko > Francis | F;0:30
qf Rutledge > Bribieseca | D;2-1
qf Evans > Surra | D;1-0
sf Fittery > Valko | D;6-1
sf Evans > Rutledge | D;4-1
f Evans > Fittery | D;3-2
c1 Falk > Sherer | D;6-4;SV1
c1 Elg > Kanaga | F;6:09
c1 Washington > Bloodgood | M;16-3
c1 Annon > Suarez | D;9-5
c2 Surra > Falk | D;8-3
c2 Elg > Bribieseca | F;3:48
c2 Francis > Washington | D;6-5
c2 Annon > Hensley | D;15-14
cqf Elg > Surra | M;16-5
cqf Annon > Francis | M;12-3
csf Valko > Elg | D;3-1
csf Rutledge > Annon | D;10-3
3rd Rutledge > Valko | D;4-3
5th Annon > Elg | D;6-4
7th Surra > Francis | F;4:58""")
W['149'] = ("""
Brian Pogel|MC|33-7
Joshua Nolan|SFSU|15-17
Colby Robinson|UCO|24-12
Monterrious Adams|UIU|15-4
Camille DuPont|WSC|22-11
Kayne Melko|WLSC|20-11
Tommy Abbott|MSUMA|21-3
Chad Woods|UINDY|40-18
Marcus Gordon|AU|22-9
Mike Long|AC|14-8
Latra Collick|NC|24-9
Joseph Deaguero|ASC|21-9
Todd Meneely|UNO|15-2
Sean Dong|UF|5-4
Ryan Etherton|UNK|34-14
Zack McKendree|GU|21-11""", """
r1 Nolan > Pogel | D;10-8
r1 Robinson > Adams | D;9-4
r1 DuPont > Melko | D;2-0
r1 Abbott > Woods | D;7-2
r1 Long > Gordon | D;5-4
r1 Deaguero > Collick | M;8-0
r1 Meneely > Dong | F;1:21
r1 Etherton > McKendree | D;3-0
qf Robinson > Nolan | F;4:34
qf DuPont > Abbott | M;16-4
qf Deaguero > Long | F;1:36
qf Meneely > Etherton | D;6-1
sf DuPont > Robinson | F;2:59
sf Meneely > Deaguero | D;9-6
f Meneely > DuPont | D;9-3
c1 Pogel > Adams | D;5-2
c1 Melko > Woods | D;11-9
c1 Collick > Gordon | F;0:46
c1 McKendree > Dong | D;7-2
c2 Etherton > Pogel | M;10-1
c2 Long > Melko | D;8-4
c2 Abbott > Collick | D;5-4
c2 McKendree > Nolan | T1.5;21-4;4:54
cqf Etherton > Long | F;0:25
cqf Abbott > McKendree | D;5-4
csf Etherton > Robinson | F;4:12
csf Deaguero > Abbott | F;0:52
3rd Etherton > Deaguero | D;4-2
5th Abbott > Robinson | D;6-1
7th McKendree > Long | D;8-3""")
W['157'] = ("""
Andy Lamancusa|MC|20-14
Eric Pretto|SIUE|20-15
Travis Eggers|UIU|27-8
Neil Samples|WSC|19-9
Antonio Guerra|UF|32-9
David Zeek|KU|23-12
Noomis Jones|ASC|22-10
John Sundgren|SCSU|22-7
Jason Rhoten|MSUMA|37-2
Danny Grater|FHSU|21-10
Phil Bliss|BAC|15-6
Vince Bertucci|UCM|22-13
Joe Ellenberger|UNK|35-6
Henry Wahle|UNO|17-13
Muhammad Abdur-Rahman|AU|25-7
Daniel Nauman|SU|23-10""", """
r1 Lamancusa > Pretto | D;5-2
r1 Eggers > Samples | D;7-4
r1 Guerra > Zeek | M;11-1
r1 Jones > Sundgren | M;12-2
r1 Rhoten > Grater | F;4:37
r1 Bliss > Bertucci | D;9-4
r1 Wahle > Ellenberger | D;5-3
r1 Abdur-Rahman > Nauman | D;5-3;SV1
qf Eggers > Lamancusa | M;15-1
qf Guerra > Jones | D;3-2
qf Rhoten > Bliss | F;4:10
qf Abdur-Rahman > Wahle | D;6-4;SV1
sf Guerra > Eggers | D;4-1
sf Rhoten > Abdur-Rahman | D;6-2
f Rhoten > Guerra | D;3-2
c1 Samples > Pretto | D;3-2
c1 Sundgren > Zeek | D;10-9
c1 Grater > Bertucci | D;4-2;SV1
c1 Ellenberger > Nauman | D;10-3
c2 Samples > Wahle | D;3-1
c2 Sundgren > Bliss | F;0:21
c2 Jones > Grater | D;3-2
c2 Ellenberger > Lamancusa | M;11-3
cqf Samples > Sundgren | D;3-2
cqf Ellenberger > Jones | D;8-3
csf Eggers > Samples | D;4-1
csf Ellenberger > Abdur-Rahman | D;10-8;SV1
3rd Ellenberger > Eggers | D;2-1;TB1
5th Samples > Abdur-Rahman | M;8-0
7th Jones > Sundgren | M;15-2""")
W['165'] = ("""
Kyle Keane|UPJ|35-6
Thomas Anderson|SCSU|27-17
Brett Hunter|CSC|31-4
Justin Shannon|UF|21-21
Andy Pickar|MSUMA|19-3
Jacob Wilson|SU|13-12
Blake Peterson|TSU|21-8
Keenan McCurdy|UNK|29-17
Zachary Lee|WSC|21-4
Jesse Sheets|UCM|16-14
J.J. Davis|UNCP|31-5
Mitch Norton|UIU|19-7
Kyle Becker|UWP|36-4
Cole Johnson|MESA|10-11
Aaron Denson|UNO|30-5
Hudson Harrison|MC|31-8""", """
r1 Keane > Anderson | D;6-0
r1 Hunter > Shannon | D;4-3
r1 Pickar > Wilson | F;6:00
r1 Peterson > McCurdy | F;5:31
r1 Lee > Sheets | T1.5;16-0;6:11
r1 Davis > Norton | D;7-5
r1 Becker > Johnson | D;6-3
r1 Harrison > Denson | D;13-6
qf Keane > Hunter | D;8-4
qf Pickar > Peterson | M;9-1
qf Davis > Lee | D;10-4
qf Harrison > Becker | D;6-4
sf Pickar > Keane | D;8-3
sf Harrison > Davis | F;4:53
f Pickar > Harrison | D;8-2
c1 Shannon > Anderson | D;3-1
c1 McCurdy > Wilson | D;9-2
c1 Norton > Sheets | F;1:47
c1 Denson > Johnson | D;11-4
c2 Becker > Shannon | D;4-2
c2 McCurdy > Lee | D;5-2
c2 Peterson > Norton | D;10-6
c2 Denson > Hunter | M;10-0
cqf Becker > McCurdy | D;10-4
cqf Peterson > Denson | D;11-4
csf Keane > Becker | F;2:55
csf Peterson > Davis | F;1:08
3rd Peterson > Keane | D;10-6
5th Becker > Davis | F;6:27
7th Denson > McCurdy | D;3-0""")
W['174'] = ("""
Albert Miles|UPJ|34-7
Jesse Feinsod|NMHU|29-14
Jeffery Havelka|UF|11-23
Tim Matheson|MSUMA|20-8
Kamarudeen Usman|UNK|22-7
Chris Gibbs|WLSC|19-7
Tyler Tubbs|MSUMO|20-4
Travis Barbarick|UCM|22-16
Corey Van Groll|UWP|32-8
Derek Skala|SCSU|29-9
Josh Shields|MC|20-8
Blake Malloy|FHSU|24-8
Ross Taplin|UNO|26-5
Justin Ferguson|AU|17-6
Evan Copeland|ASC|24-10
Bryant Blanton|NC|25-11""", """
r1 Miles > Feinsod | D;3-1
r1 Matheson > Havelka | M;11-2
r1 Usman > Gibbs | M;10-0
r1 Tubbs > Barbarick | D;7-5
r1 Van Groll > Skala | D;5-2
r1 Shields > Malloy | D;6-5;TB1
r1 Taplin > Ferguson | D;4-2
r1 Blanton > Copeland | F;DEF
qf Miles > Matheson | D;3-2
qf Usman > Tubbs | D;7-5;SV1
qf Shields > Van Groll | D;4-2;TB1
qf Taplin > Blanton | D;5-3
sf Miles > Usman | D;6-2
sf Taplin > Shields | D;5-3
f Miles > Taplin | D;5-2
c1 Feinsod > Havelka | D;9-2
c1 Gibbs > Barbarick | D;3-1
c1 Skala > Malloy | D;4-3
c1 Ferguson > Copeland | D;8-4
c2 Feinsod > Blanton | M;11-3
c2 Gibbs > Van Groll | D;5-1
c2 Tubbs > Skala | D;8-4
c2 Ferguson > Matheson | D;6-4;SV1
cqf Gibbs > Feinsod | D;6-4
cqf Ferguson > Tubbs | D;9-6
csf Usman > Gibbs | D;4-1
csf Shields > Ferguson | D;5-4
3rd Usman > Shields | D;3-2
5th Ferguson > Gibbs | D;7-4
7th Tubbs > Feinsod | D;6-5""")
W['184'] = ("""
Daniel Scanlan|LC|36-2
Lucas Haag|UWP|29-17
Cale Cornemann|NSU|12-8
Lars Lueders|WSC|18-3
Heath Jolley|UCO|26-14
Pino Scavella|GU|29-14
Paul Sutton|UNK|27-13
Tyler Johnson|SMSU|30-17
Brad Padgett|SCSU|31-6
Alecxis Lara|SFSU|8-12
Mike Corcetti|UPJ|32-8
Jeremy Hudson|UCM|28-15
Jared Deaguero|ASC|30-5
Beau Severtson|AC|28-13
Hiram Smith|UF|24-15
Keeno Griffin|NC|23-9""", """
r1 Scanlan > Haag | M;13-0
r1 Lueders > Cornemann | M;17-4
r1 Jolley > Scavella | D;6-1
r1 Sutton > Johnson | M;11-3
r1 Padgett > Lara | M;10-0
r1 Corcetti > Hudson | M;10-1
r1 Deaguero > Severtson | D;4-2
r1 Griffin > Smith | D;6-4
qf Scanlan > Lueders | D;3-1
qf Jolley > Sutton | D;8-6
qf Corcetti > Padgett | D;5-1
qf Deaguero > Griffin | D;3-1
sf Scanlan > Jolley | D;10-4
sf Corcetti > Deaguero | D;11-4
f Scanlan > Corcetti | D;5-2
c1 Haag > Cornemann | D;5-0
c1 Scavella > Johnson | M;13-3
c1 Hudson > Lara | D;11-6
c1 Smith > Severtson | D;9-5
c2 Griffin > Haag | M;13-2
c2 Padgett > Scavella | D;5-4
c2 Hudson > Sutton | D;5-3
c2 Smith > Lueders | D;8-4
cqf Padgett > Griffin | D;10-4
cqf Smith > Hudson | D;3-1;TB1
csf Padgett > Jolley | D;8-5
csf Deaguero > Smith | M;9-0
3rd Deaguero > Padgett | D;4-3
5th Smith > Jolley | M;15-6
7th Griffin > Hudson | M;11-1""")
W['197'] = ("""
Kelly Anundson|NC|32-8
Jacob Marrs|UNO|28-4
Donovan McMahill|WSC|28-4
Kevin Domian|UCM|7-6
Tyler Copsey|AC|28-5
Mitch Knapp|WLSC|21-11
Jarrett Edison|UCO|29-13
Derek Ross|UNK|20-16
Josh Majerus|CSC|33-3
Nick Peppler|UINDY|11-14
Patrick Walsh|UPJ|37-12
Nicolas Wilkes|SCSU|24-5
Josh Ohl|AU|26-2
Tyler Gonzales|FHSU|19-10
Matt Norton|UIU|14-13
Trevor Gallo|MC|24-14""", """
r1 Marrs > Anundson | T1.5;16-0;2:47
r1 McMahill > Domian | T1.5;19-2;6:32
r1 Copsey > Knapp | D;7-4
r1 Ross > Edison | D;7-5
r1 Majerus > Peppler | M;10-2
r1 Wilkes > Walsh | D;2-1
r1 Ohl > Gonzales | M;12-3
r1 Gallo > Norton | D;11-10
qf McMahill > Marrs | M;14-6
qf Copsey > Ross | D;6-5;TB2
qf Majerus > Wilkes | D;6-0
qf Ohl > Gallo | F;4:34
sf McMahill > Copsey | D;5-4
sf Majerus > Ohl | M;11-2
f Majerus > McMahill | D;8-3
c1 Anundson > Domian | F;1:44
c1 Knapp > Edison | D;12-8
c1 Walsh > Peppler | M;16-3
c1 Norton > Gonzales | D;11-9;SV1
c2 Anundson > Gallo | D;13-7
c2 Wilkes > Knapp | D;5-3
c2 Ross > Walsh | D;9-4
c2 Marrs > Norton | F;1:15
cqf Wilkes > Anundson | D;9-8
cqf Marrs > Ross | M;10-1
csf Copsey > Wilkes | RT;3-3;TB2
csf Marrs > Ohl | F;4:21
3rd Marrs > Copsey | D;4-2
5th Ohl > Wilkes | D;6-4
7th Anundson > Ross | D;6-3""")
W['285'] = ("""
Cy Wainwright|NC|36-3
Jesse Boggs|NMHU|26-14
Lynn Panko|UINDY|31-11
Jesse Laber|MARY|15-11
Tervel Dlagnev|UNK|34-0
Niall McGrath|GU|22-9
Dan Goodson|UIU|22-8
Cody Beck|UCM|17-7
Dustin Finn|UCO|26-5
Anthony Lewis|UNO|19-9
Zach Majocha|UPJ|16-8
Jed Jobe|GCU|7-6
Brady Wilson|MSUMA|33-4
Thomas Minwell|CNC|15-15
Steve Franklin|SFSU|22-12
William Moss|LC|32-6""", """
r1 Wainwright > Boggs | M;12-2
r1 Laber > Panko | D;6-1
r1 Dlagnev > McGrath | F;4:21
r1 Goodson > Beck | D;5-4;TB2
r1 Finn > Lewis | D;3-1
r1 Majocha > Jobe | D;6-4
r1 Wilson > Minwell | T1.5;17-0;4:13
r1 Moss > Franklin | D;3-1
qf Wainwright > Laber | D;6-1
qf Dlagnev > Goodson | T1.5;21-5;6:15
qf Finn > Majocha | D;3-1;SV1
qf Wilson > Moss | F;0:26
sf Dlagnev > Wainwright | D;9-5
sf Finn > Wilson | D;4-3;TB1
f Dlagnev > Finn | D;4-1
c1 Panko > Boggs | D;5-3
c1 Beck > McGrath | D;10-5
c1 Lewis > Jobe | D;5-3
c1 Franklin > Minwell | M;13-2
c2 Moss > Panko | D;3-2
c2 Majocha > Beck | D;3-2
c2 Lewis > Goodson | D;5-3
c2 Laber > Franklin | F;1:53
cqf Majocha > Moss | D;3-1;SV1
cqf Laber > Lewis | D;3-2
csf Wainwright > Majocha | D;3-2
csf Wilson > Laber | D;3-1
3rd Wainwright > Wilson | D;4-3
5th Laber > Majocha | F;2:46
7th Lewis > Moss | D;2-1""")
