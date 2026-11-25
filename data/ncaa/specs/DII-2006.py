HEADER = "# NCAA Division II Championships 2006 — source: 2006.pdf (scan; typed from the bracket pages, 2026-11-18; colleges as the bracket names them, written the way our list spells them)"
CODES = {}
W = {}
W['125'] = ("""
Jamie Thomas|Shippensburg|26-8
Devlon Webb|Chadron State|11-11
Shane Caruthers|Central Oklahoma|15-11
Chris Trampe|Augustana SD|20-14
Trevor Charbonneau|Nebraska-Kearney|30-8
Chris Neidermeier|Belmont Abbey|10-9
Tyler Mumbulo|Upper Iowa|23-9
Craig Fechko|Findlay|16-16
Mike Compton|Ashland|23-6
Nick Smith|Minnesota State Mankato|25-12
Daniel Clausing|Limestone|27-9
Kory Lira|Fort Hays State|11-5
Cody Garcia|Nebraska-Omaha|35-3
Allen Stokes|Truman State|16-9
Rob McCabe|Adams State|20-11
Payne Lint|Mercyhurst|20-12""", """
r1 Thomas > Webb | M;10-2
r1 Caruthers > Trampe | D;6-4
r1 Charbonneau > Neidermeier | M;11-3
r1 Mumbulo > Fechko | D;11-7
r1 Smith > Compton | D;3-1
r1 Clausing > Lira | D;6-4
r1 Garcia > Stokes | F;1:38
r1 McCabe > Lint | T1.5;15-0;7:00
qf Thomas > Caruthers | D;11-5
qf Charbonneau > Mumbulo | D;7-1
qf Smith > Clausing | D;6-4
qf Garcia > McCabe | D;11-4
sf Thomas > Charbonneau | D;5-3;SV1
sf Garcia > Smith | M;9-1
f Garcia > Thomas | D;5-1
c1 Trampe > Webb | D;4-2
c1 Fechko > Neidermeier | D;4-2
c1 Compton > Lira | D;11-4
c1 Stokes > Lint | F;4:27
c2 McCabe > Trampe | D;9-6
c2 Fechko > Clausing | D;7-5
c2 Compton > Mumbulo | F;5:32
c2 Caruthers > Stokes | M;11-3
cqf McCabe > Fechko | M;14-0
cqf Caruthers > Compton | F;M FOR
csf McCabe > Charbonneau | D;5-3;SV2
csf Smith > Caruthers | D;5-3
3rd Smith > McCabe | M;15-7
5th Charbonneau > Caruthers | F;2:55
7th Fechko > Compton | F;M FOR""")
W['133'] = ("""
Brandon Reasy|Pitt-Johnstown|25-6
Kent Pierson|Carson-Newman|17-11
Dan Hilario|Nebraska-Omaha|20-9
Virgil Lockett|San Francisco State|25-11
Andy Uhl|Findlay|27-6
Lenny Calhoun|Mercyhurst|15-9
Raymond Dunning|Adams State|22-8
Jeff Pfaffinger|Minnesota State Mankato|29-9
Ralph Acosta|Upper Iowa|21-4
Marques Bravo|Western State College|11-7
Matt Mossor|West Liberty State|23-7
Earl Jones|Central Oklahoma|30-7
Brett Allgood|Nebraska-Kearney|34-2
Troy Macfarland|Minnesota State Moorhead|16-15
Shane Perkey|Indianapolis|36-6
Brandon Clemmer|Kutztown|22-12""", """
r1 Reasy > Pierson | F;3:27
r1 Hilario > Lockett | D;3-1
r1 Uhl > Calhoun | D;9-2
r1 Dunning > Pfaffinger | D;11-5
r1 Bravo > Acosta | D;6-5;TB3
r1 Jones > Mossor | D;8-2
r1 Allgood > Macfarland | T1.5;21-6;5:10
r1 Perkey > Clemmer | D;5-1
qf Reasy > Hilario | D;6-2
qf Uhl > Dunning | D;5-3
qf Jones > Bravo | D;5-1
qf Allgood > Perkey | D;5-3
sf Uhl > Reasy | D;4-2
sf Allgood > Jones | D;2-1
f Allgood > Uhl | D;9-7
c1 Lockett > Pierson | D;3-1;SV1
c1 Pfaffinger > Calhoun | D;7-3
c1 Acosta > Mossor | D;3-2
c1 Clemmer > Macfarland | M;12-0
c2 Perkey > Lockett | D;8-5
c2 Pfaffinger > Bravo | D;4-1
c2 Acosta > Dunning | D;3-2
c2 Hilario > Clemmer | D;3-2
cqf Perkey > Pfaffinger | D;4-2
cqf Acosta > Hilario | D;7-2
csf Perkey > Reasy | F;1:26
csf Jones > Acosta | D;6-4
3rd Jones > Perkey | D;7-1
5th Acosta > Reasy | D;3-2
7th Pfaffinger > Hilario | D;3-1""")
W['141'] = ("""
Thad Benton|Pitt-Johnstown|37-5
Shane Walton|Minnesota State Moorhead|14-7
Jeff Rutledge|Nebraska-Kearney|25-14
Zach Meissner|Ashland|30-8
Mitch Waite|Nebraska-Omaha|19-7
Nick DiCarlo|Anderson College|19-14
Wade Killgore|Central Missouri|16-15
Patrick Sharp|New Mexico Highlands|15-3
Brian Pitts|Adams State|20-12
Craig Becker|Wisconsin-Parkside|25-11
JJ Zanetta|Mercyhurst|24-14
Zach Stevens|Minnesota State Mankato|25-11
Kyle Evans|Central Oklahoma|23-4
Chris Freije|Western State College|17-18
Andre VanderVelde|Augustana SD|19-11
Willie Hilton|UNC Pembroke|15-5""", """
r1 Benton > Walton | D;7-0
r1 Rutledge > Meissner | D;6-4
r1 Waite > DiCarlo | M;13-3
r1 Sharp > Killgore | D;9-5
r1 Pitts > Becker | M;11-2
r1 Stevens > Zanetta | D;4-3
r1 Evans > Freije | D;5-2
r1 Hilton > VanderVelde | D;16-9
qf Benton > Rutledge | M;9-1
qf Sharp > Waite | D;6-5
qf Pitts > Stevens | D;8-2
qf Evans > Hilton | D;5-2
sf Benton > Sharp | F;2:46
sf Evans > Pitts | D;6-2
f Benton > Evans | D;4-2
c1 Meissner > Walton | D;9-3
c1 Killgore > DiCarlo | D;4-1
c1 Zanetta > Becker | D;6-3
c1 Freije > VanderVelde | D;9-8
c2 Hilton > Meissner | M;14-2
c2 Stevens > Killgore | D;4-3
c2 Zanetta > Waite | D;9-8;TB1
c2 Rutledge > Freije | D;6-2
cqf Stevens > Hilton | F;M FOR
cqf Rutledge > Zanetta | M;12-3
csf Stevens > Sharp | M;10-1
csf Pitts > Rutledge | D;8-3
3rd Pitts > Stevens | D;6-4
5th Rutledge > Sharp | M;17-8
7th Zanetta > Hilton | F;M FOR""")
W['149'] = ("""
Ronald Paterniti|Gannon|18-1
Mark Pfeifer|Chadron State|25-7
Shea Timothy|Central Oklahoma|23-7
Brandon Girtz|Minnesota State Mankato|26-9
Mikel Delk|Fort Hays State|17-6
Daniel Nauman|Shippensburg|19-15
Shane Unger|Nebraska-Omaha|18-8
Charlie Pingleton|Indianapolis|18-4
Antonio Guerra|Findlay|23-6
Peter Hayes|Minnesota State Moorhead|15-11
Chris Chambers|Kutztown|17-16
Matt True|Nebraska-Kearney|16-15
Ryan King|Augustana SD|29-4
Marcus Gordon|Ashland|22-9
Camille DuPont|Western State College|23-5
Don Cummings|Mercyhurst|21-8""", """
r1 Pfeifer > Paterniti | D;6-4;SV1
r1 Timothy > Girtz | D;4-3
r1 Delk > Nauman | F;6:59
r1 Unger > Pingleton | D;9-7;SV1
r1 Guerra > Hayes | M;14-3
r1 Chambers > True | D;6-5
r1 King > Gordon | D;6-2
r1 Cummings > DuPont | D;11-6
qf Timothy > Pfeifer | D;3-2
qf Unger > Delk | D;7-2
qf Guerra > Chambers | D;15-8
qf King > Cummings | M;14-4
sf Unger > Timothy | D;7-2;SV1
sf Guerra > King | D;6-2
f Guerra > Unger | D;5-4
c1 Paterniti > Girtz | D;9-4
c1 Pingleton > Nauman | M;17-9
c1 True > Hayes | D;4-2;SV2
c1 DuPont > Gordon | D;10-6
c2 Paterniti > Cummings | M;14-2
c2 Pingleton > Chambers | D;9-4
c2 Delk > True | D;12-6
c2 DuPont > Pfeifer | F;2:47
cqf Pingleton > Paterniti | D;7-5;SV2
cqf Delk > DuPont | F;1:50
csf Pingleton > Timothy | F;0:46
csf Delk > King | D;10-6
3rd Delk > Pingleton | D;9-6
5th King > Timothy | D;3-1
7th Paterniti > DuPont | D;9-7""")
W['157'] = ("""
William Tedder|Mercyhurst|27-9
Dustin Teeman|Truman State|26-10
Mathias Bitz|Minnesota State Mankato|26-11
Scott Cleve|Adams State|14-6
Brad Becker|Wisconsin-Parkside|35-6
Joe Strittmatter|Pitt-Johnstown|16-12
Zachary Lee|Western State College|17-6
Austin Scarset|Augustana SD|9-4
Patrick Allibone|Nebraska-Omaha|26-5
Jared Webster|Chadron State|19-19
Kevin Kalbach|Kutztown|18-5
Jason Leavitt|Central Oklahoma|22-10
David Nordhues|Fort Hays State|18-2
Kyle Trout|Minnesota State Moorhead|11-12
Stephen Humprey|Carson-Newman|40-12
Brandon Monin|Gannon|15-11""", """
r1 Teeman > Tedder | D;9-7
r1 Cleve > Bitz | D;5-0;TB3
r1 Becker > Strittmatter | T1.5;19-3;6:56
r1 Lee > Scarset | D;3-2
r1 Allibone > Webster | F;3:27
r1 Leavitt > Kalbach | D;6-3
r1 Nordhues > Trout | M;12-4
r1 Humprey > Monin | D;6-3
qf Cleve > Teeman | D;5-3
qf Becker > Lee | D;7-6
qf Allibone > Leavitt | D;4-1
qf Nordhues > Humprey | D;7-0
sf Becker > Cleve | D;13-6
sf Nordhues > Allibone | D;2-1
f Becker > Nordhues | F;6:29
c1 Bitz > Tedder | D;6-4
c1 Scarset > Strittmatter | M;18-10
c1 Webster > Kalbach | D;3-2
c1 Monin > Trout | D;9-4
c2 Humprey > Bitz | D;2-0
c2 Scarset > Leavitt | D;3-2
c2 Lee > Webster | D;6-2
c2 Teeman > Monin | D;4-1
cqf Scarset > Humprey | D;7-1
cqf Teeman > Lee | D;3-1
csf Scarset > Cleve | D;8-6
csf Allibone > Teeman | D;5-3;TB1
3rd Allibone > Scarset | D;10-8;SV1
5th Teeman > Cleve | D;4-2
7th Humprey > Lee | D;6-1""")
W['165'] = ("""
Zach Schafer|Mercyhurst|28-6
Cody Henriksen|Augustana SD|21-9
Phil Hart|Fort Hays State|13-9
Kyle Becker|Wisconsin-Parkside|19-6
Andy Pickar|Minnesota State Mankato|24-8
Alonso Azumendi|Newberry|17-14
Cort Peterson|Central Oklahoma|29-7
Brett Hunter|Chadron State|30-9
Larry Wilbanks|Western State College|23-7
Eric Lakia|Ashland|27-8
Anthony Sayles|Gannon|9-8
Nathan Baker|Minnesota State Moorhead|25-6
Blake Peterson|Truman State|33-3
Evan Copeland|Adams State|12-12
Ross Taplin|Nebraska-Omaha|33-12
Albert Miles|Pitt-Johnstown|20-8""", """
r1 Schafer > Henriksen | F;4:25
r1 Becker > Hart | M;14-2
r1 Pickar > Azumendi | M;10-2
r1 Cort Peterson > Hunter | D;6-4
r1 Wilbanks > Lakia | D;2-0
r1 Baker > Sayles | F;1:55
r1 Blake Peterson > Copeland | M;9-0
r1 Taplin > Miles | D;5-2
qf Schafer > Becker | F;2:52
qf Cort Peterson > Pickar | D;6-3
qf Baker > Wilbanks | F;2:49
qf Taplin > Blake Peterson | D;7-5
sf Schafer > Cort Peterson | D;11-5
sf Baker > Taplin | F;3:34
f Baker > Schafer | D;10-5
c1 Henriksen > Hart | F;3:34
c1 Hunter > Azumendi | D;11-6
c1 Lakia > Sayles | D;3-2
c1 Miles > Copeland | D;7-3
c2 Henriksen > Blake Peterson | D;9-3
c2 Wilbanks > Hunter | D;3-2
c2 Pickar > Lakia | D;3-1
c2 Miles > Becker | D;7-5;SV1
cqf Henriksen > Wilbanks | M;12-4
cqf Miles > Pickar | F;1:26
csf Henriksen > Cort Peterson | D;7-5
csf Taplin > Miles | D;3-1
3rd Taplin > Henriksen | D;5-4;TB2
5th Miles > Cort Peterson | F;0:41
7th Pickar > Wilbanks | F;2:14""")
W['174'] = ("""
Eli Garshnick|Pitt-Johnstown|19-6
Matt Weingart|Chadron State|13-17
Michael Jackson|Indianapolis|18-8
Timothy Johns|Southwest State|25-6
Aaron Meister|Fort Hays State|21-6
Hudson Harrison|Mercyhurst|22-14
Travis Krinkie|Minnesota State Mankato|18-4
Albert Morgan|Wisconsin-Parkside|22-9
Jared Hess|Central Oklahoma|33-8
Clinton MacNaught|Upper Iowa|22-7
Tom Clark|West Liberty State|27-6
James Reynolds|Adams State|19-17
JD Naig|Nebraska-Omaha|28-3
Jesse Sheets|Central Missouri|13-17
Paul Sutton|Nebraska-Kearney|19-17
Quinn Tolbert|Newberry|20-10""", """
r1 Garshnick > Weingart | D;2-0
r1 Jackson > Johns | D;11-9;SV1
r1 Harrison > Meister | D;7-3
r1 Krinkie > Morgan | D;10-7
r1 Hess > MacNaught | D;2-0
r1 Clark > Reynolds | D;6-5
r1 Naig > Sheets | M;11-0
r1 Tolbert > Sutton | D;8-3
qf Jackson > Garshnick | F;1:10
qf Krinkie > Harrison | M;15-4
qf Clark > Hess | D;2-1
qf Naig > Tolbert | D;3-1
sf Jackson > Krinkie | D;9-5
sf Naig > Clark | F;4:16
f Naig > Jackson | F;6:53
c1 Johns > Weingart | D;5-4
c1 Meister > Morgan | D;4-1
c1 MacNaught > Reynolds | D;7-4
c1 Sheets > Sutton | D;10-4
c2 Tolbert > Johns | D;5-3
c2 Meister > Hess | D;3-2
c2 MacNaught > Harrison | D;7-6
c2 Sheets > Garshnick | D;6-2
cqf Meister > Tolbert | F;6:07
cqf MacNaught > Sheets | M;14-5
csf Krinkie > Meister | D;8-3
csf MacNaught > Clark | D;4-2
3rd MacNaught > Krinkie | D;13-7
5th Meister > Clark | D;3-2
7th Tolbert > Sheets | D;7-3""")
W['184'] = ("""
Mike Corcetti|Pitt-Johnstown|30-10
Ben Thiem|Wisconsin-Parkside|30-11
Nate Buys|Augustana SD|24-11
Dillon Waggoner|Western State College|16-14
Greg Nurrenbern|Truman State|33-5
Bret Wade|Kutztown|20-14
Mike Howell|Fort Hays State|17-7
Nate Oviatt|Nebraska-Omaha|17-17
John Koons|Minnesota State Mankato|27-11
Joshua Vialpondo|Adams State|9-13
Mark Murphy|Shippensburg|23-8
Nathan Jones|Carson-Newman|43-9
Tanner Linsacum|Nebraska-Kearney|26-2
Bryan Cowdin|Minnesota State Moorhead|7-7
Clinton Salisbury|Findlay|24-9
Chris Gibbs|West Liberty State|12-12""", """
r1 Corcetti > Thiem | T1.5;18-3;5:35
r1 Buys > Waggoner | D;6-3
r1 Nurrenbern > Wade | D;7-2
r1 Howell > Oviatt | D;2-1;TB1
r1 Koons > Vialpondo | M;15-1
r1 Jones > Murphy | D;5-1
r1 Linsacum > Cowdin | D;9-3
r1 Salisbury > Gibbs | D;5-0
qf Corcetti > Buys | D;11-4
qf Nurrenbern > Howell | F;1:24
qf Koons > Jones | D;7-2
qf Linsacum > Salisbury | D;9-2
sf Corcetti > Nurrenbern | D;4-3
sf Linsacum > Koons | D;6-5
f Linsacum > Corcetti | D;10-7
c1 Thiem > Waggoner | D;4-3
c1 Wade > Oviatt | D;11-5
c1 Murphy > Vialpondo | D;6-3
c1 Cowdin > Gibbs | F;5:00
c2 Salisbury > Thiem | F;1:28
c2 Jones > Wade | M;14-5
c2 Murphy > Howell | F;2:12
c2 Buys > Cowdin | D;3-1
cqf Salisbury > Jones | D;7-5
cqf Murphy > Buys | F;2:43
csf Salisbury > Nurrenbern | D;7-4
csf Murphy > Koons | F;2:28
3rd Murphy > Salisbury | F;1:17
5th Nurrenbern > Koons | M;6-2
7th Buys > Jones | F;4:57""")
W['197'] = ("""
Corey Jacoby|Shippensburg|28-5
Ben Janike|Minnesota State Mankato|14-13
Casey Woodall|Adams State|17-12
Ryan Kirst|Ashland|26-4
Tim Boldt|Augustana SD|18-0
Darryl Scott|Anderson College|13-15
John Goral|Wisconsin-Parkside|24-4
Cody Mumma|Western State College|23-9
Jeff Sylvester|Nebraska-Kearney|28-8
Heath Jolley|Central Oklahoma|25-15
Christopher Taylor|West Liberty State|23-6
Joel Wipperfurth|Southwest State|18-7
Plamen Paskalev|Central Missouri|14-0
Dustin Martin|Fort Hays State|14-16
Nick Edmonds|Nebraska-Omaha|9-20
Michael Fowler|Pitt-Johnstown|28-11""", """
r1 Jacoby > Janike | D;7-3
r1 Woodall > Kirst | D;5-4
r1 Boldt > Scott | D;8-5
r1 Mumma > Goral | D;5-4
r1 Sylvester > Jolley | M;9-0
r1 Taylor > Wipperfurth | D;9-2
r1 Paskalev > Martin | F;1:44
r1 Fowler > Edmonds | D;8-2
qf Jacoby > Woodall | D;6-0
qf Boldt > Mumma | D;9-5
qf Sylvester > Taylor | F;6:28
qf Paskalev > Fowler | F;1:03
sf Jacoby > Boldt | D;5-4
sf Paskalev > Sylvester | D;4-3
f Paskalev > Jacoby | D;5-3
c1 Kirst > Janike | D;7-3
c1 Goral > Scott | D;9-4
c1 Wipperfurth > Jolley | D;9-4
c1 Martin > Edmonds | D;3-1;TB1
c2 Kirst > Fowler | D;3-2
c2 Goral > Taylor | D;5-1
c2 Wipperfurth > Mumma | D;6-2;TB1
c2 Woodall > Martin | D;6-1
cqf Goral > Kirst | D;3-2
cqf Wipperfurth > Woodall | D;6-4
csf Boldt > Goral | D;9-4
csf Sylvester > Wipperfurth | F;0:42
3rd Sylvester > Boldt | M;11-3
5th Goral > Wipperfurth | F;1:23
7th Kirst > Woodall | M;16-5""")
W['285'] = ("""
Jacob Lininger|Shippensburg|29-3
Heath Soderstrom|Adams State|16-14
Daniel Moore|Central Missouri|24-12
Christopher Tuchscherer|Minnesota State Moorhead|19-8
Tervel Dlagnev|Nebraska-Kearney|39-8
Andrew Freas|Kutztown|12-7
Criston Bietz|Augustana SD|18-8
Jose Navarro|Indianapolis|22-7
Chris Finn|Central Oklahoma|8-5
Brian Black|Upper Iowa|16-4
Zach Majocha|Pitt-Johnstown|21-8
Charles Saguil|New Mexico Highlands|12-12
Les Sigman|Nebraska-Omaha|19-0
Josh Ohl|Ashland|23-5
Andrew Ubben|Fort Hays State|19-6
Kelly Anundson|Newberry|16-9""", """
r1 Lininger > Soderstrom | D;5-4
r1 Tuchscherer > Moore | D;4-1
r1 Dlagnev > Freas | M;17-4
r1 Bietz > Navarro | D;4-2;TB2
r1 Finn > Black | D;3-1
r1 Majocha > Saguil | D;7-1
r1 Sigman > Ohl | F;6:07
r1 Ubben > Anundson | M;13-3
qf Tuchscherer > Lininger | D;5-3
qf Dlagnev > Bietz | M;11-3
qf Finn > Majocha | RT;3-3;TB2
qf Sigman > Ubben | T1.5;17-1;7:00
sf Dlagnev > Tuchscherer | D;9-3
sf Sigman > Finn | D;3-0
f Sigman > Dlagnev | D;1-0
c1 Soderstrom > Moore | D;4-1
c1 Navarro > Freas | F;1:56
c1 Black > Saguil | M;10-1
c1 Anundson > Ohl | M;14-4
c2 Soderstrom > Ubben | D;7-2;TB1
c2 Navarro > Majocha | D;5-3
c2 Bietz > Black | D;6-1
c2 Lininger > Anundson | D;12-8
cqf Soderstrom > Navarro | D;2-1
cqf Lininger > Bietz | F;2:29
csf Soderstrom > Tuchscherer | D;6-3
csf Lininger > Finn | D;3-2
3rd Lininger > Soderstrom | M;12-2
5th Tuchscherer > Finn | D;6-0
7th Navarro > Bietz | D;6-3""")
