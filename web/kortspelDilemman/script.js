const allQuotes = [
  "Ni har precis bytt ett av IT-systemen och det har varit mycket problem och buggar i början. Nu behöver många enheter anpassa sitt arbetsätt för att systemet ska vara till hjälp. Hur agerar du?",
  "Du överhör en diskussion kring ett arbetsproblem på en annan avdelningen. Du har en bra lösning på problemet men vet att den som är ansvarig inte gärna tar hjälp, speciellt inte från någon annan avdelning. Vad gör du?",
  "Du är processledare och upplever att halva processgänget är framåtlutat och vill, medan andra halvan är mer tillbakalutade och avvaktande. Vad gör du?",
  "Du ska göra klart en arbetsuppgift med en kollega som är försenad. När kollegan kommer säger hen att ni kan strunta i ett viktigt moment för att hinna klart och att det ändå inte märks. Hur agerar du?",
  "Ni ska starta upp arbetet med en ny process och du inser snart att alla har helt olika förväntningar på vad ni tillsammans ska åstadkomma. Vad gör du?",
  "Ni har många möten på jobbet, så många att flera personer har börjat tappa respekten för mötestider. Vissa fastnar vid kaffemaskinen precis innan och andra tar tillfället i akt att prata med en kollega om helgen, och resultatet blir att möten aldrig startar i tid. Hur agerar du?",
  "Om två dagar har du en deadline på ett stort arbete och du är ansvarig. Du vet att du inte kommer att hinna klart. Vad gör du?",
  "Processägaren i en process du är involverad i berättar att ni behöver utveckla processens kvalitet betydligt. Du inser att det kommer att innebära en stor arbetsbelastning för dig framgent och börjar redan känna stress. Hur agerar du?",
  "Din chef vill att du tar dig an en ny arbetsuppgift i en process som inte ligger inom ditt kompetensområde. Vad gör du?",
  "Du ska ta över en arbetsuppgift från en kollega som har lovat att skriva en uppdaterad manual till dig. Det visar sig att det bara finns en gammal manual som du inte kan använda och kollegan går inte att nå. Hur agerar du?",
  "Du ingår numera i ett processteam med representanter från olika enheter. Ni ska nu lösa ut ett flöde som tidigare präglats av samarbetsproblem. Hur agerar du?",
  "Du kommer tillbaka från din sommarsemester och får veta att några av dina arbetsuppgifter i process X har tagits över av någon annan. Du får veta detta genom ett kort mail från din chef som avslutas med vi pratar mer om det på torsdag. Hur agerar du?",
  "När ni pratar om hur ni vill ha det tillsammans i processgruppen sitter en kollega bara tyst och deltar inte i dialogen. Hur reagerar du?",
  "Du märker frustration i gruppen då processledaren är väldigt otydlig i kommunikationen gällande vad processen syftar till och vad arbetet ska gå ut på. Vad gör du?",
  "Du blir tilldelad en ny arbetsuppgift som innebär att du måste använda ett gammalt och trögt system alt en seg arbetsprocess. Du har idéer om hur systemet/arbetsprocessen skulle kunna fräschas upp och framförallt snabbas upp, men själva utvecklingen skulle ta en del tid. Hur agerar du?",
  "Som processledare upplever du att medarbetarnas chef informerar dem om saker som rör processen som du helst skulle vilja ha kommunicerat till dem, det vill säga rundar dig som processledare. Vad gör du?",
  "Du är inblandad i flera processer och en av processledarna har otroligt hög ambitionsnivå i en process som du själv bedömer är av ringa vikt. Hur agerar du?",
  "Din kollega i processteamet som alltid varit glad och med på fikarasterna har börjat att drar sig undan och jobbar vidare när övriga går och fikar. Hur agerar du?",
  "Dina kollegor pratar negativt om en leverans från en annan enhet som ni är beroende av för att kunna lösa er del av processen. Du frågar om de feedbackat detta till berörda personer varpå de svarar nej. Vad gör du?",
  "Du är i kontakt med en rektor och förstår att det stöd som rektorn får i en process du inte arbetar i inte är samordnat eller utgår från rektorns behov. Hur agerar du?",
  "Du får höra att en kollega på annan enhet har synpunkter på den leverans som du och dina kollegor gör i en process. Hur agerar du?",
  "Du har en kollega i processteamet som tenderar att ta på sig för mycket, säkert i all välmening, men det resulterar i bristande leverans. Hur agerar du?",
  "Du upplever ofta att dina närmaste kollegor pratar om den egna arbetsgruppen som lite bättre än andra arbetsgrupper på förvaltningen. Vad gör du?",
  "En kollega har starka åsikter om processledarens roll och vad hen borde ta ansvar för men har inte kommunicerat det till processledaren. Vad gör du?",
  "Du deltar i en processgrupp men upplever att din chef har synpunkter på vad ni kommer fram till i gruppen. Hur agerar du?",
  "Du har en kollega som alltid säger emot när du kommer med nya förslag, det är uppenbart att hen inte ser samma möjligheter som du. Hur agerar du?",
  "Du upplever att din processledare och din chef inte har samma uppfattning om vad ditt bidrag i en processgrupp bör vara. Hur agerar du?",
  "Det har under en längre tid varit dålig stämning i er processgrupp och nu har det gått så långt att arbetsuppgifterna blir lidande. Vad gör du?",
  "Du leder ett processmöte när en av mötesdeltagarna tar fram sin mobil och ägnar sig åt den istället för att fokusera på mötet. Hur agerar du?",
  "Du ber en kollega om hjälp och får ett tydligt nej till svar, trots att du vet att personen både kan och egentligen ska hjälpa dig med detta. Hur agerar du?",
  "Du hör att en av era chefer i ledningsgruppen nedvärderar satsningen på processbaserat arbetssätt. Vad gör du?",
  "Du upplever att engagemanget i din processgrupp varierar och uppgifter som andra tilldelats blir inte gjorda och hamnar ofta i ditt knä. Hur agerar du?",
  "Du har bett en kollega att ta en arbetsuppgift som delas i arbetsgruppen. Tiden går och du märker att inget händer. Hur agerar du?",
  "Du har en kollega som alltid reagerar negativt på nya rutiner eller att-göra-listor, hur agerar du?",
  "Ni är inne i en stressig period med väldigt mycket att göra. Ingen av dina kollegor vill ta några initiativ. Hur agerar du?",
  "Din kollega har utfört en arbetsuppgift där du ser tydliga brister som kommer att innebära att nästa del av processen blir lidande. Hur agerar du?",
  "Din chef vill inte delegera uppgifter utan är själv ganska operativ.  Du känner att du vill utvecklas mer i din roll och skulle vilja få mer förtroende, vad gör du?",
  "Du har en kollega som tycker vissa uppgifter är tråkigare än andra och du märker att hen konsekvent undviker de uppgifterna. Hur agerar du?",
  "Du är processledare och ber en av processteamets medlemmar att hjälpa till med en brådskande arbetsuppgift. Hen hänvisar till att hen bara tar uppdrag från sin chef, vad gör du?",
  "En kollega som du samarbetar med inom en process är väldigt inriktad på enbart sin egen del av processen. Du upplever att hen brister i förståelse för hur de olika delarna påverkar varandra. Hur gör du?",
  "Du och dina kollegor diskuterar problem under ett processmöte. Alla håller med om att det behövs förbättring, men ni vet inte i vilken ände ni ska börja. Hur agerar du?",
  "Din processledare är ofta otydlig och ger inte processgruppen den information ni behöver. Hur agerar du?",
  "Processledaren i en process du arbetar med är ambitös. Du tycker att hen tar ansvar också för sådant som egentligen inte hör till processen. Vad gör du?",
  "Din kollega på en annan enhet säger att hen har slutfört en uppgift som behöver vara klar för att du ska kunna jobba vidare med din del av processen. Du upptäcker sen att uppgiften inte är gjord. Hur agerar du?",
  "Ni har utbildning i processbasert arbetssätt och under ett grupparbete passar några i gruppen på att diskutera allmänt missnöje istället för att fokusera på uppgiften. Hur agerar du?",
  "Din chef (och/eller processledare) ger dig aldrig feedback och du känner att du står still i din utveckling. Vad gör du?",
  "Du har många nya och svåra arbetsuppgifter som du behöver stöttning i. Uppgifterna är knuten till en process som chefen inte är så insatt i. Vad gör du?",
  "En kollega har ofta svårt att hålla deadlines, hen säger att hen inte får rätt förutsättningar. Vad gör du?",
  "Du håller inte med om ett beslut som är taget men måste ändå arbeta efter det, hur agerar du?",
  "Du vet att en kollega alltid kommer sent och att detta drabbar många i din processgrupp. Processledaren agerar inte trots att ni tagit upp detta, vad gör du?",
  "Du upplever att en kollega i processgruppen som är från en annan avdelning alltid tar över möten, hörs alltid mest och får alltid komma till tals. Vad gör du?",
  "Du får en uppgift av din processledare som du känner att du inte kommer klara av själv. Hur gör du?",
  "Processägaren meddelar vilka processmål som ska uppfyllas detta år och på vilket sätt det ska göras. Du undrar varför inte processgruppen har fått vara med och diskutera. Vad gör du?",
  "Du leder en process. Du har ansvar över leverans och kvalité och leder övriga. Dock så kliver din chef frekvent in och tar beslut åt dig. Hur agerar du?",
  "Du upplever att din chef inte har kännedom om det stora ansvar du tar inom en process som du ingår i och är orolig över att din prestation där inte är synlig för chefen. Vad gör du?",
  "Du har en kollega som ofta kommenterar oväsentliga saker på möten. Kollegan pratar mycket och frågar om sånt som andra tycker är självklart. Det tar mycket tid och det blir svårt att få konstruktiva och effektiva möten. Vad gör du?",
  "En kollega kommer till dig och ber om hjälp och råd att lösa en situation som denne själv har skapat genom bristfälligt arbete. Kollegan är själv inte medveten om vad som har gått snett och du har egentligen inte tid att hjälpa till. Vad gör du?",
  "Din processledare har missat en deadline och hänger ut dig inför hela arbetsgruppen. Processledaren hävdar att du inte har levererat i tid och därmed fått gruppen att missa sin deadline. Du har däremot aldrig fått en förfrågan om att leverera något och är helt oförstående till anklagelsen. Vad gör du?",
  "Det presenteras nya förändringsarbeten inom organisationen som kommer innebära stora skillnader i verksamheten. Det blir mycket nytt att ta hänsyn till men processer kommer att förbättras och effektiviseras. Du ser fram emot förändringen men märker att flera kollegor reagerar negativt. Vad gör du?",
  "Du har bett din chef om att få utvecklas och fördjupa dig i nya abetsuppgifter. Trots detta tilldelas du bara uppgifter inom det du redan kan och är bra på. Vad gör du?",
];

const text = document.getElementById("quote");
const next = document.getElementById("next");

next.onclick = getNewQuote;

function getNewQuote() {
    const indx = Math.floor(Math.random() * allQuotes.length);
    const quote = allQuotes[indx];
    text.innerHTML = quote;
}

getNewQuote();
