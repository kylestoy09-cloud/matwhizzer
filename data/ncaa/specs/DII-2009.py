HEADER = "# NCAA Division II Championships 2009 — source: 2009.pdf (scan; typed from the bracket pages, 2026-11-18; colleges as the team standings name them)\n# 285: printed \"Nail McGrath (GU)\" — taken as Niall McGrath (the 2008 sheet; 2010 prints \"Neil\")"
CODES = {'NC':'Newberry','AUGC':'Augustana - SD','SFSU':'San Francisco State','UNO':'Nebraska-Omaha','MSUM':'Minnesota State Mankato','MOOR':'Minnesota State Moorhead','AC':'Anderson College','UWP':'Wisconsin-Parkside','FHSU':'Fort Hays State','AS':'Adams State','AU':'Ashland','UNCP':'North Carolina-Pembroke','UIU':'Upper Iowa','UCO':'Central Oklahoma','CSC':'Chadron State','NSU':'Northern State','MC':'Mercyhurst','UPJ':'Pittsburgh-Johnstown','UNK':'Nebraska-Kearney','UCM':'Central Missouri','SMSU':'Southwest Minnesota State','WLSU':'West Liberty State','SCSU':'St. Cloud State','KUP':'Kutztown','MSC':'Mesa State College','UI':'Indianapolis','LC':'Limestone','GU':'Gannon','CSM':'Colorado School Of Mines','WSC':'Western State College','CNC':'Carson-Newman','BA':'Belmont Abbey','SUP':'Shippensburg','NMHU':'New Mexico Highlands','UF':'Findlay'}
W = {}
W['125'] = ("""
Matt Oliver|NC|27-3
Alex Meger|AUGC|7-9
Curtis Schurkamp|SFSU|13-8
Matthew Rein|UNO|32-18
Andy Forstner|MSUM|27-10
Carlton Hamilton|AC|29-9
Cody Zimmerman|UWP|46-6
Thomas Edgmon|FHSU|15-7
Arsenia Barksdale|AS|21-5
Daniel Mandara|AU|15-9
Russell Weakley|UNCP|20-2
Kyle Pedretti|UIU|24-8
Tim Elliott|UCO|40-10
Devlon Webb|CSC|24-14
Corbin Surat|NSU|15-11
Payne Lint|MC|30-14""", """
r1 Oliver > Meger | M;10-0
r1 Schurkamp > Rein | D;8-5
r1 Forstner > Hamilton | D;4-2
r1 Edgmon > Zimmerman | D;7-3
r1 Barksdale > Mandara | D;7-2
r1 Weakley > Pedretti | M;12-4
r1 Elliott > Webb | D;5-4
r1 Lint > Surat | D;4-1
qf Oliver > Schurkamp | D;10-6
qf Edgmon > Forstner | D;9-7
qf Barksdale > Weakley | D;3-2
qf Elliott > Lint | D;7-0
sf Edgmon > Oliver | D;6-4
sf Barksdale > Elliott | D;7-2
f Barksdale > Edgmon | D;3-1
c1 Rein > Meger | D;4-3
c1 Hamilton > Zimmerman | D;5-3
c1 Pedretti > Mandara | D;5-3
c1 Surat > Webb | D;9-3
c2 Lint > Rein | F;5:41
c2 Hamilton > Weakley | D;6-4;SV1
c2 Forstner > Pedretti | M;15-5
c2 Schurkamp > Surat | D;8-6
cqf Hamilton > Lint | D;11-7
cqf Forstner > Schurkamp | D;12-8
csf Oliver > Hamilton | D;4-0
csf Elliott > Forstner | M;9-1
3rd Oliver > Elliott | D;4-3
5th Hamilton > Forstner | M;9-1
7th Schurkamp > Lint | M;14-6""")
W['133'] = ("""
Shane Valko|UPJ|24-0
Joseph Morrison|UNK|20-7
Grant Baker|UCM|37-11
Michal Barrie|SMSU|19-9
Naveed Bagheri|SFSU|22-10
Nick Wykoff|WLSU|24-10
Josh Williams|SCSU|14-6
Scott Berens|UCO|17-14
Cody Garcia|UNO|30-8
Tim Haneberg|MSUM|17-17
Joe Kemmerer|KUP|23-11
Rhett Breed|MSC|17-9
Trevor Franklin|UIU|27-4
Jake Bartley|AU|8-13
Marques Bravo|WSC|28-5
Andrew Young|NC|15-7""", """
r1 Valko > Morrison | D;6-1
r1 Baker > Barrie | M;14-1
r1 Bagheri > Wykoff | D;7-2
r1 Berens > Williams | F;6:01
r1 Garcia > Haneberg | M;9-0
r1 Kemmerer > Breed | D;5-0
r1 Franklin > Bartley | T1.5;18-3;7:00
r1 Bravo > Young | D;2-1
qf Valko > Baker | F;5:17
qf Bagheri > Berens | D;15-11
qf Kemmerer > Garcia | D;4-2
qf Bravo > Franklin | F;4:20
sf Valko > Bagheri | D;3-0
sf Kemmerer > Bravo | D;1-0;TB1
f Kemmerer > Valko | D;2-1;TB1
c1 Morrison > Barrie | M;11-0
c1 Williams > Wykoff | M;10-2
c1 Breed > Haneberg | M;11-3
c1 Young > Bartley | D;3-1
c2 Morrison > Franklin | D;9-7
c2 Garcia > Williams | F;0:45
c2 Berens > Breed | D;10-6
c2 Young > Baker | D;5-2
cqf Garcia > Morrison | F;4:38
cqf Young > Berens | D;9-4
csf Garcia > Bagheri | F;3:19
csf Bravo > Young | D;3-2
3rd Garcia > Bravo | F;2:34
5th Bagheri > Young | M;10-2
7th Morrison > Berens | D;3-0""")
W['141'] = ("""
Doug Surra|WLSU|28-3
Colby Robinson|UCO|32-14
Steven Baker|UIU|28-10
Ben Lockett|SFSU|18-13
Mario Morgan|UNO|29-11
Bryan Miller|UNCP|18-9
Jimmy Savala|CSC|29-11
Jay Sherer|AUGC|23-11
Gabriel Suarez|SCSU|26-9
James Annon|FHSU|25-9
Adam Whetstone|UPJ|20-12
Cory Bloodgood|UCM|29-20
Raymond Dunning|AS|29-7
John Putman|MSUM|20-7
Matt Irwin|UI|32-6
Jeremy Parker|LC|31-9""", """
r1 Surra > Robinson | D;7-4
r1 Baker > Lockett | D;5-3
r1 Morgan > Miller | D;5-3
r1 Savala > Sherer | M;11-3
r1 Annon > Suarez | D;5-4
r1 Whetstone > Bloodgood | D;9-3
r1 Dunning > Putman | F;2:47
r1 Parker > Irwin | D;6-2
qf Surra > Baker | D;15-8
qf Morgan > Savala | D;6-3
qf Whetstone > Annon | D;6-5
qf Dunning > Parker | D;3-0
sf Surra > Morgan | D;2-0;SV1
sf Dunning > Whetstone | M;14-3
f Surra > Dunning | D;5-3
c1 Lockett > Robinson | D;4-2
c1 Sherer > Miller | D;4-3
c1 Bloodgood > Suarez | M;10-0
c1 Putman > Irwin | F;DEF
c2 Lockett > Parker | D;10-8
c2 Sherer > Annon | D;11-5
c2 Bloodgood > Savala | D;5-4
c2 Putman > Baker | D;9-6
cqf Lockett > Sherer | D;12-6
cqf Putman > Bloodgood | D;8-6
csf Morgan > Lockett | D;2-0
csf Putman > Whetstone | D;13-6
3rd Morgan > Putman | D;4-2
5th Whetstone > Lockett | D;7-3
7th Sherer > Bloodgood | D;5-0""")
W['149'] = ("""
Kevin McElehaney|GU|16-8
David Albrecht|SMSU|7-4
Ryan Etherton|UNK|25-8
William Forrest|UCM|23-18
Tommy Abbott|MSUM|27-4
Kayne Melko|WLSU|20-8
Esai Dominguez|UNO|32-10
Joseph Deaguero|AS|11-7
Christopher Freije|WSC|19-4
Luke Elmore|UCO|21-11
Latra Collick|NC|25-8
Mike Long|AUGC|10-6
Craig Becker|UWP|30-0
Jessie Snider|CSM|26-9
Jacob Roberts|SCSU|27-9
Ryan McIntyre|UPJ|14-12""", """
r1 McElehaney > Albrecht | M;11-3
r1 Forrest > Etherton | D;8-7
r1 Abbott > Melko | D;3-1
r1 Deaguero > Dominguez | F;4:14
r1 Freije > Elmore | D;3-1
r1 Long > Collick | M;9-0
r1 Becker > Snider | M;12-2
r1 McIntyre > Roberts | D;8-4
qf McElehaney > Forrest | M;16-3
qf Abbott > Deaguero | M;8-0
qf Freije > Long | D;4-3
qf Becker > McIntyre | T1.5;18-2;7:00
sf Abbott > McElehaney | M;11-0
sf Freije > Becker | F;1:42
f Abbott > Freije | D;6-5
c1 Etherton > Albrecht | D;6-1
c1 Dominguez > Melko | M;12-4
c1 Elmore > Collick | D;6-5
c1 Roberts > Snider | M;14-2
c2 Etherton > McIntyre | M;9-0
c2 Dominguez > Long | F;DEF
c2 Elmore > Deaguero | D;8-2
c2 Forrest > Roberts | D;7-6
cqf Dominguez > Etherton | M;17-3
cqf Elmore > Forrest | D;14-10
csf Dominguez > McElehaney | D;14-8
csf Becker > Elmore | D;9-2
3rd Dominguez > Becker | D;6-4;SV1
5th Elmore > McElehaney | F;4:49
7th Forrest > Etherton | D;6-4""")
W['157'] = ("""
Andy Lamancusa|MC|34-9
Keenan McCurdy|UNK|34-17
Cory Fornal|UI|21-12
John Sundgren|SCSU|30-7
Noomis Jones|AS|25-6
Mitch Smith|WLSU|25-4
Travis Eggers|UIU|19-8
Michael Lybarger|UF|28-12
Todd Meneely|UNO|18-0
Tallen Wald|MOOR|18-12
Jonathan Jackson|AC|16-8
Chase Walker|MSC|29-5
Travis Elg|MSUM|19-4
Denis Ryzhov|UCM|28-20
Danny Grater|FHSU|28-11
Mike Rogers|CNC|8-1""", """
r1 Lamancusa > McCurdy | D;9-3
r1 Sundgren > Fornal | D;6-0
r1 Smith > Jones | D;8-2
r1 Eggers > Lybarger | M;16-6
r1 Meneely > Wald | F;6:57
r1 Walker > Jackson | D;3-1;SV1
r1 Elg > Ryzhov | F;6:08
r1 Grater > Rogers | F;DEF
qf Lamancusa > Sundgren | M;16-7
qf Eggers > Smith | D;6-4
qf Meneely > Walker | M;13-5
qf Grater > Elg | D;6-2
sf Eggers > Lamancusa | D;10-6;SV2
sf Meneely > Grater | D;8-4
f Meneely > Eggers | D;4-2;SV2
c1 McCurdy > Fornal | F;2:06
c1 Jones > Lybarger | D;4-1
c1 Jackson > Wald | F;0:49
c1 Ryzhov > Rogers | F;M FOR
c2 McCurdy > Elg | F;1:39
c2 Walker > Jones | D;11-5
c2 Smith > Jackson | D;2-1;TB2
c2 Ryzhov > Sundgren | F;0:21
cqf Walker > McCurdy | D;2-1
cqf Smith > Ryzhov | F;3:30
csf Lamancusa > Walker | D;11-4
csf Smith > Grater | D;5-2
3rd Lamancusa > Smith | D;8-6
5th Walker > Grater | D;5-2
7th Ryzhov > McCurdy | D;6-2""")
W['165'] = ("""
Josh Shields|MC|25-3
Anthony Bradberry|AU|16-18
Tim Matheson|MSUM|20-12
Troy Lussenhop|FHSU|24-10
Corey Van Groll|UWP|40-6
Seth Phalen|WLSU|12-6
Skye Wells|WSC|14-14
Tad Merritt|SCSU|32-5
Tyler Tubbs|MOOR|24-3
Jordan Larson|CSM|20-15
Kyle Keane|UPJ|16-9
Aaron Denson|UNO|28-8
Taylor May|UNK|32-11
Phillip Downs|NSU|7-8
Justin Shannon|UF|24-11
Brandon Kelly|NC|27-8""", """
r1 Shields > Bradberry | D;9-2
r1 Matheson > Lussenhop | D;5-1
r1 Van Groll > Phalen | M;15-6
r1 Merritt > Wells | M;16-4
r1 Tubbs > Larson | D;10-5
r1 Denson > Keane | M;10-2
r1 May > Downs | D;10-5
r1 Kelly > Shannon | D;8-7
qf Shields > Matheson | F;6:54
qf Van Groll > Merritt | D;8-6
qf Denson > Tubbs | D;5-2
qf May > Kelly | M;10-1
sf Shields > Van Groll | D;4-0
sf Denson > May | F;6:58
f Shields > Denson | D;5-0
c1 Lussenhop > Bradberry | D;8-4
c1 Wells > Phalen | D;14-9
c1 Keane > Larson | F;0:56
c1 Shannon > Downs | D;6-3
c2 Kelly > Lussenhop | D;5-1
c2 Tubbs > Wells | D;10-4
c2 Merritt > Keane | D;6-1
c2 Matheson > Shannon | D;3-2;TB1
cqf Tubbs > Kelly | D;11-6
cqf Merritt > Matheson | D;6-4
csf Van Groll > Tubbs | D;6-2
csf Merritt > May | D;7-5
3rd Merritt > Van Groll | D;9-2
5th May > Tubbs | D;5-3
7th Matheson > Kelly | D;7-3""")
W['174'] = ("""
Christopher Barrick|SUP|27-3
Ben Becker|MSUM|12-11
Brett Hunter|CSC|31-8
Justin Ferguson|AU|14-4
Mitch Norton|UIU|21-2
Josh Whitelock|NC|24-10
Tommy McCarty|UCO|28-4
Jesse Feinsod|NMHU|31-10
Kamarudeen Usman|UNK|42-8
Luke Rynish|UWP|41-14
Adam Phillips|BA|20-5
Jarret Hall|MOOR|11-7
Ross Taplin|UNO|38-7
Nick Ross|WSC|17-13
Derek Skala|SCSU|24-7
Joeseph Shreckhise|LC|22-6""", """
r1 Barrick > Becker | F;0:55
r1 Hunter > Ferguson | D;5-0
r1 Norton > Whitelock | D;3-0
r1 Feinsod > McCarty | D;10-5
r1 Usman > Rynish | D;8-5
r1 Hall > Phillips | D;6-0
r1 Taplin > Ross | F;2:20
r1 Shreckhise > Skala | D;7-3;TB1
qf Hunter > Barrick | M;13-3
qf Norton > Feinsod | F;3:59
qf Usman > Hall | D;4-2
qf Taplin > Shreckhise | F;0:12
sf Hunter > Norton | D;5-3
sf Usman > Taplin | D;2-0
f Hunter > Usman | D;3-2
c1 Becker > Ferguson | D;7-4
c1 McCarty > Whitelock | F;1:16
c1 Rynish > Phillips | M;12-3
c1 Skala > Ross | D;3-1
c2 Shreckhise > Becker | D;9-4
c2 McCarty > Hall | M;11-0
c2 Feinsod > Rynish | D;4-2
c2 Skala > Barrick | F;6:12
cqf McCarty > Shreckhise | D;5-2
cqf Feinsod > Skala | D;9-5
csf McCarty > Norton | F;3:45
csf Taplin > Feinsod | F;0:23
3rd Taplin > McCarty | D;5-2
5th Norton > Feinsod | D;6-4;SV1
7th Skala > Shreckhise | F;6:32""")
W['184'] = ("""
Jacob Tazzi|GU|29-9
Tyler Gonzales|FHSU|23-15
Lucas Haag|UWP|35-11
Aaron Norgren|MSUM|19-11
Kyle Sand|AS|17-10
Bryant Blanton|NC|27-7
Nicholis Henning|AUGC|14-8
Travis Barbarick|UCM|17-10
Brent Pankoke|UNO|13-11
Tony Gehling|UIU|27-11
Mitch Knapp|WLSU|25-9
Marques Gales|SFSU|18-16
Brad Padgett|SCSU|21-6
Hiram Smith|UF|27-12
Larry Wilbanks|WSC|27-7
Landon Hall|CNC|26-11""", """
r1 Tazzi > Gonzales | D;3-2
r1 Haag > Norgren | D;6-1
r1 Sand > Blanton | D;4-1
r1 Henning > Barbarick | D;7-2
r1 Pankoke > Gehling | M;11-3
r1 Knapp > Gales | D;5-3
r1 Padgett > Smith | D;4-1
r1 Wilbanks > Hall | M;11-1
qf Tazzi > Haag | D;7-5
qf Sand > Henning | D;6-5
qf Pankoke > Knapp | D;6-4
qf Padgett > Wilbanks | F;6:17
sf Sand > Tazzi | D;6-1
sf Pankoke > Padgett | D;4-0
f Sand > Pankoke | D;6-4;SV2
c1 Norgren > Gonzales | D;6-4
c1 Blanton > Barbarick | M;14-3
c1 Gehling > Gales | M;8-0
c1 Smith > Hall | D;7-2
c2 Wilbanks > Norgren | D;11-10
c2 Blanton > Knapp | D;2-1;TB1
c2 Gehling > Henning | M;13-4
c2 Smith > Haag | D;10-5
cqf Blanton > Wilbanks | D;8-6
cqf Smith > Gehling | D;7-5;SV1
csf Blanton > Tazzi | D;4-3
csf Padgett > Smith | F;1:58
3rd Padgett > Blanton | M;15-3
5th Smith > Tazzi | D;9-8
7th Wilbanks > Gehling | M;8-0""")
W['197'] = ("""
Keeno Griffin|NC|29-2
Andrejs Zalaiskalns|UF|32-12
Tyler Copsey|AUGC|23-7
Matthew Farrell|UNK|19-8
Josh Ohl|AU|26-2
Zach Anderson|AC|19-11
Josh Majerus|CSC|30-6
Matt Nelson|MOOR|19-8
Pat Mahan|MSUM|23-5
Luke McPeek|NMHU|25-14
Scott Snyder|KUP|23-7
Malcolm Briggs|UWP|28-11
Donovan McMahill|WSC|31-7
Lucas Munkelwitz|SCSU|28-11
Jacob Marrs|UNO|23-8
Patrick Walsh|UPJ|28-8""", """
r1 Griffin > Zalaiskalns | D;5-3
r1 Copsey > Farrell | D;3-2
r1 Ohl > Anderson | F;0:39
r1 Majerus > Nelson | D;11-6
r1 McPeek > Mahan | D;11-4
r1 Briggs > Snyder | D;5-2
r1 McMahill > Munkelwitz | M;14-2
r1 Marrs > Walsh | D;6-4;SV1
qf Griffin > Copsey | D;5-3
qf Ohl > Majerus | D;9-7
qf McPeek > Briggs | F;3:41
qf Marrs > McMahill | D;4-3
sf Griffin > Ohl | D;6-4
sf Marrs > McPeek | M;15-7
f Griffin > Marrs | D;3-2
c1 Farrell > Zalaiskalns | M;12-3
c1 Nelson > Anderson | M;13-2
c1 Mahan > Snyder | M;11-0
c1 Walsh > Munkelwitz | D;4-3
c2 Farrell > McMahill | F;1:33
c2 Briggs > Nelson | M;14-4
c2 Majerus > Mahan | M;8-0
c2 Copsey > Walsh | D;5-2
cqf Farrell > Briggs | F;5:54
cqf Majerus > Copsey | D;4-1
csf Farrell > Ohl | F;5:51
csf Majerus > McPeek | T1.5;15-0;4:34
3rd Farrell > Majerus | F;4:50
5th Ohl > McPeek | F;1:19
7th Copsey > Briggs | F;M FOR""")
W['285'] = ("""
Cy Wainwright|NC|32-0
Jared Little|NSU|11-9
Steve Franklin|SFSU|22-11
Travis Clark|UF|25-8
Brady Wilson|MSUM|29-3
Cody Tominak|WLSU|9-6
Anthony Lewis|UNO|22-9
Jeff Schossow|AS|10-10
Charlie Alexander|WSC|23-2
Cody Beck|UCM|22-8
Niall McGrath|GU|27-6
Tim Johnson|MOOR|14-3
Dustin Finn|UCO|23-3
Jesse Boggs|NMHU|23-11
Lance Peters|AUGC|12-9
Christopher Dempsey|UPJ|26-10""", """
r1 Wainwright > Little | F;2:12
r1 Franklin > Clark | D;10-4
r1 Wilson > Tominak | F;1:12
r1 Lewis > Schossow | D;9-2
r1 Alexander > Beck | RT;3-3;TB2
r1 McGrath > Johnson | F;2:29
r1 Finn > Boggs | D;11-5
r1 Dempsey > Peters | F;2:50
qf Wainwright > Franklin | F;1:33
qf Wilson > Lewis | D;5-4
qf Alexander > McGrath | D;5-2
qf Finn > Dempsey | D;2-1
sf Wainwright > Wilson | M;8-0
sf Finn > Alexander | D;3-1;SV1
f Wainwright > Finn | D;6-4
c1 Clark > Little | D;5-0
c1 Schossow > Tominak | F;0:39
c1 Beck > Johnson | D;6-1
c1 Boggs > Peters | D;6-2
c2 Clark > Dempsey | D;4-3;TB2
c2 McGrath > Schossow | T1.5;17-0;3:00
c2 Lewis > Beck | D;2-1
c2 Franklin > Boggs | F;2:00
cqf McGrath > Clark | D;5-2
cqf Franklin > Lewis | D;7-5
csf Wilson > McGrath | D;3-0
csf Alexander > Franklin | F;2:25
3rd Wilson > Alexander | F;1:01
5th McGrath > Franklin | F;2:55
7th Lewis > Clark | D;5-3""")
