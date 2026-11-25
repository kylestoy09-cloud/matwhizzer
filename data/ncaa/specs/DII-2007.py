HEADER = "# NCAA Division II Championships 2007 — source: 2007.pdf (scan; typed from the bracket pages, 2026-11-18; the 149 page is printed upside down). \"2007 (1).pdf\" is the same file."
CODES = {'MC':'Mercyhurst','UCO':'Central Oklahoma','UIU':'Upper Iowa','CSC':'Chadron State','INDY':'Indianapolis','UNCP':'UNC Pembroke','ASC':'Adams State','AUG':'Augustana SD','MSUMA':'Minnesota State Mankato','WSC':'Western State College','BAC':'Belmont Abbey','CNC':'Carson-Newman','UNK':'Nebraska-Kearney','NSU':'Northern State','UWP':'Wisconsin-Parkside','UPJ':'Pitt-Johnstown','KU':'Kutztown','MSUMO':'Minnesota State Moorhead','WLSC':'West Liberty State','CSM':'Colorado School of Mines','UNO':'Nebraska-Omaha','UF':'Findlay','FHSU':'Fort Hays State','NEW':'Newberry','SHIP':'Shippensburg','ASH':'Ashland','NMHU':'New Mexico Highlands','UCM':'Central Missouri','SFSU':'San Francisco State','GU':'Gannon','SIUE':'SIU Edwardsville','TSU':'Truman State','LC':'Limestone','SCSU':'St. Cloud State'}
W = {}
W['125'] = ("""
Payne Lint|MC|18-15
Tyler Zukerman|UCO|15-9
Tyler Mumbulo|UIU|18-5
Devlon Webb|CSC|26-15
John Fleming|INDY|34-10
Adam Dedmon|UNCP|13-18
Arsenia Barksdale|ASC|21-5
Chris Trampe|AUG|24-9
Nick Smith|MSUMA|15-8
Eddie Lopez|WSC|20-11
Chris Neidermeier|BAC|24-5
Kody Pierson|CNC|36-10
Trevor Charbonneau|UNK|25-8
Chas Welch|NSU|19-3
Brandon Kircher|UWP|14-16
Derrek Bosso|UPJ|24-9""", """
r1 Zukerman > Lint | F;6:10
r1 Mumbulo > Webb | D;6-4
r1 Fleming > Dedmon | M;11-0
r1 Barksdale > Trampe | D;4-2
r1 Smith > Lopez | D;5-3;SV1
r1 Neidermeier > Pierson | D;7-3
r1 Charbonneau > Welch | D;7-4
r1 Bosso > Kircher | D;6-5
qf Zukerman > Mumbulo | D;5-1
qf Barksdale > Fleming | D;5-3
qf Neidermeier > Smith | F;6:17
qf Charbonneau > Bosso | D;6-3
sf Zukerman > Barksdale | M;10-2
sf Charbonneau > Neidermeier | D;3-1;SV1
f Charbonneau > Zukerman | D;5-2
c1 Webb > Lint | D;7-3
c1 Trampe > Dedmon | M;13-4
c1 Lopez > Pierson | D;5-2
c1 Welch > Kircher | D;5-4;TB1
c2 Bosso > Webb | D;7-4
c2 Trampe > Smith | D;8-1
c2 Lopez > Fleming | D;8-3
c2 Mumbulo > Welch | D;6-0
cqf Bosso > Trampe | D;3-2
cqf Lopez > Mumbulo | D;8-6
csf Barksdale > Bosso | D;3-1;SV1
csf Lopez > Neidermeier | F;5:40
3rd Barksdale > Lopez | D;9-5
5th Neidermeier > Bosso | D;3-1;SV2
7th Trampe > Mumbulo | M;12-4""")
W['133'] = ("""
Joe Kemmerer|KU|28-3
Troy Macfarland|MSUMO|15-16
Marques Bravo|WSC|24-13
Craig DeGreef|UWP|27-13
Jeff Pfaffinger|MSUMA|31-9
Matt Mossor|WLSC|26-11
Shane Perkey|INDY|25-7
William Eller|CSM|16-11
Brett Allgood|UNK|25-5
Jared Henning|UCO|28-7
Brandon Reasy|UPJ|29-10
Jeff Rau|UNO|18-17
Andy Uhl|UF|26-5
Derek Patterson|FHSU|19-11
Nathan Naumann|UIU|14-9
Andrew Young|NEW|9-3""", """
r1 Kemmerer > Macfarland | M;11-0
r1 DeGreef > Bravo | F;5:18
r1 Mossor > Pfaffinger | D;7-3
r1 Perkey > Eller | M;13-4
r1 Henning > Allgood | D;7-5;SV1
r1 Reasy > Rau | D;5-4;TB1
r1 Uhl > Patterson | D;5-2
r1 Naumann > Young | D;1-0
qf Kemmerer > DeGreef | D;8-2
qf Perkey > Mossor | D;9-5
qf Henning > Reasy | D;8-5
qf Uhl > Naumann | D;9-4
sf Kemmerer > Perkey | D;3-0
sf Henning > Uhl | D;6-4
f Kemmerer > Henning | D;1-0
c1 Bravo > Macfarland | D;11-4
c1 Pfaffinger > Eller | M;13-3
c1 Allgood > Rau | M;14-6
c1 Patterson > Young | D;3-2
c2 Bravo > Naumann | D;6-2
c2 Reasy > Pfaffinger | D;4-3;TB1
c2 Allgood > Mossor | M;11-3
c2 Patterson > DeGreef | F;3:26
cqf Reasy > Bravo | D;5-4;TB4
cqf Allgood > Patterson | D;12-8
csf Perkey > Reasy | D;3-2
csf Allgood > Uhl | D;3-2
3rd Allgood > Perkey | T1.5;17-2;7:00
5th Reasy > Uhl | D;3-2;TB1
7th Bravo > Patterson | D;4-0""")
W['141'] = ("""
Steven Fittery|SHIP|25-3
Jeff Rutledge|UNK|23-15
Anthony Iovine|ASH|11-6
Yasiim Bribieseca|UNO|24-11
Kenneth Montour|NMHU|18-8
Shane Valko|UPJ|29-12
John Gamble|UIU|19-8
Craig Becker|UWP|30-8
Kyle Evans|UCO|35-0
Kelly Janke|MSUMO|15-18
JJ Zanetta|MC|28-6
Joseph Deaguero|ASC|30-14
Travis Elg|MSUMA|24-6
Matt Irwin|INDY|14-14
James Annon|FHSU|16-10
Doug Surra|WLSC|26-11""", """
r1 Fittery > Rutledge | D;9-3
r1 Bribieseca > Iovine | D;6-3
r1 Valko > Montour | D;5-2
r1 Gamble > Becker | T1.5;16-1;7:00
r1 Evans > Janke | M;9-1
r1 Zanetta > Deaguero | D;10-8
r1 Elg > Irwin | M;12-3
r1 Surra > Annon | D;6-0
qf Fittery > Bribieseca | D;4-0
qf Gamble > Valko | F;3:53
qf Evans > Zanetta | M;13-0
qf Surra > Elg | F;0:49
sf Fittery > Gamble | D;6-1
sf Evans > Surra | D;4-2;SV1
f Evans > Fittery | D;7-0
c1 Rutledge > Iovine | F;7:00
c1 Montour > Becker | D;11-6
c1 Deaguero > Janke | D;5-2
c1 Irwin > Annon | D;6-5
c2 Rutledge > Elg | D;11-5
c2 Zanetta > Montour | D;8-6
c2 Deaguero > Valko | D;5-3
c2 Bribieseca > Irwin | F;FOR
cqf Rutledge > Zanetta | F;2:45
cqf Deaguero > Bribieseca | F;DEF
csf Gamble > Rutledge | D;14-10;SV1
csf Surra > Deaguero | D;10-6
3rd Gamble > Surra | D;8-7
5th Rutledge > Deaguero | D;8-3
7th Zanetta > Bribieseca | F;M FOR""")
W['149'] = ("""
Don Cummings|MC|19-5
Mark Carey|UCM|18-15
Todd Meneely|UNO|31-3
Matt True|UNK|21-9
Shea Timothy|UCO|20-7
Chris Chambers|KU|20-12
Camille DuPont|WSC|22-11
Monterrious Adams|UIU|11-6
Jason Rhoten|MSUMA|30-8
Mikel Delk|FHSU|16-6
Latra Collick|NEW|12-10
Charlie Pingleton|INDY|31-7
Mark Pfeifer|CSC|30-10
Shane Walton|MSUMO|16-14
Mike Rogers|CNC|9-2
Willie Hilton|UNCP|31-7""", """
r1 Cummings > Carey | D;14-7
r1 Meneely > True | D;5-3;SV1
r1 Timothy > Chambers | M;9-0
r1 DuPont > Adams | D;11-5
r1 Rhoten > Delk | D;4-1
r1 Pingleton > Collick | D;9-5
r1 Pfeifer > Walton | D;9-2
r1 Rogers > Hilton | F;3:21
qf Meneely > Cummings | M;15-4
qf Timothy > DuPont | D;7-0
qf Rhoten > Pingleton | F;6:00
qf Rogers > Pfeifer | F;2:33
sf Meneely > Timothy | D;8-2
sf Rogers > Rhoten | F;5:26
f Meneely > Rogers | D;3-2
c1 True > Carey | D;5-3;SV1
c1 Chambers > Adams | M;14-3
c1 Delk > Collick | D;2-1
c1 Hilton > Walton | D;5-1
c2 Pfeifer > True | D;3-1
c2 Pingleton > Chambers | D;12-8
c2 Delk > DuPont | D;5-4
c2 Hilton > Cummings | D;3-2
cqf Pfeifer > Pingleton | D;10-4
cqf Delk > Hilton | F;2:59
csf Timothy > Pfeifer | D;5-4
csf Rhoten > Delk | D;6-4
3rd Rhoten > Timothy | M;11-1
5th Pfeifer > Delk | D;14-8
7th Pingleton > Hilton | M;13-4""")
W['157'] = ("""
Andrew Lamancusa|MC|19-6
Kyle Trout|MSUMO|32-8
Kenneth Packard|SFSU|13-11
Jason Leavitt|UCO|30-7
Brandon Girtz|MSUMA|35-7
Jacob Wilson|SHIP|15-14
Bradley Becker|UWP|12-6
Danny Grater|FHSU|25-10
Joe Ellenberger|UNK|39-9
Michael Horton|INDY|29-11
Zack McKendree|GU|20-5
Austin Scarset|AUG|18-4
Antonio Guerra|UF|27-4
Michael Gallegos|ASC|20-7
Travis Eggers|UIU|19-8
Joe Strittmatter|UPJ|25-13""", """
r1 Lamancusa > Trout | D;6-5
r1 Leavitt > Packard | M;11-3
r1 Girtz > Wilson | M;17-5
r1 Becker > Grater | F;5:39
r1 Ellenberger > Horton | D;9-2
r1 Scarset > McKendree | D;6-0
r1 Guerra > Gallegos | D;6-3
r1 Eggers > Strittmatter | F;6:50
qf Leavitt > Lamancusa | D;8-3
qf Becker > Girtz | D;8-7;TB1
qf Ellenberger > Scarset | D;6-2
qf Guerra > Eggers | D;3-1
sf Leavitt > Becker | D;4-3
sf Guerra > Ellenberger | D;6-5
f Guerra > Leavitt | D;2-1;TB1
c1 Trout > Packard | D;3-2
c1 Grater > Wilson | M;13-5
c1 Horton > McKendree | D;8-7
c1 Gallegos > Strittmatter | D;10-7
c2 Trout > Eggers | D;8-1
c2 Scarset > Grater | D;7-3
c2 Girtz > Horton | D;5-3
c2 Lamancusa > Gallegos | M;15-6
cqf Scarset > Trout | D;5-2
cqf Lamancusa > Girtz | D;11-9;TB1
csf Scarset > Becker | D;7-2
csf Ellenberger > Lamancusa | D;8-7
3rd Ellenberger > Scarset | M;14-6
5th Becker > Lamancusa | F;2:39
7th Girtz > Trout | D;10-8""")
W['165'] = ("""
Kevin Kalbach|KU|16-1
Evan Copeland|ASC|26-11
Eric Lakia|ASH|22-4
Mitch Norton|UIU|20-6
Brett Hunter|CSC|31-7
Hudson Harrison|MC|18-13
Nathan Baker|MSUMO|17-5
Blake Peterson|TSU|24-15
Justin Wood|UCO|30-7
Ross Taplin|UNO|32-11
Phil Bliss|BAC|23-6
Zachary Lee|WSC|28-5
Andy Pickar|MSUMA|20-1
John Ficht|SIUE|19-15
Taylor May|UNK|15-16
J.J. Davis|UNCP|25-5""", """
r1 Copeland > Kalbach | D;9-5
r1 Lakia > Norton | D;7-5
r1 Hunter > Harrison | M;12-3
r1 Baker > Peterson | D;8-5
r1 Taplin > Wood | D;2-1
r1 Lee > Bliss | D;5-0
r1 Pickar > Ficht | D;5-3
r1 May > Davis | D;5-2
qf Lakia > Copeland | D;12-5
qf Hunter > Baker | D;4-2
qf Lee > Taplin | D;5-0
qf Pickar > May | D;3-2
sf Hunter > Lakia | D;6-4
sf Pickar > Lee | D;2-1
f Hunter > Pickar | F;2:37
c1 Norton > Kalbach | D;7-4
c1 Peterson > Harrison | M;16-2
c1 Wood > Bliss | F;0:36
c1 Ficht > Davis | M;8-0
c2 May > Norton | M;15-5
c2 Peterson > Taplin | D;11-4
c2 Baker > Wood | F;4:26
c2 Copeland > Ficht | D;6-4
cqf Peterson > May | F;6:53
cqf Baker > Copeland | F;3:41
csf Lakia > Peterson | F;5:48
csf Baker > Lee | D;3-2
3rd Baker > Lakia | D;5-3
5th Peterson > Lee | D;3-0
7th Copeland > May | D;12-8""")
W['174'] = ("""
Tommy Clark|WLSC|41-6
Daniel Morrison|UCO|17-14
Cody Henriksen|AUG|20-6
William Simmons|SFSU|6-8
Michael Jackson|INDY|29-6
Quinn Tolbert|NEW|22-10
James Reynolds|ASC|22-13
Tyler Tubbs|MSUMO|17-5
Jeremiah Naig|UNO|38-7
Matt Weingart|CSC|22-18
Zach Schafer|MC|26-7
Albert Morgan|UWP|20-10
Larry Wilbanks|WSC|24-9
Tim Matheson|MSUMA|26-17
Justin Ferguson|ASH|11-7
Eli Garshnick|UPJ|15-9""", """
r1 Morrison > Clark | D;4-2
r1 Henriksen > Simmons | D;7-2
r1 Jackson > Tolbert | F;2:09
r1 Reynolds > Tubbs | D;7-4
r1 Naig > Weingart | M;14-1
r1 Schafer > Morgan | D;3-1;SV1
r1 Wilbanks > Matheson | M;14-5
r1 Garshnick > Ferguson | D;5-2
qf Henriksen > Morrison | D;3-2
qf Jackson > Reynolds | D;12-8
qf Naig > Schafer | D;7-2
qf Wilbanks > Garshnick | D;9-3
sf Jackson > Henriksen | D;12-9
sf Naig > Wilbanks | D;7-5
f Naig > Jackson | M;13-1
c1 Clark > Simmons | D;6-1
c1 Tolbert > Tubbs | D;7-4
c1 Weingart > Morgan | D;8-2
c1 Ferguson > Matheson | F;0:55
c2 Garshnick > Clark | D;5-4
c2 Schafer > Tolbert | D;5-3;TB1
c2 Weingart > Reynolds | D;3-1;SV1
c2 Ferguson > Morrison | D;7-5
cqf Garshnick > Schafer | D;5-1
cqf Weingart > Ferguson | D;4-1
csf Henriksen > Garshnick | D;12-5
csf Wilbanks > Weingart | D;8-3
3rd Henriksen > Wilbanks | F;2:39
5th Garshnick > Weingart | F;0:55
7th Schafer > Ferguson | D;6-2""")
W['184'] = ("""
Mark Murphy|SHIP|13-6
Nicolas Wilkes|SCSU|18-6
Matt Farrell|UNK|29-4
Matt Allen|ASH|12-8
Austin Boehm|UNO|25-12
Pino Scavella|GU|24-17
Nathan Jones|CNC|42-6
Charlie Pipher|WSC|26-10
Jared Deaguero|ASC|14-5
Jeremy Hudson|UCM|26-16
Mike Corcetti|UPJ|31-1
Cale Cornemann|NSU|10-4
Jared Hess|UCO|27-4
Mike Howell|FHSU|12-10
Travis Krinkie|MSUMA|22-9
Keeno Griffin|NEW|24-12""", """
r1 Murphy > Wilkes | F;1:57
r1 Farrell > Allen | D;7-0
r1 Boehm > Scavella | F;1:39
r1 Pipher > Jones | D;7-4
r1 Deaguero > Hudson | T1.5;18-1;5:30
r1 Corcetti > Cornemann | F;6:34
r1 Hess > Howell | D;3-1
r1 Krinkie > Griffin | D;7-2
qf Murphy > Farrell | D;1-1;TB2
qf Boehm > Pipher | F;0:28
qf Deaguero > Corcetti | D;9-3
qf Hess > Krinkie | D;3-2
sf Boehm > Murphy | D;6-5
sf Deaguero > Hess | D;6-1
f Deaguero > Boehm | M;9-1
c1 Allen > Wilkes | D;8-5
c1 Scavella > Jones | F;3:40
c1 Hudson > Cornemann | D;5-3
c1 Howell > Griffin | D;8-2
c2 Krinkie > Allen | M;11-3
c2 Corcetti > Scavella | D;9-3
c2 Pipher > Hudson | F;1:27
c2 Farrell > Howell | F;2:54
cqf Corcetti > Krinkie | D;8-3
cqf Farrell > Pipher | D;12-5
csf Corcetti > Murphy | F;M FOR
csf Hess > Farrell | D;4-1
3rd Hess > Corcetti | D;3-2
5th Farrell > Murphy | F;M FOR
7th Krinkie > Pipher | M;12-3""")
W['197'] = ("""
Derek Brunson|UNCP|27-4
Josh Majerus|CSC|25-11
John Treml|UWP|26-14
Jacob Marrs|UNO|35-7
Casey Woodall|ASC|26-8
Kelly Anundson|NEW|24-10
Nate Buys|AUG|23-3
David Crowley|ASH|16-14
Heath Jolley|UCO|20-9
Ben Janike|MSUMA|23-10
Michael Fowler|UPJ|28-8
Tyler Gonzales|FHSU|18-11
Ryan Phillips|UIU|25-5
Andrejs Zalaiskalns|UF|18-23
Kelsey Empting|UNK|24-13
Chris Taylor|WLSC|14-5""", """
r1 Majerus > Brunson | F;3:20
r1 Treml > Marrs | F;2:13
r1 Woodall > Anundson | D;8-4
r1 Buys > Crowley | D;7-0
r1 Jolley > Janike | D;4-0
r1 Fowler > Gonzales | D;6-3
r1 Phillips > Zalaiskalns | M;15-4
r1 Taylor > Empting | D;4-3
qf Majerus > Treml | F;6:39
qf Buys > Woodall | D;8-2
qf Fowler > Jolley | D;4-2
qf Phillips > Taylor | M;11-0
sf Majerus > Buys | D;5-4
sf Phillips > Fowler | D;5-2
f Phillips > Majerus | M;12-0
c1 Brunson > Marrs | D;12-7
c1 Anundson > Crowley | F;4:41
c1 Gonzales > Janike | D;5-3
c1 Empting > Zalaiskalns | D;10-4
c2 Brunson > Taylor | D;6-2
c2 Jolley > Anundson | D;6-2
c2 Woodall > Gonzales | D;3-2
c2 Empting > Treml | D;7-3
cqf Jolley > Brunson | F;4:27
cqf Woodall > Empting | D;5-3
csf Buys > Jolley | F;5:14
csf Fowler > Woodall | D;5-2
3rd Buys > Fowler | M;8-0
5th Jolley > Woodall | D;3-2;TB1
7th Brunson > Empting | D;8-2""")
W['285'] = ("""
Jason Groller|SHIP|13-4
Loyde Braidlow|TSU|30-19
Dan Goodson|UIU|23-10
Lars Lueders|WSC|17-13
Josh Leadingfox|UCO|26-5
Cy Wainwright|NEW|23-10
Andrew Ubben|FHSU|21-7
Anthony Lewis|UNO|29-15
Brady Wilson|MSUMA|39-8
Shane Odell|CSC|15-16
Christopher Dempsey|UPJ|22-12
Travis Clark|UF|22-11
Tervel Dlagnev|UNK|44-1
Ray O'Connor|AUG|13-12
Jose Navarro|INDY|22-8
William Moss|LC|26-13""", """
r1 Groller > Braidlow | D;5-3
r1 Goodson > Lueders | D;4-0
r1 Leadingfox > Wainwright | D;8-4
r1 Ubben > Lewis | D;5-2
r1 Wilson > Odell | F;6:34
r1 Clark > Dempsey | D;11-6
r1 Dlagnev > O'Connor | M;16-6
r1 Navarro > Moss | D;6-3
qf Groller > Goodson | D;4-2;SV1
qf Leadingfox > Ubben | D;3-2
qf Wilson > Clark | F;3:36
qf Dlagnev > Navarro | F;3:58
sf Leadingfox > Groller | D;6-0
sf Dlagnev > Wilson | M;13-3
f Dlagnev > Leadingfox | F;3:16
c1 Lueders > Braidlow | D;6-4;SV1
c1 Wainwright > Lewis | D;4-2;SV1
c1 Dempsey > Odell | D;7-3
c1 Moss > O'Connor | D;6-2
c2 Navarro > Lueders | D;3-2
c2 Clark > Wainwright | D;5-3
c2 Ubben > Dempsey | M;11-3
c2 Goodson > Moss | D;1-0
cqf Clark > Navarro | D;6-5;TB2
cqf Ubben > Goodson | D;4-3
csf Clark > Groller | F;6:42
csf Ubben > Wilson | D;5-2
3rd Ubben > Clark | D;4-2
5th Wilson > Groller | M;9-1
7th Navarro > Goodson | D;3-2""")
