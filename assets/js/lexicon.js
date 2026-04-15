
import * as parser from './parse-toolbox-output.js';

const CARD_TYPE_ENTRY = false;
const CARD_TYPE_LEXEME = true;

const RE_SYNONYM_SPLITTER = /;\s*/;
const SYNONYM_JOIN = '; ';

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
const capitalize = (text='') => (text[0]?.toUpperCase() ?? '') + text.slice(1);
// const capitalizeMulti = (text) => text.replaceAll(/\b[a-z]/g, c => c.toUpperCase());
const capitalizeMulti = (text='') => text.replaceAll(/(?:^|[^\w'])([a-z])/g, c => c.toUpperCase());
// console.log(capitalizeMulti('hello world hi-ho it\'s off To Work,we;go'));

// DOM anchors
const eCopyChars = document.querySelector('#search-copy-chars');
const eSearchResults = document.querySelector('#search-results-wrapper');
const eNumResults = document.querySelector('#search-stat-num-results');
const eSearchTime = document.querySelector('#search-stat-time');
const eEntryDisplay = document.querySelector('#dictionary-entry');
// object-pooled DOM elements (reuseable)
const eSearchResultsStatus = Object.assign(document.createElement('p'), {
    classList : `search-results-status`,
    textContent : `No results...`
});

// audio
let audioPlayer = {
	player : document.createElement('audio'),
	projectPath : '', // leave blank to use relative paths
	play : (src) => {
		console.log(`Playing audio "${audioPlayer.projectPath}/${src}"`);
		audioPlayer.player.pause();
		audioPlayer.player.src = `${audioPlayer.projectPath}/${src}`;
		audioPlayer.player.play();
	}
};




//// IMPORT DATA ////

// load toolbox data
const t0_page = performance.now();
const parse = await parser.loadDatabase();
// console.log(parse);
const t1_page = performance.now();



//// INDEX DATA ////

let indexL1 = []; // index[entryId] = IndexCard{}; alphabetized by case-insensative (word,catg)
let indexL2 = [];

const IndexCard = (type,id,word='',catg='',hasAudio=false,hasImages=false) => {
    return { // typecast to harden against injection
        isLexeme : !!type, // standard entry or lexeme
        id : parseInt(id), // entry id in parse.entries[] or parse.lexemes[]
        word : new String(word),
        catg : new String(catg),
        hasAudio : !!hasAudio,
        hasImages : !!hasImages,
        domElement : null, // pointer to DOM elem in search results
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
    for (let raw of parse.entries[i].L1 ?? []) {
        const synonyms = raw.split(RE_SYNONYM_SPLITTER);
        if (synonyms.length > 1) console.error(`The word "${raw}" in L1 of entry ${i} conatined semicolon-separated words.`);
        for (let L1 of synonyms) {
            indexL1.push(
                IndexCard(CARD_TYPE_ENTRY,i,L1,parse.entries[i].catg,hasAudio,hasImages)
            );
        }
    }
    for (let raw of parse.entries[i].L2 ?? []) {
        const synonyms = raw.L2.split(RE_SYNONYM_SPLITTER);
        if (synonyms.length > 1) console.error(`The word "${raw}" in L2 of entry ${i} conatined semicolon-separated words.`);
        for (let L2 of synonyms) {
            indexL2.push(
                IndexCard(CARD_TYPE_ENTRY,i,L2,parse.entries[i].catg,hasAudio,hasImages)
            );
        }
    }
}
// index lexeme entries
for (let i = 0; i < parse.lexemes.length; i++) {
    // scan media
    let hasImages = false;
    let hasAudio = false;
    if (parse.lexemes[i].images?.length > 0) {
        hasImages = true;
        console.log(`${parse.lexemes[i].images.length} image files in lexeme-type entry ${i}`);
    }
    for (let L2 of parse.lexemes[i].L2 ?? []) {
        if (L2.audio?.length > 0) {
            hasAudio = true;
            console.log(`${L2.audio.length} audio files from wordform "${L2.L2}" in lexeme-type entry ${i}`);
            break;
        }
    }
    for (let example of parse.lexemes[i].examples ?? []) {
        if (example.audio?.length > 0) {
            hasAudio = true;
            console.log(`${example.audio.length} audio files from wordform "${example.L2}" in lexeme-type entry ${i}`);
            break;
        }
    }
    // scan words
    for (let raw of parse.lexemes[i].L1 ?? []) {
        const synonyms = raw.split(RE_SYNONYM_SPLITTER);
        if (synonyms.length > 1) console.error(`The word "${raw}" in L1 of lexeme ${i} conatined semicolon-separated words.`);
        for (let L1 of synonyms) {
            indexL1.push(
                IndexCard(CARD_TYPE_LEXEME,i,L1,parse.lexemes[i].catg,hasAudio,hasImages)
            );
        }
    }
    for (let raw of parse.lexemes[i].L2 ?? []) {
        const synonyms = raw.L2.split(RE_SYNONYM_SPLITTER);
        if (synonyms.length > 1) console.error(`The word "${raw}" in L2 of lexeme ${i} conatined semicolon-separated words.`);
        for (let L2 of synonyms) {
            indexL2.push(
                IndexCard(CARD_TYPE_LEXEME,i,L2,parse.lexemes[i].catg,hasAudio,hasImages)
            );
        }
    }
}
const t2_page = performance.now();
console.log(`Entries indexed in ${Math.round(t2_page-t1_page)} ms.`);

// alphabetize index cards by (word,catg)
indexL1.sort((a,b) => {
    const keyA = `${a.word.toLowerCase()}${SYNONYM_JOIN}${a.catg.toLowerCase()}`;
    const keyB = `${b.word.toLowerCase()}${SYNONYM_JOIN}${b.catg.toLowerCase()}`;
    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
});
console.log(indexL1);
indexL2.sort((a,b) => {
    const keyA = `${a.word.toLowerCase()}${SYNONYM_JOIN}${a.catg.toLowerCase()}`;
    const keyB = `${b.word.toLowerCase()}${SYNONYM_JOIN}${b.catg.toLowerCase()}`;
    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
});
console.log(indexL2);
const t3_page = performance.now();
console.log(`Index cards alphabetized in ${Math.round(t3_page-t2_page)} ms.`);

// build dom elems from template
for (let card of indexL1) {
    const entry = (card.isLexeme) ? parse.lexemes[card.id] : parse.entries[card.id];
    if (!entry) {
        console.error(`Index card points to ${(card.isLexeme?'lexeme ':'')}entry that doesn't exist.`, card);
        continue;
    }
    card.domElement = document.getElementById('tpl-search-result').content.firstElementChild.cloneNode(true);
    const e = card.domElement;
    e.querySelector('.search-result-catg').textContent = CATG_ABBRS[card.catg] ?? capitalize(card.catg);
    e.querySelector('.search-result-word').textContent = card.word;
    if (card.hasImages) {
        e.querySelector('.icon:nth-of-type(1)').classList.add('icon-image');
        e.querySelector('.icon:nth-of-type(1)').title = 'Has image(s)';
    }
    if (card.hasAudio) {
        e.querySelector('.icon:nth-of-type(2)').classList.add('icon-audio');
        e.querySelector('.icon:nth-of-type(2)').title = 'Has audio';
    }
    e.onclick = () => {
        console.log(`Rendering ${(card.isLexeme?'lexeme ':'')}entry ${card.id} for "${card.word}" (${card.catg})`);
        renderEntryFor(card);
    };
}
for (let card of indexL2) {
    const entry = (card.isLexeme) ? parse.lexemes[card.id] : parse.entries[card.id];
    if (!entry) {
        console.error(`Index card points to ${(card.isLexeme?'lexeme ':'')}entry that doesn't exist.`, card);
        continue;
    }
    card.domElement = document.getElementById('tpl-search-result').content.firstElementChild.cloneNode(true);
    const e = card.domElement;
    e.querySelector('.search-result-catg').textContent = CATG_ABBRS[card.catg] ?? capitalize(card.catg);
    e.querySelector('.search-result-word').textContent = card.word;
    if (card.hasImages) {
        e.querySelector('.icon:nth-of-type(1)').classList.add('icon-image');
        e.querySelector('.icon:nth-of-type(1)').title = 'Has image(s)';
    }
    if (card.hasAudio) {
        e.querySelector('.icon:nth-of-type(2)').classList.add('icon-audio');
        e.querySelector('.icon:nth-of-type(2)').title = 'Has audio';
    }
    e.onclick = () => {
        console.log(`Rendering ${(card.isLexeme?'lexeme ':'')}entry ${card.id} for "${card.word}" (${card.catg})`);
        renderEntryFor(card);
    };
}
const t4_page = performance.now();
console.log(`Search result DOM elements built in ${Math.round(t4_page-t3_page)} ms`);



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
            for (let card of indexL2) {
                card.domElement.classList.remove('hidden');
                eSearchResults.appendChild(card.domElement);
            }
        } else {
            for (let card of indexL1) {
                card.domElement.classList.remove('hidden');
                eSearchResults.appendChild(card.domElement);
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
            for (let card of indexL2) {
                if (RE_PATTERN.test(card.word.toLowerCase())) {
                    numMatches++;
                    card.domElement.classList.remove('hidden');
                } else {
                    card.domElement.classList.add('hidden');
                }
            }
        } else {
            for (let card of indexL1) {
                if (RE_PATTERN.test(card.word.toLowerCase())) {
                    numMatches++;
                    card.domElement.classList.remove('hidden');
                } else {
                    card.domElement.classList.add('hidden');
                }
            }
        }
        if (numMatches === 0) {
            eSearchResultsStatus.classList.remove('hidden');
        } else {
            eSearchResultsStatus.classList.add('hidden');
        }
        const dt = Math.round(performance.now()-t0_filter);
        console.log(`Found ${numMatches} matches in ${dt} ms.`);
        eNumResults.textContent = `${numMatches}/${(search.toggleLang)?indexL2.length:indexL1.length} entries`;
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



//// ENTRY DISPLAY ////

const renderEntryFor = (card) => {
    const entry = (card.isLexeme) ? parse.lexemes[card.id] : parse.entries[card.id];
    if (!entry) {
        console.warn(`Card does not point to a valid ${(card.isLexeme?'lexeme ':'')}entry. Nothing to render.`);
        return;
    }
    // console.log(entry);
    // header (L1, catg, headword)
    eEntryDisplay.querySelector('.entry-L1').textContent = entry?.L1.join(SYNONYM_JOIN) || '[no English translation]';
    eEntryDisplay.querySelector('.entry-catg').textContent = entry.catg || '[no catg]';
    eEntryDisplay.querySelector('.entry-headword').textContent = entry?.L2[0]?.L2 || '[no Wikchamni headword]';
    // L2 wordforms
    if (entry.L2.length > 0) {
        eEntryDisplay.querySelector('.entry-words').textContent = '';
        for (let wordform of entry.L2 ?? []) {
            console.log(`"${wordform.L2}" has form "${wordform.form}"`);
            const e = document.getElementById('tpl-entry-L2').content.firstElementChild.cloneNode(true);
            // console.log(wordform.form);
            e.querySelector('.entry-L2-form').textContent = parser.getWordformName(wordform.form) || capitalizeMulti(wordform.form) || 'Unknown';
            e.querySelector('.entry-L2-word').textContent = wordform.L2 || '[no Wikchamni translation]';
            if (wordform.audio?.length > 0) {
                for (let audio of wordform.audio) {
                    e.appendChild(
                        Object.assign(document.createElement('button'), {
                            classList : 'icon icon-audio',
                            title : audio || '[blank or missing audio]',
                            onclick : () => {
                                console.log(`Play audio "${audio}"`);
                            }
                        })
                    );
                }
            }
            eEntryDisplay.querySelector('.entry-words').appendChild(e);
        }
    } else {
        eEntryDisplay.querySelector('.entry-words').textContent = '[no Wikchamni wordforms]';
    }
    // L2 examples
    if (entry.L2.length > 0) {
        eEntryDisplay.querySelector('.entry-examples').textContent = '';
        for (let example of entry.examples ?? []) {
            const e = document.getElementById('tpl-entry-example').content.firstElementChild.cloneNode(true);
            e.querySelector('.entry-example-L1').textContent = example.L1 || '[no English translation]';
            e.querySelector('.entry-example-L2').textContent = example.L2 || '[no Wikchamni translation]';
            if (example.audio?.length > 0) {
                for (let audio of example.audio) {
                    e.querySelector('.flex-row-centered').appendChild(
                        Object.assign(document.createElement('button'), {
                            classList : 'icon icon-audio',
                            title : audio || '[blank or missing audio]',
                            onclick : () => {
                                console.log(`Play audio "${audio}"`);
                            }
                        })
                    );
                }
            }
            eEntryDisplay.querySelector('.entry-examples').appendChild(e);
        }
    } else {
        eEntryDisplay.querySelector('.entry-examples').textContent = '[no examples]';
    }
    // related words
    eEntryDisplay.querySelector('.entry-lexemes').textContent = '';

    // TODO: display case names
    // TOOD: display lexeme / not lexeme indicator
    // TODO: display images
    // TODO: if standard entry, display lexeme(s)
    // TODO: if lexeme entry, L2 words link to entry (if available, else red text)
};



//// INIT ////

search.domElement.value = ''; // need to reset input text, since we can't save begins-contains-ends state
search.populate();
// search.filter();

const t5_page = performance.now();
eNumResults.textContent = `${(search.toggleLang)?indexL2.length:indexL1.length} entries`;
eSearchTime.textContent = `Loaded in ${Math.round(t5_page-t4_page)/1000} sec`;



console.log(`All loading done in ${Math.round(performance.now()-t0_page)} ms`);