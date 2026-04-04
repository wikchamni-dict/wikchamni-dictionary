
import * as parser from './parse-toolbox-output.js';

// data
const CATG_ABBRS = Object.freeze({
    'n-theme' : 'N-Thm',
    'prn-theme' : 'P-Thm',
    'v-theme' : 'V-Thm',
    'v-base' : 'VB',
});
const COPYABLE_CHARS = Object.freeze(['č','ŋ','š','ṭ','ʔ','ʰ','ə','ɨ','·']);
const MSG_COPY_CHAR = `Click to insert, shift+click to copy.`;
const CHAR_PRONUNCIATION = Object.freeze({
    'č' : `[č] is pronounced like the "ch" in "church".`,
    'ŋ' : `[ŋ] is pronounced like the "ng" in "sing".`,
    'š' : `[š] is pronounced like the "sh" in "shirt".`,
    'ṭ' : `[ṭ] is pronounced like the "tr" in "train".`,
    'ʔ' : `[ʔ] is pronounced like the break between sounds in "uh-oh".`,
    'ʰ' : `[ʰ] makes the previous consonant aspirated. You should feel a puff of air in front of your lips while saying [tʰap], but not [tap].`,
    'ə' : `[ə] is pronounced like the "e" in "egg", but with rounded lips.`,
    'ɨ' : `[ɨ] is pronounced like the "i" in "big", but with rounded lips.`,
    '·' : `[·] makes the previous vowel twice as long.`,
});
// helpers
const capitalize = (text) => (text[0]?.toUpperCase() ?? '') + text.slice(1);
// const capitalizeMulti = (text) => text.replaceAll(/\b[a-z]/g, c => c.toUpperCase());

// DOM anchors
const eCopyChars = document.querySelector('#search-copy-chars');
const eSearchResults = document.querySelector('#search-results-wrapper');
const eNumResults = document.querySelector('#search-stat-num-results');
const eSearchTime = document.querySelector('#search-stat-time');
// object-pooled DOM elements (reuseable)
const eSearchResultsStatus = Object.assign(document.createElement('p'), {
    classList : `search-results-status`,
    textContent : `No results...`
});




//// IMPORT DATA ////

// load toolbox data
const t0_page = performance.now();
const parse = await parser.loadDatabase();
// console.log(parse);
const t1_page = performance.now();



//// INDEX DATA ////

let indexL1 = {}; // index['word'] = IndexCard
let indexL2 = {};
let orderedL1 = []; // alphabetized array of uniq words (case-insensative)
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
const t0_index = performance.now();
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
orderedL1 = Object.keys(indexL1).sort(
    (a,b) => {
        a = a.toLowerCase();
        b = b.toLowerCase();
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    }
);
console.log(`Ordered L1:`, orderedL1);
orderedL2 = Object.keys(indexL2).sort(
    (a,b) => {
        a = a.toLowerCase();
        b = b.toLowerCase();
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    }
);
console.log(`Ordered L2:`, orderedL2);
const t1_index = performance.now();
console.log(`Data indexed in ${Math.round(t1_index-t0_index)} ms`);
// build dom elems from template
for (let word in indexL1) {
    indexL1[word].domElement = document.getElementById('tpl-search-result').content.firstElementChild.cloneNode(true);
    const card = indexL1[word];
    const e = indexL1[word].domElement;
    e.querySelector('.search-result-catg').textContent = CATG_ABBRS[card.catg] ?? capitalize(card.catg);
    e.querySelector('.search-result-word').textContent = card.word;
    if (card.hasImages) e.querySelector('.icon:nth-of-type(1)').classList.add('icon-dbg');
    if (card.hasAudio) e.querySelector('.icon:nth-of-type(2)').classList.add('icon-dbg');
}
for (let word in indexL2) {
    indexL2[word].domElement = document.getElementById('tpl-search-result').content.firstElementChild.cloneNode(true);
    const card = indexL2[word];
    const e = indexL2[word].domElement;
    e.querySelector('.search-result-catg').textContent = CATG_ABBRS[card.catg] ?? capitalize(card.catg);
    e.querySelector('.search-result-word').textContent = card.word;
    if (card.hasImages) e.querySelector('.icon:nth-of-type(1)').classList.add('icon-dbg');
    if (card.hasAudio) e.querySelector('.icon:nth-of-type(2)').classList.add('icon-dbg');
}
const t2_index = performance.now();
console.log(`Search results cards built in ${Math.round(t2_index-t1_index)} ms`);



// // coverage check
// let numWordsNoLexeme = 0; // in entry but not lexeme
// let numWordsNoEntry = 0; // in lexeme but not entry
// let wordsNoLexeme = new Set();
// let wordsNoEntry = new Set();
// let wordsDuped = new Set();
// for (let word in indexL2) {
//     if (indexL2[word].lexemes.size === 0 && indexL2[word].entries.size > 0) {
//         numWordsNoLexeme++;
//         wordsNoLexeme.add(word);
//     }
//     if (indexL2[word].entries.size === 0 && indexL2[word].lexemes.size > 0) {
//         numWordsNoEntry++;
//         wordsNoEntry.add(word);
//     }
//     if (indexL2[word].entries.size > 1 || indexL2[word].lexemes.size > 1) {
//         wordsDuped.add(word);
//     }
// }
// console.log(indexL2);
// console.log(`Words no lexeme:`,wordsNoLexeme);
// console.log(`Words no entry:`,wordsNoEntry);
// console.log(`Words duplicated:`,wordsDuped);
// console.log(`Indexed ${Object.keys(indexL2).length} uniq words. ${numWordsNoEntry} never appeared in an entry, and ${numWordsNoLexeme} never appeared in a lexeme. ${wordsDuped.size} appeared in more than one entry or more than one lexeme.`);



//// SEARCH ////

const SEARCH_PATTERN_BEGINS = 0;
const SEARCH_PATTERN_CONTAINS = 1;
const SEARCH_PATTERN_ENDS = 2;
const SEARCH_LANG_L1 = false;
const SEARCH_LANG_L2 = true;

let search = {
    domElement : document.querySelector('#searchbar'),
    pattern : SEARCH_PATTERN_BEGINS,
    toggleLang : SEARCH_LANG_L1,
    populate : () => {
        eSearchResults.textContent = '';
        if (search.toggleLang) {
            for (let word of orderedL2) {
                indexL2[word].domElement.classList.remove('hidden');
                eSearchResults.appendChild(indexL2[word].domElement);
            }
        } else {
            for (let word of orderedL1) {
                indexL1[word].domElement.classList.remove('hidden');
                eSearchResults.appendChild(indexL1[word].domElement);
            }
        }
        eSearchResultsStatus.classList.add('hidden');
        eSearchResults.appendChild(eSearchResultsStatus);
    },
    filter : () => {
        const t0_filter = performance.now();
        let pattern = RegExp.escape(search.domElement.value);
        if (search.pattern === SEARCH_PATTERN_BEGINS) pattern = `^${pattern}`;
        if (search.pattern === SEARCH_PATTERN_ENDS) pattern = `${pattern}$`;
        const RE_PATTERN = new RegExp(pattern);
        let numMatches = 0;
        if (search.toggleLang) {
            for (let word of orderedL2) {
                if (RE_PATTERN.test(word)) {
                    numMatches++;
                    indexL2[word].domElement.classList.remove('hidden');
                } else {
                    indexL2[word].domElement.classList.add('hidden');
                }
            }
        } else {
            for (let word of orderedL1) {
                if (RE_PATTERN.test(word)) {
                    numMatches++;
                    indexL1[word].domElement.classList.remove('hidden');
                } else {
                    indexL1[word].domElement.classList.add('hidden');
                }
            }
        }
        if (numMatches === 0) {
            eSearchResultsStatus.classList.remove('hidden');
        } else {
            eSearchResultsStatus.classList.add('hidden');
        }
        console.log(eSearchResultsStatus);
        const dt = Math.round(performance.now()-t0_filter);
        console.log(`Found ${numMatches} matches in ${dt} ms.`);
        eNumResults.textContent = `${numMatches}/${(search.toggleLang)?orderedL2.length:orderedL1.length} matches`;
        eSearchTime.textContent = `${dt/1000} sec`;
    },
    clear : () => {
        search.domElement.value = '';
        search.domElement.focus();
        search.filter();
    }
};
search.domElement.addEventListener('input', evt => {
    search.filter();
});

// search patterns
const setSearchPattern = (pattern) => {
    if (search.pattern === pattern) return;
    if (pattern !== SEARCH_PATTERN_BEGINS && pattern !== SEARCH_PATTERN_ENDS) pattern = SEARCH_PATTERN_CONTAINS;
    search.pattern = pattern;
    // render search pattern UI
    if (search.pattern === SEARCH_PATTERN_BEGINS) {
        document.querySelector('#search-pattern-begins').classList.add('active');
        document.querySelector('#search-pattern-contains').classList.remove('active');
        document.querySelector('#search-pattern-ends').classList.remove('active');
    } else if (search.pattern === SEARCH_PATTERN_ENDS) {
        document.querySelector('#search-pattern-begins').classList.remove('active');
        document.querySelector('#search-pattern-contains').classList.remove('active');
        document.querySelector('#search-pattern-ends').classList.add('active');
    } else {
        document.querySelector('#search-pattern-begins').classList.remove('active');
        document.querySelector('#search-pattern-contains').classList.add('active');
        document.querySelector('#search-pattern-ends').classList.remove('active');
    }
    // perform search
    search.filter();
}
document.querySelector('#search-pattern-begins').onclick = () => setSearchPattern(SEARCH_PATTERN_BEGINS);
document.querySelector('#search-pattern-contains').onclick = () => setSearchPattern(SEARCH_PATTERN_CONTAINS);
document.querySelector('#search-pattern-ends').onclick = () => setSearchPattern(SEARCH_PATTERN_ENDS);

// search actions
const setSearchLang = (useL2) => {
    if (!!useL2 === !!search.toggleLang) return;
    search.toggleLang = (useL2) ? SEARCH_LANG_L2 : SEARCH_LANG_L1;
    if (search.toggleLang) {
        document.querySelector('#search-lang-L1').classList.remove('active');
        document.querySelector('#search-lang-L2').classList.add('active');
    } else {
        document.querySelector('#search-lang-L1').classList.add('active');
        document.querySelector('#search-lang-L2').classList.remove('active');
    }
    search.domElement.value = '';
    search.populate();
    // search.filter(); // unnecessary; search.populate() sets all to visible
};
document.querySelector('#search-lang-L1').onclick = () => setSearchLang(SEARCH_LANG_L1);
document.querySelector('#search-lang-L2').onclick = () => setSearchLang(SEARCH_LANG_L2);
document.querySelector('#search-clear').onclick = () => search.clear();

// quick-copy bar
eCopyChars.textContent = '';
for (let c of COPYABLE_CHARS) {
    let e = document.createElement('button');
    e.textContent = c;
    e.title = `${MSG_COPY_CHAR} ${CHAR_PRONUNCIATION[c] ?? `[${c}]`}`;
    e.onclick = (evt) => {
        console.log(c);
        search.domElement.value = search.domElement.value + c;
        search.domElement.focus();
        search.filter();
    };
    eCopyChars.appendChild(e);
}



//// INIT ////

search.domElement.value = '';
search.populate();

const t2_page = performance.now();
eNumResults.textContent = `${(search.toggleLang)?orderedL2.length:orderedL1.length} matches`;
eSearchTime.textContent = `Loaded in ${Math.round(t2_page-t1_page)/1000} sec`;



console.log(`All loading done in ${Math.round(performance.now()-t0_page)} ms`);