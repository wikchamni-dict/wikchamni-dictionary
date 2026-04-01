
import * as lexicon from './parse-toolbox-output.js';



// load toolbox data
const parse = await lexicon.loadDatabase();
console.log(parse);



let indexL1 = {};
let indexL2 = {};
let orderedL1 = [];
let orderedL2 = [];

// index data for fast searching
const IndexCard = (word='',catg='',hasAudio=false,hasImages=false) => {
    return { // cast as string to harden against injection
        word : new String(word),
        catg : new String(catg),
        entries : new Set(),
        lexemes : new Set(),
        hasAudio : hasAudio,
        hasImages : hasImages,
        domElement : null, // pointer to entry in search results
    }
};
// index standard entries
for (let i = 0; i < parse.entries.length; i++) {
    // scan media
    let hasImages = false;
    let hasAudio = false;
    if (parse.entries[i].images?.length > 0) hasImages = true;
    for (let L2 of parse.entries[i].L2 ?? []) {
        if (L2.audio?.length > 0) {
            hasAudio = true;
            break;
        }
    }
    for (let example of parse.entries[i].examples ?? []) {
        if (example.audio?.length > 0) {
            hasAudio = true;
            break;
        }
    }
    // scan words
    for (let L1 of parse.entries[i].L1 ?? []) {
        // access is 1-deep, with non-arbitrary value
        if (!indexL1[L1]) indexL1[L1] = IndexCard(L1, parse.entries[i].catg, hasAudio, hasImages);
        indexL1[L1].entries.add(i);
    }
    for (let wordform of parse.entries[i].L2 ?? []) {
        if (!indexL2[wordform.L2]) indexL2[wordform.L2] = IndexCard(wordform.L2, parse.entries[i].catg, hasAudio, hasImages);
        indexL2[wordform.L2].entries.add(i);
    }
}
// index lexeme entries
for (let i = 0; i < parse.lexemes.length; i++) {
    for (let L1 of parse.entries[i].L1 ?? []) {
        // access is 1-deep, with non-arbitrary value
        if (!indexL1[L1]) indexL1[L1] = IndexCard(L1, parse.entries[i].catg);
        indexL1[L1].entries.add(i);
    }
    for (let wordform of parse.lexemes[i].L2 ?? []) {
        if (!indexL2[wordform.L2]) indexL2[wordform.L2] = IndexCard(wordform.L2, parse.entries[i].catg);
        indexL2[wordform.L2].lexemes.add(i);
    }
}
// sort index cards alphabetically (case insensative)
orderedL1 = Object.keys(indexL1).sort((a,b) => a.toLowerCase() > b.toLowerCase());
console.log(`Ordered L1:`, orderedL1);
orderedL2 = Object.keys(indexL2).sort((a,b) => a.toLowerCase() > b.toLowerCase());
console.log(`Ordered L2:`, orderedL2);
// TODO: build dom elems from template



// coverage check
let numWordsNoLexeme = 0; // in entry but not lexeme
let numWordsNoEntry = 0; // in lexeme but not entry
let wordsNoLexeme = new Set();
let wordsNoEntry = new Set();
let wordsDuped = new Set();
for (let word in indexL2) {
    if (indexL2[word].lexemes.size === 0 && indexL2[word].entries.size > 0) {
        numWordsNoLexeme++;
        wordsNoLexeme.add(word);
    }
    if (indexL2[word].entries.size === 0 && indexL2[word].lexemes.size > 0) {
        numWordsNoEntry++;
        wordsNoEntry.add(word);
    }
    if (indexL2[word].entries.size > 1 || indexL2[word].lexemes.size > 1) {
        wordsDuped.add(word);
    }
}
console.log(indexL2);
console.log(`Words no lexeme:`,wordsNoLexeme);
console.log(`Words no entry:`,wordsNoEntry);
console.log(`Words duplicated:`,wordsDuped);
console.log(`Indexed ${Object.keys(indexL2).length} uniq words. ${numWordsNoEntry} never appeared in an entry, and ${numWordsNoLexeme} never appeared in a lexeme. ${wordsDuped.size} appeared in more than one entry or more than one lexeme.`);


