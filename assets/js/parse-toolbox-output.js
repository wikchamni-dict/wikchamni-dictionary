
const RE_MDF_TOKEN = /^\\([^\s]+)(?: ([^\n]*))?$/;
const RE_SYNONYM_SPLITTER = /;\s*/;
const SYNONYM_JOIN = '; ';

//// TOKEN INVENTORY /////////////////////

//// standard entries ////

// entry headword
const TOKEN_NEW_ENTRY = 'lx'; // L2 headword
const TOKEN_GLOSS_L1 = 'ge'; // L1 translation of headword
const TOKEN_DEFINITION_L1 = 'de'; // also L1 translation of headword
// entry data
const TOKEN_CATG = 'ps';
const TOKEN_LAST_EDIT = 'dt';
const TOKEN_MORPHOLOGY = 'mr'; // in x-theme entries this is an actual morphology note; for everything else, it's the name of the headword's grammatical case
// alternates
const TOKEN_WORD_SENSE = 'sn'; // L2 headword is homophone/homograph of multiple L1 words
const TOKEN_VARIANT = 'va'; // spelling variation of previous run-starter
const TOKEN_ALTERNATION = 'a'; // also spelling variation of previous run-starter
// examples
const TOKEN_EXAMPLE_L2 = 'xv'; // L2 example
const TOKEN_EXAMPLE_L1 = 'xe'; // L1 translation of example
const TOKEN_LITERAL_MEANING = 'lt'; // L1 literal meaning of last L2 wordform
// links to other entries
const TOKEN_CROSS_REFERENCE = 'cf'; // contains headword of related entry from another lexeme
const TOKEN_MAIN_ENTRY = 'mn'; // contains headword of main entry, which current headword is related subentry of
// notes
const TOKEN_NOTE = 'nt';
const TOKEN_NOTE_ANTHROPOLOGY = 'na';
const TOKEN_NOTE_DISCUSSION = 'nd';
const TOKEN_NOTE_GRAMMAR = 'ng';
const TOKEN_NOTE_PHONETIC = 'np';
const TOKEN_NOTE_SCIENTIFIC_CLASSIFICATION = 'sc';
const TOKEN_NOTE_ENCYLOPEDIA_ENTRY = 'ee';
const TOKEN_NOTE_BORROWED_WORD = 'bw';
// media
const TOKEN_MEDIA_AUDIO = 'sfx';
const TOKEN_MEDIA_AUDIO_HEADWORD = 'sf';
const TOKEN_MEDIA_IMAGE = 'pc';



//// lexeme entries ////

// paradigms are used by x-theme and v-base entries to label grammatical cases of L2 wordforms in a lexeme
const TOKEN_PARADIGM_UNDERLYING = 'u';

// v-base and v-theme paradigms (single attribute)
const TOKEN_PARADIGM_INDIRECTIVE = 'ind';
const TOKEN_PARADIGM_CAUSATIVE = 'caus';
const TOKEN_PARADIGM_IMPERATIVE = 'imp';
const TOKEN_PARADIGM_DESIDERATIVE = 'des';
const TOKEN_PARADIGM_DUBITATIVE = 'dub';
const TOKEN_PARADIGM_DURATIVE = 'dur';
const TOKEN_PARADIGM_AORIST = 'aor';
const TOKEN_PARADIGM_FUTURE = 'fut';
const TOKEN_PARADIGM_REPETITIVE = 'rep';
const TOKEN_PARADIGM_DISTRIBUTIVE = 'dist';
const TOKEN_PARADIGM_MEDIO_PASSIVE = 'm-pass';
const TOKEN_PARADIGM_PASSIVE = 'pass';
const TOKEN_PARADIGM_RETARDATIVE = 'ret';
const TOKEN_PARADIGM_ABSOLUTIVE = 'abs';
const TOKEN_PARADIGM_ADJUNCTIVE = 'adj';
const TOKEN_PARADIGM_CONTINUATIVE = 'cont';
// v-base and v-theme paradigms (multi attribute)
const TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL = 'r-r';
const TOKEN_PARADIGM_DURATIVE_PRESENT = 'd-pres';
const TOKEN_PARADIGM_DURATIVE_AORIST = 'd-aor';
const TOKEN_PARADIGM_PASSIVE_AORIST = 'p-aor';
const TOKEN_PARADIGM_CONSEQUENT_ADJUNCTIVE = 'c-adj';
const TOKEN_PARADIGM_CONSEQUENT_AGENTIVE = 'c-agt';
const TOKEN_PARADIGM_NEUTRAL_AGENTIVE = 'n-agt';
const TOKEN_PARADIGM_PASSIVE_FUTURE = 'p-fut';
const TOKEN_PARADIGM_CAUSATIVE_INCHOACTIVE = 'c-inc';
const TOKEN_PARADIGM_CAUSATIVE_REPETITIVE = 'c-rep';
// v-base and v-theme paradigms (gerundial)
const TOKEN_PARADIGM_RESULTATIVE_GERUNDIAL = 'r-ger';
const TOKEN_PARADIGM_NON_DIRECTIVE_GERUNDIAL = 'nd-ger';
const TOKEN_PARADIGM_PASSIVE_GERUNDIAL = 'p-ger';
const TOKEN_PARADIGM_PRECATIVE_GERUNDIAL = 'prec-ger';
const TOKEN_PARADIGM_PREDICATED_GERUNDIAL = 'pred-ger';
const TOKEN_PARADIGM_MULTIPLICATIVE_GERUNDIAL = 'm-ger';
// v-base and v-theme paradigms (verbal nouns)
const TOKEN_PARADIGM_NEUTRAL_VERBAL_NOUN = 'nv-n';
const TOKEN_PARADIGM_PASSIVE_VERBAL_NOUN = 'pv-n';

// n-theme paradigms
const TOKEN_PARADIGM_NOMINATIVE = 'nom';
const TOKEN_PARADIGM_ACCUSATIVE = 'acc';
const TOKEN_PARADIGM_DATIVE = 'dat';
const TOKEN_PARADIGM_ABLATIVE = 'abl';
const TOKEN_PARADIGM_LOCATIVE = 'loc';
const TOKEN_PARADIGM_PLURAL = 'pl';
const TOKEN_PARADIGM_INTENSIVE_POSSESSOR = 'i-poss';
const TOKEN_PARADIGM_ACQUISITIVE = 'acq';
const TOKEN_PARADIGM_INCHOACTIVE = 'inc';
const TOKEN_PARADIGM_GENITIVE = 'gen';
const TOKEN_PARADIGM_RESIDENT = 'res';
const TOKEN_PARADIGM_DECENDENT = 'dec';
const TOKEN_PARADIGM_DIMINUTIVE = 'dim';

// prn-theme paradigms (\pd, \pdl, and \pdv appear exclusively in prn-theme entries)
const TOKEN_PARADIGM_INFO = 'pd'; // info such as "first person" or "demonstrative pronoun"
const TOKEN_PARADIGM_LABEL = 'pdl'; // name of grammatical case
const TOKEN_PARADIGM_VERNACULAR = 'pdv'; // L2 wordform

// SPECULATIVE TOKENS //
const TOKEN_PARADIGM_DISTAL = 'dis';
const TOKEN_PARADIGM_DURATIVE_PASSIVE = 'd-pass';
const TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL_VERBAL_NOUN = 'r-rv-n';
const TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL_ADJUNCTIVE = 'r-r-adj';
const TOKEN_PARADIGM_MULTIPLICATIVE_GERUNDIAL_ALT = 'mult-ger';





// \mr (x3935) is "morphology info"
	// x-theme entries use it as actual morphology note
	// everything else uses it as "grammatical case of \lx"
// \lt (x20) is "literal meaning"
	// some attach to \lx, some attach to \xv
// \pdv (x89) is "paradigm vernacular", and \pdl (x89) is "paradigm label"
	// \pdl \pdv sequences occur exclusively in prn-theme entries
// \pd (x5)
	// only appears in prn-theme entries for "first person", "second person", "third person", "this", and "that"
	// for 1st/2nd/3rd person, appears after \ge with the same contents as the \pd
	// for "this"/"that", \pd contains the text "demonstrative pronoun"
	// does this field convey meaningful info that you want to keep?
	
// \sn (x11) is "word sense"
	// should this use word_1,word_2,etc syntax?
// \va "variant" should only occur in non-x-theme entries
	// add to L2 headword with semicolon syntax

// \a (x4)
	// x3 appear in affix entries, and contain an alternation of the "headword" affix
	// x1 contains "ʔə·kʰa", in v-theme entry "ʔə·kʼa/"; should it be "ʔə·kʰa/"?
	// is \a "alternation"?
// \dis (x2)
	// x2 \dis "ṭʼiyʼṭʼiʼyʼwiʔin" and "puŋpiŋʼyiʔin" in v-base entries
	// x2 \dist "munʼšat" and "pʰawʼaʔa" in v-base entries
	// \dis not in live dictionary; is this "distributive" like \dist?
	// only appears in v-base
// \mn (x2) is "reference to main entry", which should link entries together
	// x1 occurence in entry "pukʰošitʰ" looks like actual main entry link; is there a reason to use \mn instead of \cf?
	// x1 occurence in entry "pukʼši" looks like mis-labeled /mr
// \mult-ger (x1)
	// there are x10 \m-ger and only x1 \mult-ger (in the entry "#munʼuš")
	// both only appear in v-base entries, and both are labeled "multiplicative gerundial"
	// should \m-ger and \mult-ger be merged?


// \d-pass (x10)
	// not in live dictionary; believed to be "durative passive" case
	// only appears in v-base and v-theme
// \r-rv-n (x3)
	// not in live dictionary, possibly "reflexive-reciprocal verbal-noun"?
	// only appears in v-base
	// -iwsha, -iwish, -iwshit
// \r-r-adj (x3)
	// not in live dictionary, probably "reflexive reciprocal adjunctive"
	// only appears in v-base and v-theme
	


let WORDFORM_NAMES = Object.freeze({
	// paradigms are used by x-theme and v-base entries to label grammatical cases of L2 wordforms in a lexeme
	[TOKEN_PARADIGM_UNDERLYING] : 'Underlying',

	// v-base and v-theme paradigms (single attribute)
	[TOKEN_PARADIGM_INDIRECTIVE] : 'Indirective',
	[TOKEN_PARADIGM_CAUSATIVE] : 'Causative',
	[TOKEN_PARADIGM_IMPERATIVE] : 'Imperative',
	[TOKEN_PARADIGM_DESIDERATIVE] : 'Desiderative',
	[TOKEN_PARADIGM_DUBITATIVE] : 'Dubitative',
	[TOKEN_PARADIGM_DURATIVE] : 'Durative',
	[TOKEN_PARADIGM_AORIST] : 'Aorist',
	[TOKEN_PARADIGM_FUTURE] : 'Future',
	[TOKEN_PARADIGM_REPETITIVE] : 'Repetitive',
	[TOKEN_PARADIGM_DISTRIBUTIVE] : 'Distributive',
	[TOKEN_PARADIGM_MEDIO_PASSIVE] : 'Medio-Passive',
	[TOKEN_PARADIGM_PASSIVE] : 'Passive',
	[TOKEN_PARADIGM_RETARDATIVE] : 'Retardative',
	[TOKEN_PARADIGM_ABSOLUTIVE] : 'Absolutive',
	[TOKEN_PARADIGM_ADJUNCTIVE] : 'Adjunctive',
	[TOKEN_PARADIGM_CONTINUATIVE] : 'Continuative',

	// v-base and v-theme paradigms (multi attribute)
	[TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL] : 'Reflexive-Reciprocal',
	[TOKEN_PARADIGM_DURATIVE_PRESENT] : 'Durative Present',
	[TOKEN_PARADIGM_DURATIVE_AORIST] : 'Durative Aorist',
	[TOKEN_PARADIGM_PASSIVE_AORIST] : 'Passive Aorist',
	[TOKEN_PARADIGM_CONSEQUENT_ADJUNCTIVE] : 'Consequent Adjunctive',
	[TOKEN_PARADIGM_CONSEQUENT_AGENTIVE] : 'Consequent Agentive',
	[TOKEN_PARADIGM_NEUTRAL_AGENTIVE] : 'Neutral Agentive',
	[TOKEN_PARADIGM_PASSIVE_FUTURE] : 'Passive Future',
	[TOKEN_PARADIGM_CAUSATIVE_INCHOACTIVE] : 'Causative Inchoactive',
	[TOKEN_PARADIGM_CAUSATIVE_REPETITIVE] : 'Causative Repetitive',

	// v-base and v-theme paradigms (gerundial)
	[TOKEN_PARADIGM_RESULTATIVE_GERUNDIAL] : 'Resultative Gerundial',
	[TOKEN_PARADIGM_NON_DIRECTIVE_GERUNDIAL] : 'Non-Directive Gerundial',
	[TOKEN_PARADIGM_PASSIVE_GERUNDIAL] : 'Passive Gerundial',
	[TOKEN_PARADIGM_PRECATIVE_GERUNDIAL] : 'Precative Gerundial',
	[TOKEN_PARADIGM_PREDICATED_GERUNDIAL] : 'Predicated Gerundial',
	[TOKEN_PARADIGM_MULTIPLICATIVE_GERUNDIAL] : 'Multiplicative Gerundial',

	// v-base and v-theme paradigms (verbal nouns)
	[TOKEN_PARADIGM_NEUTRAL_VERBAL_NOUN] : 'Neutral Verbal Noun',
	[TOKEN_PARADIGM_PASSIVE_VERBAL_NOUN] : 'Passive Verbal Noun',

	// n-theme paradigms
	[TOKEN_PARADIGM_NOMINATIVE] : 'Nominative',
	[TOKEN_PARADIGM_ACCUSATIVE] : 'Accusative',
	[TOKEN_PARADIGM_DATIVE] : 'Dative',
	[TOKEN_PARADIGM_ABLATIVE] : 'Ablative',
	[TOKEN_PARADIGM_LOCATIVE] : 'Locative',
	[TOKEN_PARADIGM_PLURAL] : 'Plural',
	[TOKEN_PARADIGM_INTENSIVE_POSSESSOR] : 'Intensive Possessor',
	[TOKEN_PARADIGM_ACQUISITIVE] : 'Acquisitive',
	[TOKEN_PARADIGM_INCHOACTIVE] : 'Inchoactive',
	[TOKEN_PARADIGM_GENITIVE] : 'Genitive',
	[TOKEN_PARADIGM_RESIDENT] : 'Resident',
	[TOKEN_PARADIGM_DECENDENT] : 'Decendent',
	[TOKEN_PARADIGM_DIMINUTIVE] : 'Diminutive',

    // SPECULATIVE NAMES //
    [TOKEN_PARADIGM_DISTAL] : 'Distal',
    [TOKEN_PARADIGM_DURATIVE_PASSIVE] : 'Durative Passive',
    [TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL_VERBAL_NOUN] : 'Reflexive-Reciprocal Verbal Noun',
    [TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL_ADJUNCTIVE] : 'Reflexive-Reciprocal Adjunctive',
	[TOKEN_PARADIGM_MULTIPLICATIVE_GERUNDIAL_ALT] : 'Multiplicative Gerundial',
});



// const PARSE_RUN_STARTERS = Object.freeze([
// 	// entry headword
// 	TOKEN_NEW_ENTRY,
// 	// entry data
// 	TOKEN_LAST_EDIT, TOKEN_MORPHOLOGY,
// 	// alternates
// 	TOKEN_VARIANT,
// 	// examples
// 	TOKEN_EXAMPLE_L2,
// 	// links to other entries
// 	TOKEN_CROSS_REFERENCE, TOKEN_MAIN_ENTRY,
// 	// notes
// 	TOKEN_NOTE, TOKEN_NOTE_ANTHROPOLOGY, TOKEN_NOTE_DISCUSSION,
// 	TOKEN_NOTE_GRAMMAR, TOKEN_NOTE_PHONETIC, TOKEN_NOTE_SCIENTIFIC_CLASSIFICATION,
// 	TOKEN_NOTE_ENCYLOPEDIA_ENTRY, TOKEN_NOTE_BORROWED_WORD,
// 	// media
// 	TOKEN_MEDIA_IMAGE,
// 	// paradigms
// 	...Object.keys(WORDFORM_NAMES),
// ]);

const PARSE_RUN_STARTERS = Object.freeze((() => {
	let o = {};
	let runStarters = [
		// entry headword
		TOKEN_NEW_ENTRY,
		// entry data
		TOKEN_LAST_EDIT, TOKEN_MORPHOLOGY,
		// alternates
		TOKEN_VARIANT,
		// examples
		TOKEN_EXAMPLE_L2,
		// links to other entries
		TOKEN_CROSS_REFERENCE, TOKEN_MAIN_ENTRY,
		// notes
		TOKEN_NOTE, TOKEN_NOTE_ANTHROPOLOGY, TOKEN_NOTE_DISCUSSION,
		TOKEN_NOTE_GRAMMAR, TOKEN_NOTE_PHONETIC, TOKEN_NOTE_SCIENTIFIC_CLASSIFICATION,
		TOKEN_NOTE_ENCYLOPEDIA_ENTRY, TOKEN_NOTE_BORROWED_WORD,
		// media
		TOKEN_MEDIA_IMAGE,
		// paradigms
		TOKEN_PARADIGM_LABEL,
		...Object.keys(WORDFORM_NAMES),
	];
	for (let token of runStarters) o[token] = true;
	return o;
})());
console.log(PARSE_RUN_STARTERS);




const PARSE_LEXEME_CATGS = Object.freeze({
	'n-theme' : true,
	'prn-theme' : true,
	'v-theme' : true,
	'v-base' : true,
});

const BlankEntry = () => {
	return {
		isLexeme : false,
		L1 : [], // array of strings : eng word/definition
		catg : '', // string : part of speech abbreviation
		L2 : [], // array of objects {L2,audio}
		examples : [], // array of objects {L1,L2,audio}
	}
};
const BlankLexeme = () => {
	return {
		isLexeme : true,
		L1 : [], // array of strings : eng word/definition
		catg : '', // string : part of speech abbreviation
		L2 : [], // array of objects {L2,form}
	}
};
const entryToLexeme = (entry) => {
	let lx = BlankLexeme();
	for (let L1 of entry.L1 ?? []) lx.L1.push(L1);
	lx.catg = entry.catg;
	for (let L2 of entry.L2 ?? []) lx.L2.push(L2);
	if (entry.examples?.length > 0) console.warn(`L2 examples before \\ps in entry for "${lx.L1.join(SYNONYM_JOIN)}"`);
	return lx;
};


const tokenize = (text) => {
	const t0_tokenize = performance.now();
    let tokencounts = {};
    let tokenstream = [];
	console.log(`Tokenizing text...`);

    // scrub CRLF and normalize whitespace in case something went wrong with pre-parse
    let lines = text.replaceAll(/[\n\r]+/g,'\n').trim().split('\n');

    // tokenize
	let numIllFormed = 0;
	let numNoToken = 0;
    for (let line of lines) {
        // skip ill-formed tokens
        if (!line || line.length === 0 || line[0] !== '\\') {
			numIllFormed++;
			continue;
		}
		const match = line.match(RE_MDF_TOKEN);
		if (!match) {
			numIllFormed++;
			continue;
		}
		const [,type,contents] = match;
		if (!type || !contents) {
			numNoToken++;
			continue;
		}
        // if line was a well-formed token, add it to the stream
		if (!tokencounts[type]) tokencounts[type] = 0;
		tokencounts[type]++;
		tokenstream.push({
			type : type,
			contents : contents,
		});
    }

	console.log(`Text tokenized in ${Math.round(performance.now() - t0_tokenize)} ms`);
    return {
		dt : performance.now() - t0_tokenize,
        tokencounts : tokencounts,
        tokenstream : tokenstream,
    };
};

const parse = (text) => {
	const tokenization = tokenize(text);
	const t0_parse = performance.now();

	// track stats and unhandled data so user can be notified w/o losing data
	let recordedRuns = {}; // hash map : k = space-separated token types, v = num occurences
	let nonRunStarters = {}; // hash map : k = token type, v = num occurences
	let unparsedTokens = {}; // hash map : k = token type, v = num occurences
	let mrForms = {}; // form names from \mr tokens in standard entries

	// parse runs
	let runstreams = [];
	let runs = [];
	let run = null;
	for (let token of tokenization.tokenstream) {
		// if we're starting a new entry, wrap up the last one
		if (token.type === TOKEN_NEW_ENTRY && runs) {
			runstreams.push(runs);
			runs = [];
		}
		// check if we need to start a new run (token seq)
		if (PARSE_RUN_STARTERS[token.type]) {
			// record prev run
			if (run) runs.push(run.join(' '));
			// count non-run-starting tokens to check for tokens that still need to be parsed
			if (run) {
				for (let i = 0; i < run.length; i++) {
					if (i === 0) continue;
					if (!nonRunStarters[run[i]]) nonRunStarters[run[i]] = 0;
					nonRunStarters[run[i]]++;
				}
			}
			// start new run
			run = [];
		}
		// add token to run
		run.push(token.type);
	}
	// wrap up last run/entry
	if (run) runs.push(run.join(' '));
	runstreams.push(runs);

	console.log(`${Object.keys(nonRunStarters).length} tokens are parsed as non-run-starters`);
	console.log(nonRunStarters);

	// index runs
	for (let runs of runstreams) {
		for (let run of runs ?? []) {
			if (!recordedRuns[run]) recordedRuns[run] = 0;
			recordedRuns[run]++;
		}
	}
	console.log(`Num entries from runs is ${runstreams.length}`);
	console.log(`${Object.keys(recordedRuns).length} uniq runs recorded`);
	console.log(recordedRuns);


	// parse entry-streams into proper entries
	
	let entries = [];
	let lexemes = []; // n-theme, prn-theme, v-theme, v-base entries group
	let currEntry = null;
	let currAttachPoint = null; // pointer to last L2 wordform/example, 
	for (let token of tokenization.tokenstream) {
		switch (token.type) {
		// basic entry
		case TOKEN_NEW_ENTRY: // L2 headword
			if (currEntry) {
				(currEntry.isLexeme)
					? lexemes.push(currEntry)
					: entries.push(currEntry)
			}
			currEntry = BlankEntry();
			currEntry.L2.push({L2:token.contents, form:undefined});
			currAttachPoint = currEntry.L2[currEntry.L2.length-1];
			break;
		case TOKEN_CATG: // convert entry to lexeme if part of speech is x-theme
			if (currEntry.catg) console.warn(`Entry "${currEntry.L1.join(SYNONYM_JOIN)}" has multiple \\ps. Replacing "${currEntry.catg}" with "${token.contents}".`);
			currEntry.catg = token.contents;
			if (PARSE_LEXEME_CATGS[token.contents]) {
				currEntry = entryToLexeme(currEntry);
				currAttachPoint = null;
			}
			break;
		case TOKEN_GLOSS_L1: // L1
		case TOKEN_DEFINITION_L1:
			currEntry.L1.push(token.contents);
			break;
		// examples, from sequences of \xv \ge (\sfx)
		case TOKEN_EXAMPLE_L2: // examples
			currEntry.examples.push({L1:undefined, L2:token.contents});
			currAttachPoint = currEntry.examples[currEntry.examples.length-1];
			break;
		case TOKEN_EXAMPLE_L1:
			if (!currAttachPoint) {
				console.log(currAttachPoint, currEntry);
				console.warn(`L1 \\${token.type} "${token.contents}" has no attach point for entry "${currEntry.L1.join(SYNONYM_JOIN)}"`);
			} else {
				if (currAttachPoint.L1) console.warn(`Multiple \\xe after single \\xv. Replacing L1 "${currAttachPoint.L1}" with "${token.contents}"`);
				currAttachPoint.L1 = token.contents;
			}
			break;
		// media
		case TOKEN_MEDIA_AUDIO_HEADWORD: // audio attaches to last wordform/example; guaranteed at least L2 headword \lx to attach to
		case TOKEN_MEDIA_AUDIO:
			// if (!currEntry.L2[currEntry.L2.length-1].audio) currEntry.L2[currEntry.L2.length-1].audio = [];
			// currEntry.L2[currEntry.L2.length-1].audio.push(token.contents);
			if (!currAttachPoint) {
				if (currEntry.isLexeme) {
					console.warn(`Audio token \\${token.type} in lexeme entry for "${currEntry.L1.join(SYNONYM_JOIN)}"`);
				} else {
					console.warn(`Audio token \\${token.type} has no attach point in entry "${currEntry.L1.join(SYNONYM_JOIN)}"`);
				}
			} else {
				if (!currAttachPoint.audio) currAttachPoint.audio = [];
				currAttachPoint.audio.push(token.contents);
			}
			break;
		case TOKEN_MEDIA_IMAGE: // images attach to entry rather than L2 wordform
			if (!currEntry.images) currEntry.images = [];
			currEntry.images.push(token.contents);
			break;
		// special cases
		case TOKEN_MORPHOLOGY: // morphology info
			// \mr is headword form name in standard entries
			if (!currEntry.isLexeme) {
				if (!mrForms[token.contents]) mrForms[token.contents] = 0;
				mrForms[token.contents]++;
				currEntry.L2[0].form = token.contents; // form labels are too inconsistent; use only as backup
			}
			// \mr is morphology note in lexeme entries
				// no-op (all notes are pruned until Gamble greenlights what can be shown publicly)
			break;
		default:
			// n-theme,v-theme,v-base lexeme entries specify wordform catg with special token type
			if (WORDFORM_NAMES[token.type]) {
				if (!currEntry.isLexeme && token.type !== TOKEN_PARADIGM_UNDERLYING) console.warn(`Lexeme catg token "${token.type}" appeared in standard entry "${currEntry.L1.join(SYNONYM_JOIN)}" of catg "${currEntry.catg}"`);
				currEntry.L2.push({L2:token.contents, form:token.type});
			// prn-theme lexeme entries specify wordform and catg with \pdl \pdv pairs
			} else if (token.type === TOKEN_PARADIGM_LABEL) {
				if (!currEntry.isLexeme) console.warn(`Lexeme paradigm label "${token.type}" appeared in standard entry "${currEntry.L1.join(SYNONYM_JOIN)}" of catg "${currEntry.catg}"`);
				currEntry.L2.push({L2:token.contents, form:undefined}); // create new paradigm with this label
			} else if (token.type === TOKEN_PARADIGM_VERNACULAR) {
				if (!currEntry.isLexeme) console.warn(`Lexeme paradigm vernacular "${token.type}" appeared in standard entry "${currEntry.L1.join(SYNONYM_JOIN)}" of catg "${currEntry.catg}"`);
				if (currEntry.L2?.length < 1) {
					console.warn(`Lexeme \\pdv wordform "${token.contents}" had no \\pdl to attach to.`);
					currEntry.L2.push({L2:undefined, form:token.contents}); // create headless paradigm
				} else {
					currEntry.L2[currEntry.L2.length-1].L2 = token.contents;
				}
			// log unhandled tokens to ensure no data is skipped
			} else {
				if (!unparsedTokens[token.type]) unparsedTokens[token.type] = 0;
				unparsedTokens[token.type]++;
			}
		}
	}



	console.log(`Tokenstream parsed in ${Math.round(performance.now() - t0_parse)} ms`);
	return {
		dt : performance.now() - t0_parse,
		entries,
		lexemes,
		// stats
		recordedRuns,
		nonRunStarters,
		unparsedTokens,
		mrForms,
	};
};

const loadDatabase = async () => {
	const t0_fetch = performance.now();
    const filename = './assets/data/toolbox-output-clean.txt';
    try {
        const res = await fetch(filename);
        if (!res.ok) {
            throw new Error(`Failed to load file "${filename}". Response code ${res.status}.`);
        }
		console.log(`Fetched database in ${Math.round(performance.now()-t0_fetch)} ms`);
        return parse(await res.text());
    } catch (error) {
        console.error(error.message);
    }
};



////////////////////////////////////

export {
	loadDatabase
}
