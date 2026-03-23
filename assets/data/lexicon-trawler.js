
/*
// 2.0 hrs: analyze lexicon layout and design data structures
// 1.0 hrs: copy data and begin parsing

lpLexEntryName id: entry id of form \e0-9+\
lpLexEntryName: main word
lpPartOfSpeech: part of speech abrv, with period
lpPartOfSpeech->lpGlossEnglish: part of speech abrv -> definition or affix function (ex "plural")

lpExample->lpGlossEnglish: wikchamni sentence -> english translation
lpMiniHeading->lpParadigm: `{tense}: ` -> word form OR `underlying form: ` -> underlying word form
	!!! there are duplicates; found entry with 5 distinct word forms all labled "causative"

lpMorph: morphology notes (ex "genitive case")
lpMainCrossRef: variant (ex "-ak'" vs "-ik'")
lpNotes_phonology: phonology notes (ex. "voiceless final vowel [ḁ]")
lpBorrowedWord: note indicating source word/language
lpNotes_general: misc notes clarifying, making ling connections, or providing cultural context



Images:
	- separate <p> containing <img>
	- file names are arbitrary (not based on exact entry contents)
	- few enough that we can manually index easily
Audio:
	- inline hidden <audio> followed by inline <a onclick='audio.play()'>
	- some file names are exact english gloss, others are arbitrary
	- programmatically build index and rename files?
Links:
	- inline <a title='Search with Google' href='google.com/search?q=...'>
	- detectable with title
*/

let entries = document.querySelectorAll('p.lpLexEntryPara');
entries.forEach(p => {
	const text = p.textContent;
	console.log()
});