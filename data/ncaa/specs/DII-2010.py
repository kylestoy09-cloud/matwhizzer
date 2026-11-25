HEADER = "# NCAA Division II Championships 2010 — source: 2010.pdf (scan; typed from the bracket pages, 2026-11-18; colleges as the Bracket Results pages name them)"
CODES = {'SHU':'Seton Hill','AU':'Ashland','MSUMA':'Minnesota State Mankato','FHSU':'Fort Hays State','UWP':'Wisconsin-Parkside','UPJ':'Pittsburgh-Johnstown','NMHU':'New Mexico Highlands','AUGC':'Augustana - SD','UIU':'Upper Iowa','WSC':'Western State College','UNCP':'North Carolina-Pembroke','UNO':'Nebraska-Omaha','AS':'Adams State','MSUMO':'Minnesota State Moorhead','UI':'Indianapolis','NC':'Newberry','NSU':'Northern State','GCU':'Grand Canyon','NEW':'Newman','LC':'Limestone','UCO':'Central Oklahoma','CSC':'Chadron State','SFSU':'San Francisco State','UF':'Findlay','GU':'Gannon','SCSU':'St. Cloud State','UNK':'Nebraska-Kearney','SMSU':'Southwest Minnesota State','ESUP':'East Stroudsburg','UCM':'Central Missouri','WLU':'West Liberty State','MSC':'Mesa State College','CSUP':'CSU-Pueblo','MC':'Mercyhurst','AC':'Anderson University','BA':'Belmont Abbey','SUP':'Shippensburg','KUP':'Kutztown','MARY':'Mary'}
W = {}
W['125'] = ("""
Kenny Trumbetta|SHU|24-5
Brandon Davis|AU|19-10
Andy Forstner|MSUMA|21-10
Thomas Edgmon|FHSU|19-3
Cody Zimmerman|UWP|31-5
Ryan Link|UPJ|19-8
Seth Wright|NMHU|16-4
Alex Meger|AUGC|24-12
Tyler Mumbulo|UIU|21-5
Kyle O'Brien|WSC|18-21
Russell Weakley|UNCP|26-4
Terrell McKinney|UNO|29-11
Arsenia Barksdale|AS|19-5
Corey Ulmer|MSUMO|20-13
Alex Johns|UI|32-8
Matt Oliver|NC|27-6""", """
r1 Trumbetta > Davis | D;1-0
r1 Edgmon > Forstner | D;3-2
r1 Link > Zimmerman | D;5-3;SV1
r1 Wright > Meger | D;10-8
r1 Mumbulo > O'Brien | D;6-1
r1 McKinney > Weakley | D;5-2
r1 Barksdale > Ulmer | F;5:52
r1 Johns > Oliver | D;4-3
qf Edgmon > Trumbetta | D;3-1
qf Wright > Link | D;9-3
qf Mumbulo > McKinney | D;5-4
qf Barksdale > Johns | D;11-4
sf Wright > Edgmon | D;4-2
sf Mumbulo > Barksdale | D;9-4
f Wright > Mumbulo | M;17-4
c1 Forstner > Davis | M;14-6
c1 Meger > Zimmerman | D;3-1;SV1
c1 Weakley > O'Brien | D;7-3
c1 Ulmer > Oliver | D;5-4
c2 Forstner > Johns | D;7-2
c2 McKinney > Meger | M;15-6
c2 Weakley > Link | F;6:40
c2 Trumbetta > Ulmer | D;2-0
cqf Forstner > McKinney | D;6-4;SV1
cqf Trumbetta > Weakley | F;M FOR
csf Forstner > Edgmon | D;8-5
csf Barksdale > Trumbetta | D;4-3
3rd Barksdale > Forstner | D;6-5
5th Edgmon > Trumbetta | D;2-1
7th McKinney > Weakley | F;M FOR""")
W['133'] = ("""
Shane Valko|UPJ|23-1
Jacob Butrous|NSU|7-19
Todd Wilcox|GCU|37-3
Blake Fisher|NEW|18-9
Laramie Shaffer|AUGC|14-3
Michael Magaha|LC|31-10
Scott Berens|UCO|12-9
Ryan Fillingame|CSC|26-8
Naveed Bagheri|SFSU|21-2
Jan Steven Ulinski|UF|21-11
Corey Bowers|GU|29-5
Shane McQuade|SCSU|20-13
Cody Garcia|UNO|45-0
Joseph Morrison|UNK|32-12
Kyle Pedretti|UIU|24-7
Sheridan Moran|NC|26-11""", """
r1 Valko > Butrous | F;2:18
r1 Wilcox > Fisher | D;6-4
r1 Shaffer > Magaha | D;4-2
r1 Berens > Fillingame | D;3-0
r1 Bagheri > Ulinski | M;14-1
r1 Bowers > McQuade | D;13-9
r1 Garcia > Morrison | F;0:42
r1 Pedretti > Moran | D;2-1
qf Valko > Wilcox | D;9-8;TB1
qf Shaffer > Berens | D;3-1
qf Bowers > Bagheri | F;5:33
qf Garcia > Pedretti | F;2:00
sf Valko > Shaffer | D;4-0
sf Garcia > Bowers | D;6-3
f Valko > Garcia | D;6-3
c1 Fisher > Butrous | D;8-4
c1 Magaha > Fillingame | M;12-3
c1 McQuade > Ulinski | F;6:00
c1 Moran > Morrison | D;6-5
c2 Pedretti > Fisher | D;6-5
c2 Magaha > Bagheri | D;5-1
c2 Berens > McQuade | M;8-0
c2 Moran > Wilcox | D;6-5;TB3
cqf Pedretti > Magaha | D;8-4
cqf Moran > Berens | D;5-1
csf Pedretti > Shaffer | D;4-3
csf Moran > Bowers | D;8-2
3rd Pedretti > Moran | D;6-4
5th Shaffer > Bowers | D;9-7
7th Berens > Magaha | D;14-8""")
W['141'] = ("""
Jeremy Parker|LC|33-7
Jesse Cruz|WSC|4-4
Daniel Genetin|AU|11-7
Gabriel Suarez|SCSU|13-7
Andre Harrison|FHSU|21-4
Andrew Milanak|GU|12-4
Jay Sherer|AUGC|27-10
Joshua Falk|UF|17-16
Mario Morgan|UNO|37-3
Brandan Schunk|SMSU|15-8
Adam Hluschak|ESUP|20-13
Jimmy Savala|CSC|11-4
Brady Schneeberger|MSUMO|17-15
Cory Bloodgood|UCM|32-19
Josh Hensley|AS|26-4
Dallas Evans|SHU|19-13""", """
r1 Parker > Cruz | D;3-1
r1 Suarez > Genetin | D;8-4
r1 Harrison > Milanak | D;3-2
r1 Sherer > Falk | D;5-3
r1 Morgan > Schunk | D;10-9
r1 Hluschak > Savala | D;10-9
r1 Bloodgood > Schneeberger | D;8-7
r1 Hensley > Evans | T1.5;15-0;5:47
qf Parker > Suarez | D;8-3
qf Sherer > Harrison | D;2-1;TB1
qf Morgan > Hluschak | D;8-3
qf Bloodgood > Hensley | D;5-3
sf Sherer > Parker | D;3-2
sf Morgan > Bloodgood | F;6:15
f Sherer > Morgan | D;3-1
c1 Genetin > Cruz | D;5-4
c1 Milanak > Falk | D;3-2
c1 Schunk > Savala | D;7-6
c1 Evans > Schneeberger | D;6-5
c2 Hensley > Genetin | D;14-11
c2 Milanak > Hluschak | D;4-3;TB2
c2 Harrison > Schunk | D;16-9
c2 Suarez > Evans | D;8-2
cqf Milanak > Hensley | D;2-1
cqf Harrison > Suarez | M;15-6
csf Parker > Milanak | D;3-1;SV1
csf Harrison > Bloodgood | D;6-4
3rd Harrison > Parker | D;3-1
5th Bloodgood > Milanak | D;5-4;TB1
7th Hensley > Suarez | M;15-4""")
W['149'] = ("""
Mitch Smith|WLU|26-2
Mitch Arnold|NEW|22-19
Derek Bomsted|MSUMO|10-11
Joshua Nolan|SFSU|11-9
Craig Becker|UWP|34-2
Ryan McIntyre|UPJ|20-11
Thomas Hepburn|UNK|39-8
Travis Elg|MSUMA|11-14
Nate Herda|AUGC|28-7
Tyler Juby|MSC|14-7
Latra Collick|NC|31-11
Jeremy Espinoza|UF|15-18
Louie DeSantis|CSUP|20-12
Derek Stolarzyk|UIU|16-8
Esai Dominguez|UNO|28-11
Kevin McElhaney|GU|23-17""", """
r1 Arnold > Smith | D;3-1
r1 Bomsted > Nolan | D;6-3
r1 Becker > McIntyre | F;6:20
r1 Elg > Hepburn | F;5:51
r1 Herda > Juby | D;17-12
r1 Collick > Espinoza | D;6-3
r1 Stolarzyk > DeSantis | D;4-3
r1 Dominguez > McElhaney | F;2:29
qf Bomsted > Arnold | D;4-3
qf Becker > Elg | M;18-5
qf Herda > Collick | D;6-4
qf Dominguez > Stolarzyk | M;17-6
sf Becker > Bomsted | D;13-11;TB1
sf Dominguez > Herda | D;10-5
f Becker > Dominguez | D;4-3
c1 Smith > Nolan | M;17-4
c1 Hepburn > McIntyre | F;4:34
c1 Espinoza > Juby | D;14-9
c1 McElhaney > DeSantis | F;2:37
c2 Smith > Stolarzyk | D;10-7
c2 Hepburn > Collick | D;5-2
c2 Elg > Espinoza | D;8-4
c2 McElhaney > Arnold | D;3-2
cqf Hepburn > Smith | D;7-6
cqf Elg > McElhaney | F;4:22
csf Hepburn > Bomsted | D;3-2
csf Herda > Elg | M;12-4
3rd Hepburn > Herda | D;5-3
5th Elg > Bomsted | F;1:12
7th Smith > McElhaney | D;9-3;TB1""")
W['157'] = ("""
Michael Williams|UNCP|10-1
Justin Decker|UIU|18-9
Danny Grater|FHSU|22-8
Michael Lybarger|UF|20-14
Marcus Edgington|AUGC|30-4
Andy Lamancusa|MC|34-9
George Ivanov|UNO|33-10
Stephen Towne|GCU|32-8
Joseph Deaguero|AS|24-8
Bryce Givens|UI|27-11
Sean Byrnes|NC|11-3
Justin Turek|MSUMA|17-15
Dillon Bera|UWP|29-10
Kyle Francis|WSC|24-13
John Sundgren|SCSU|18-8
Jonathan Jackson|AC|21-8""", """
r1 Williams > Decker | D;6-1
r1 Grater > Lybarger | M;11-0
r1 Edgington > Lamancusa | D;6-4;TB1
r1 Ivanov > Towne | D;9-4
r1 Deaguero > Givens | F;2:04
r1 Byrnes > Turek | D;5-2
r1 Bera > Francis | M;15-2
r1 Jackson > Sundgren | D;6-5
qf Grater > Williams | D;5-3;SV1
qf Ivanov > Edgington | D;3-1
qf Deaguero > Byrnes | D;5-4
qf Jackson > Bera | M;11-2
sf Ivanov > Grater | D;4-3
sf Jackson > Deaguero | D;3-1
f Jackson > Ivanov | D;3-1
c1 Lybarger > Decker | D;3-2
c1 Lamancusa > Towne | D;7-2
c1 Turek > Givens | D;16-10
c1 Sundgren > Francis | D;16-10
c2 Bera > Lybarger | D;5-1
c2 Lamancusa > Byrnes | M;13-3
c2 Edgington > Turek | D;3-1
c2 Williams > Sundgren | D;6-5
cqf Lamancusa > Bera | D;5-3
cqf Edgington > Williams | D;6-4
csf Lamancusa > Grater | D;10-3
csf Edgington > Deaguero | D;9-7;SV1
3rd Lamancusa > Edgington | D;2-1
5th Grater > Deaguero | F;4:00
7th Williams > Bera | F;FOR""")
W['165'] = ("""
Josh Shields|MC|34-3
Justin Grant|CSUP|21-13
Derrick Adkins|UCO|31-14
Gavin Nelson|AUGC|20-2
Victor Carazo|GCU|35-4
Bret Terry|GU|21-17
Tad Merritt|SCSU|24-5
Matt Gille|UWP|40-9
Ryan Pankoke|UNO|29-6
Tel Todd|MSUMA|20-16
Jake Varilek|BA|19-9
Blake Malloy|FHSU|32-8
Travis Eggers|UIU|22-3
Thomas Graszl|AU|17-16
Taylor May|UNK|19-8
Kyle Keane|UPJ|28-8""", """
r1 Shields > Grant | D;4-0
r1 Nelson > Adkins | D;5-3
r1 Carazo > Terry | F;0:45
r1 Merritt > Gille | F;3:14
r1 Pankoke > Todd | D;6-1
r1 Malloy > Varilek | D;6-4
r1 Eggers > Graszl | F;2:31
r1 May > Keane | D;4-2
qf Shields > Nelson | F;0:33
qf Carazo > Merritt | D;5-4
qf Pankoke > Malloy | D;3-2
qf Eggers > May | D;6-3
sf Shields > Carazo | D;8-2
sf Eggers > Pankoke | D;3-1;SV1
f Eggers > Shields | D;8-3
c1 Grant > Adkins | D;7-2
c1 Gille > Terry | F;5:54
c1 Varilek > Todd | M;8-0
c1 Keane > Graszl | D;4-1
c2 May > Grant | D;7-5
c2 Gille > Malloy | D;11-9
c2 Merritt > Varilek | D;6-2
c2 Nelson > Keane | D;10-5
cqf May > Gille | F;6:56
cqf Merritt > Nelson | F;2:08
csf Carazo > May | D;3-1;SV1
csf Pankoke > Merritt | D;7-6
3rd Pankoke > Carazo | D;3-1;SV1
5th Merritt > May | F;6:24
7th Gille > Nelson | F;1:40""")
W['174'] = ("""
J.J. Davis|UNCP|21-3
Cody Rowell|UCO|15-13
Shamus O'Grady|SCSU|19-12
Zack Frazier|WSC|20-13
Luke Rynish|UWP|35-10
Curtis Chenoweth|NC|27-13
Cody Vasconcellos|CSC|13-3
Jarret Hall|MSUMO|6-2
Mitch Norton|UIU|18-3
Shawn Kuhlman|FHSU|21-13
Christopher Barrick|SUP|22-3
Matt Bailes|UCM|21-15
Kamarudeen Usman|UNK|40-1
Ben Becker|MSUMA|20-15
Aaron Denson|UNO|24-6
Anthony Petrella|GU|12-6""", """
r1 Davis > Rowell | D;8-6
r1 O'Grady > Frazier | M;16-4
r1 Rynish > Chenoweth | M;12-4
r1 Vasconcellos > Hall | D;7-4
r1 Norton > Kuhlman | F;1:10
r1 Barrick > Bailes | M;12-1
r1 Usman > Becker | D;9-2
r1 Denson > Petrella | M;8-0
qf O'Grady > Davis | F;6:21
qf Rynish > Vasconcellos | F;2:09
qf Barrick > Norton | D;7-4
qf Usman > Denson | D;2-0
sf Rynish > O'Grady | M;14-6
sf Usman > Barrick | D;6-5
f Usman > Rynish | D;5-4
c1 Rowell > Frazier | D;9-2
c1 Chenoweth > Hall | D;10-3
c1 Bailes > Kuhlman | D;9-7;SV1
c1 Petrella > Becker | D;16-9
c2 Rowell > Denson | D;8-4
c2 Norton > Chenoweth | M;17-5
c2 Bailes > Vasconcellos | F;1:43
c2 Petrella > Davis | M;15-6
cqf Norton > Rowell | F;6:34
cqf Petrella > Bailes | D;10-6
csf Norton > O'Grady | D;10-6
csf Petrella > Barrick | F;3:43
3rd Norton > Petrella | D;7-2
5th Barrick > O'Grady | D;6-3
7th Bailes > Rowell | D;10-8""")
W['184'] = ("""
Tim Darling|KUP|15-1
Craig Draper-Johnson|SMSU|17-15
Zachariah Jimenez|SFSU|12-18
Austin Boehm|UNO|20-8
Derek Skala|SCSU|24-8
Shane Mallory|ESUP|23-7
Jeffery Havelka|UF|22-16
Derek Ross|UNK|29-15
Charlie Pipher|WSC|22-3
Tanner Keck|UCO|17-11
Patrick Walsh|UPJ|26-8
Brady Anderson|MARY|15-11
Lucas Haag|UWP|43-9
Ryan Becerra|GCU|18-9
Aaron Norgren|MSUMA|13-9
Bryant Blanton|NC|38-7""", """
r1 Darling > Draper-Johnson | D;6-3
r1 Boehm > Jimenez | F;0:30
r1 Mallory > Skala | D;7-6
r1 Ross > Havelka | D;8-2
r1 Pipher > Keck | F;4:04
r1 Walsh > Anderson | D;8-4
r1 Becerra > Haag | D;6-2
r1 Blanton > Norgren | D;5-2
qf Darling > Boehm | T1.5;15-0;4:00
qf Mallory > Ross | D;5-2
qf Walsh > Pipher | D;8-6
qf Blanton > Becerra | F;5:53
sf Mallory > Darling | D;7-3
sf Blanton > Walsh | D;8-3
f Blanton > Mallory | D;2-1;TB1
c1 Draper-Johnson > Jimenez | M;10-2
c1 Skala > Havelka | D;6-1
c1 Anderson > Keck | D;5-1
c1 Norgren > Haag | D;14-8
c2 Becerra > Draper-Johnson | D;5-2
c2 Pipher > Skala | D;9-7
c2 Ross > Anderson | D;9-4
c2 Norgren > Boehm | F;DEF
cqf Pipher > Becerra | D;7-1
cqf Ross > Norgren | F;0:53
csf Darling > Pipher | D;5-1
csf Ross > Walsh | F;1:51
3rd Ross > Darling | D;8-3
5th Pipher > Walsh | F;3:31
7th Norgren > Becerra | D;8-5""")
W['197'] = ("""
Keeno Griffin|NC|29-3
Kyle Sand|AS|23-8
Jarrett Edison|UCO|27-12
Matthew Meuleners|NSU|20-9
Donovan McMahill|WSC|31-4
Scott Snyder|KUP|17-9
Lucas Munkelwitz|SCSU|29-7
Jon Treml|UWP|28-15
Jacob Marrs|UNO|35-7
Dusty Vliem|MARY|20-7
Shane Nolan|UNCP|22-11
Justin McKain|UNK|25-20
Tyler Copsey|AUGC|18-3
Daniel Stevenson|UF|18-18
Vincent Bordi|SFSU|21-12
Mitch Knapp|WLU|29-5""", """
r1 Griffin > Sand | D;3-2
r1 Meuleners > Edison | D;5-2;TB1
r1 McMahill > Snyder | D;9-4
r1 Munkelwitz > Treml | F;6:25
r1 Marrs > Vliem | M;11-2
r1 Nolan > McKain | D;3-2
r1 Copsey > Stevenson | D;6-2
r1 Knapp > Bordi | D;7-0
qf Griffin > Meuleners | D;5-3
qf McMahill > Munkelwitz | D;6-0
qf Marrs > Nolan | T1.5;15-0;5:30
qf Copsey > Knapp | D;7-2
sf McMahill > Griffin | D;2-0
sf Copsey > Marrs | D;4-3
f McMahill > Copsey | D;3-1
c1 Edison > Sand | D;9-7
c1 Snyder > Treml | F;2:26
c1 McKain > Vliem | D;10-6
c1 Stevenson > Bordi | D;3-2
c2 Knapp > Edison | F;3:31
c2 Snyder > Nolan | F;2:55
c2 McKain > Munkelwitz | D;5-4;TB2
c2 Meuleners > Stevenson | D;6-4
cqf Knapp > Snyder | D;5-3
cqf McKain > Meuleners | D;3-1;SV1
csf Griffin > Knapp | D;3-1
csf Marrs > McKain | D;7-4
3rd Marrs > Griffin | D;7-2;TB1
5th Knapp > McKain | D;4-3
7th Snyder > Meuleners | D;7-4""")
W['285'] = ("""
Christopher Dempsey|UPJ|21-12
Matthew Clum|UF|12-14
Jake Kahnke|SCSU|27-5
Jesse Boggs|NMHU|16-10
Elijah Madison|UNO|31-7
J.D. Ramsey|WLU|16-12
Steve Franklin|SFSU|25-9
Tim Johnson|MSUMO|19-9
Brady Wilson|MSUMA|29-4
Patrick Carey|CSUP|30-11
Neil McGrath|GU|27-6
Lynn Panko|UI|24-4
Charlie Alexander|WSC|26-5
Brian Rodas|SMSU|11-6
Dustin Finn|UCO|24-5
Kevin Bolinsky|KUP|18-2""", """
r1 Dempsey > Clum | D;3-2
r1 Kahnke > Boggs | F;0:33
r1 Madison > Ramsey | F;4:30
r1 Franklin > Johnson | D;9-4
r1 Wilson > Carey | F;4:36
r1 McGrath > Panko | D;3-1;SV1
r1 Alexander > Rodas | D;5-2
r1 Finn > Bolinsky | F;3:22
qf Kahnke > Dempsey | D;2-1;TB1
qf Madison > Franklin | D;7-2
qf Wilson > McGrath | M;10-1
qf Finn > Alexander | D;3-1;TB1
sf Madison > Kahnke | D;3-2
sf Wilson > Finn | D;3-1
f Madison > Wilson | D;1-0
c1 Clum > Boggs | D;4-2
c1 Johnson > Ramsey | F;0:18
c1 Carey > Panko | D;11-5
c1 Rodas > Bolinsky | D;8-2
c2 Alexander > Clum | D;5-1;TB1
c2 McGrath > Johnson | M;9-0
c2 Franklin > Carey | D;9-2
c2 Dempsey > Rodas | F;5:25
cqf Alexander > McGrath | D;3-2
cqf Franklin > Dempsey | F;0:54
csf Kahnke > Alexander | D;4-1;TB1
csf Finn > Franklin | F;2:18
3rd Finn > Kahnke | D;4-3;TB1
5th Alexander > Franklin | D;5-3
7th McGrath > Dempsey | F;2:37""")
