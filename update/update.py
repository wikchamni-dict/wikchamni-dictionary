import datetime
from functools import cmp_to_key
import json
import os
import re
import subprocess
import time

"""
=== UPDATE INSTRUCTIONS ===

Exporting SIL Toolbox projects:
    From Toolbox click File > Export, select "Standard Format" from the list and click Ok, then click Ok again and save the output.
    Exported SF files contain human-readable plaintext and have no file extension by default.
    They have no file extension by default, but you can safely add a .txt extension to open them in a text editor.
Running this update script:
    Rename your saved Toolbox output file to the value of FILE_DATABASE_INPUT variable below ("toolbox-output" by default).
    This program will check for both "filename" (no extension) and "filename.txt".
    Place the output file in the update folder, alongside update.py.
    Open a terminal in the update folder (or navigate a terminal to that location).
    Run "python update.py" and wait for it to finish.

What this program does:
    Preprocesses Toolbox's exported SF file:
        1) Toolbox's CRLF format is converted to LF format, which is simpler to parse and has more consistent cross-browser handling.
        2) Depending how long ago datafields were entered, they may contain a mix of single quotes, angled apostrophes, or vertical apostrophes. These must be normalized for searches to work correctly.
        3) Fields longer than 90 characters are split across multiple lines and must be rejoined.
        4) Toolbox's absolute paths to attached media files are converted to relative paths, both for functionality and to avoid revealing PID.
    Tokenizes, parses, and alphabetizes data to check for well-formedness.
    Builds sitemap of entries to make them searchable by Google/etc.

    

=== ADVANCED UPDATES ===

Changing what site the dictionary is hosted from:
    1) Set URL_BASE to the root of the new domain (wherever index.html will be).
        This requires an absolute url with web protocol (for example https://example.com or https://example.com/wikchamni).
    2) Rerun this script to rebuild the sitemap for the new domain.
    3) Add the generated sitemap to the new domain's robots.txt to make it accessible to crawlers/Google/etc.
"""

# place SIL Toolbox output in same folder as update.py; program automatically scans for "filename.txt" if extensionless file "filename" not found
FILE_DATABASE_INPUT = 'toolbox-output'

# root directory of website where dictionary is hosted
    # must be absolute url with FQDN and protocol (ex. https://example.com or https://example.com/wikchamni)
    # must NOT include trailing slash
# URL_BASE = 'https://ssirrikh.github.io/wikchamni'
URL_BASE = 'https://wikchamnidictionary.library.fresnostate.edu'



###############################################################################

#### DON'T TOUCH ANYTHING BELOW THIS POINT UNLESS YOU KNOW WHAT YOU'RE DOING!!!

###############################################################################



# enum
CARD_TYPE_ENTRY = False
CARD_TYPE_LEXEME = True

# url parameters
LANG_ENG = 'en' # url param for english entry
LANG_WIK = 'wk' # url entry for wikchamni entry
# static sitemap
STATIC_PAGES = [
    # static site pages
    f'{URL_BASE}',
    f'{URL_BASE}/about',
    f'{URL_BASE}/language',
    f'{URL_BASE}/lexicon',
]

# file management
DIR_DATA = 'assets/data'
DIR_MEDIA = 'media'
DIR_UPDATE = 'update'
FILE_DATABASE_OUTPUT = 'toolbox-output-clean' # no file ext; both "output" (extensionless) and "output.json" will be generated
FILE_LOG = 'log' # no file ext; "log.txt" will be generated
FILE_SITEMAP = 'sitemap' # no file ext; both "sitemap.txt" and "sitemap.xml" will be generated
# flags
FLAG_VERBOSE = False
FLAG_VERBOSE_PARSED = False
FLAG_VERBOSE_UNPARSED = False
FLAG_FORCE = False # forcibly revert to last commit, pull, then rerun script as normal (ie if a commit got stuck/interrupted)
# regex
RE_PID_FILEPATH = re.compile(r'^(.*)[A-Za-z]:[^\n]*(\\[^\\\n]+)$') # good enough for now, since no datafield contains more than one filepath and all files are stored in the same directory
RE_TOKEN = re.compile(r'^\\([^\s]+)(?: ([^\n]*))?$') # Toolbox SF token of form "\xyz Token contents" -> (xyz), (Token contents)
RE_SYNONYM_SPLITTER = re.compile(r';\s*')
SYNONYM_JOIN = '; '

# logfile helpers
USE_BUFFER_LOG = False
logfile = None
logbuff = ''
def open_logfile():
    global logfile
    logfile = open(f'{FILE_LOG}.txt', 'w', encoding='utf-8')
def close_logfile():
    global logfile
    logfile.close()
def log(text='', quiet=False):
    if not quiet: print(text)
    if USE_BUFFER_LOG:
        global logbuff
        logbuff += f'{text}\n'
    else:
        logfile.write(f'{text}\n')


###############################################################################

#########################
#### TOKEN INVENTORY ####
#########################

## Standard Entries ##

# entry headword
TOKEN_NEW_ENTRY = 'lx'  # L2 headword
TOKEN_GLOSS_L1 = 'ge'  # L1 translation of headword
TOKEN_DEFINITION_L1 = 'de'  # also L1 translation of headword
# entry data
TOKEN_CATG = 'ps'
TOKEN_LAST_EDIT = 'dt'
TOKEN_MORPHOLOGY = 'mr'  # in x-theme entries this is an actual morphology note; for everything else, it's the name of the headword's grammatical case
# alternates
TOKEN_WORD_SENSE = 'sn'  # L2 headword is homophone/homograph of multiple L2 words
TOKEN_VARIANT = 'va'  # spelling variation of previous run-starter
TOKEN_ALTERNATION = 'a'  # also spelling variation of previous run-starter
# examples
TOKEN_EXAMPLE_L2 = 'xv'  # L2 example
TOKEN_EXAMPLE_L1 = 'xe'  # L1 translation of example
TOKEN_LITERAL_MEANING = 'lt'  # L1 literal meaning of last L2 wordform
# links to other entries
TOKEN_CROSS_REFERENCE = 'cf'  # contains headword of related entry from another lexeme
TOKEN_MAIN_ENTRY = 'mn'  # contains headword of main entry, which current headword is related subentry of
# notes
TOKEN_NOTE = 'nt'
TOKEN_NOTE_ANTHROPOLOGY = 'na'
TOKEN_NOTE_DISCUSSION = 'nd'
TOKEN_NOTE_GRAMMAR = 'ng'
TOKEN_NOTE_PHONETIC = 'np'
TOKEN_NOTE_SCIENTIFIC_CLASSIFICATION = 'sc'
TOKEN_NOTE_ENCYLOPEDIA_ENTRY = 'ee'
TOKEN_NOTE_BORROWED_WORD = 'bw'
TOKEN_LITERAL_MEANING = 'lt'
# media
TOKEN_MEDIA_AUDIO = 'sfx'
TOKEN_MEDIA_AUDIO_HEADWORD = 'sf'
TOKEN_MEDIA_IMAGE = 'pc'

## Lexeme Entries ##

# paradigms are used by x-theme and v-base entries to label grammatical cases of L2 wordforms in a lexeme
TOKEN_PARADIGM_UNDERLYING = 'u'
# v-base and v-theme paradigms (single attribute)
TOKEN_PARADIGM_INDIRECTIVE = 'ind'
TOKEN_PARADIGM_CAUSATIVE = 'caus'
TOKEN_PARADIGM_IMPERATIVE = 'imp'
TOKEN_PARADIGM_DESIDERATIVE = 'des'
TOKEN_PARADIGM_DUBITATIVE = 'dub'
TOKEN_PARADIGM_DURATIVE = 'dur'
TOKEN_PARADIGM_AORIST = 'aor'
TOKEN_PARADIGM_FUTURE = 'fut'
TOKEN_PARADIGM_REPETITIVE = 'rep'
TOKEN_PARADIGM_DISTRIBUTIVE = 'dist'
TOKEN_PARADIGM_MEDIO_PASSIVE = 'm-pass'
TOKEN_PARADIGM_PASSIVE = 'pass'
TOKEN_PARADIGM_RETARDATIVE = 'ret'
TOKEN_PARADIGM_ABSOLUTIVE = 'abs'
TOKEN_PARADIGM_ADJUNCTIVE = 'adj'
TOKEN_PARADIGM_CONTINUATIVE = 'cont'
# v-base and v-theme paradigms (multi attribute)
TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL = 'r-r'
TOKEN_PARADIGM_DURATIVE_PRESENT = 'd-pres'
TOKEN_PARADIGM_DURATIVE_AORIST = 'd-aor'
TOKEN_PARADIGM_PASSIVE_AORIST = 'p-aor'
TOKEN_PARADIGM_CONSEQUENT_ADJUNCTIVE = 'c-adj'
TOKEN_PARADIGM_CONSEQUENT_AGENTIVE = 'c-agt'
TOKEN_PARADIGM_NEUTRAL_AGENTIVE = 'n-agt'
TOKEN_PARADIGM_PASSIVE_FUTURE = 'p-fut'
TOKEN_PARADIGM_CAUSATIVE_INCHOACTIVE = 'c-inc'
TOKEN_PARADIGM_CAUSATIVE_REPETITIVE = 'c-rep'
# v-base and v-theme paradigms (gerundial)
TOKEN_PARADIGM_RESULTATIVE_GERUNDIAL = 'r-ger'
TOKEN_PARADIGM_NON_DIRECTIVE_GERUNDIAL = 'nd-ger'
TOKEN_PARADIGM_PASSIVE_GERUNDIAL = 'p-ger'
TOKEN_PARADIGM_PRECATIVE_GERUNDIAL = 'prec-ger'
TOKEN_PARADIGM_PREDICATED_GERUNDIAL = 'pred-ger'
TOKEN_PARADIGM_MULTIPLICATIVE_GERUNDIAL = 'm-ger'
# v-base and v-theme paradigms (verbal nouns)
TOKEN_PARADIGM_NEUTRAL_VERBAL_NOUN = 'nv-n'
TOKEN_PARADIGM_PASSIVE_VERBAL_NOUN = 'pv-n'
# n-theme paradigms
TOKEN_PARADIGM_NOMINATIVE = 'nom'
TOKEN_PARADIGM_ACCUSATIVE = 'acc'
TOKEN_PARADIGM_DATIVE = 'dat'
TOKEN_PARADIGM_ABLATIVE = 'abl'
TOKEN_PARADIGM_LOCATIVE = 'loc'
TOKEN_PARADIGM_PLURAL = 'pl'
TOKEN_PARADIGM_INTENSIVE_POSSESSOR = 'i-poss'
TOKEN_PARADIGM_ACQUISITIVE = 'acq'
TOKEN_PARADIGM_INCHOACTIVE = 'inc'
TOKEN_PARADIGM_GENITIVE = 'gen'
TOKEN_PARADIGM_RESIDENT = 'res'
TOKEN_PARADIGM_DECENDENT = 'dec' # when speaking about deceased person
TOKEN_PARADIGM_DIMINUTIVE = 'dim'
# prn-theme paradigms (\pd, \pdl, and \pdv appear exclusively in prn-theme entries)
TOKEN_PARADIGM_INFO = 'pd' # info such as "first person" or "demonstrative pronoun"
TOKEN_PARADIGM_LABEL = 'pdl' # name of grammatical case
TOKEN_PARADIGM_VERNACULAR = 'pdv' # L2 wordform

## SPECULATIVE TOKENS ##

TOKEN_PARADIGM_DISTAL = 'dis'
TOKEN_PARADIGM_DURATIVE_PASSIVE = 'd-pass'
TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL_VERBAL_NOUN = 'r-rv-n'
TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL_ADJUNCTIVE = 'r-r-adj'
TOKEN_PARADIGM_MULTIPLICATIVE_GERUNDIAL_ALT = 'mult-ger'

# \mr (x3935) is "morphology info"
    # x-theme entries use it as actual morphology note
    # everything else uses it as "grammatical case of \lx"
# \lt (x20) is "literal meaning"
    # some attach to \lx, some attach to \xv
# \pdv (x89) is "paradigm vernacular", and \pdl (x89) is "paradigm label"
    # \pdl \pdv sequences occur exclusively in prn-theme entries
# \pd (x5)
    # only appears in prn-theme entries for "first person", "second person", "third person", "this", and "that"
    # for 1st/2nd/3rd person, appears after \ge with the same contents as the \pd
    # for "this"/"that", \pd contains the text "demonstrative pronoun"
    # does this field convey meaningful info that you want to keep?
    
# \sn (x11) is "word sense"
    # should this use word_1,word_2,etc syntax?
# \va "variant" should only occur in non-x-theme entries
    # add to L2 headword with semicolon syntax

# \a (x4)
    # x3 appear in affix entries, and contain an alternation of the "headword" affix
    # x1 contains "ʔə·kʰa", in v-theme entry "ʔə·kʼa/"; should it be "ʔə·kʰa/"?
    # is \a "alternation"?
# \dis (x2)
    # x2 \dis "ṭʼiyʼṭʼiʼyʼwiʔin" and "puŋpiŋʼyiʔin" in v-base entries
    # x2 \dist "munʼšat" and "pʰawʼaʔa" in v-base entries
    # \dis not in live dictionary; is this "distributive" like \dist?
    # only appears in v-base
# \mn (x2) is "reference to main entry", which should link entries together
    # x1 occurence in entry "pukʰošitʰ" looks like actual main entry link; is there a reason to use \mn instead of \cf?
    # x1 occurence in entry "pukʼši" looks like mis-labeled /mr
# \mult-ger (x1)
    # there are x10 \m-ger and only x1 \mult-ger (in the entry "#munʼuš")
    # both only appear in v-base entries, and both are labeled "multiplicative gerundial"
    # should \m-ger and \mult-ger be merged?

# \d-pass (x10)
    # not in live dictionary; believed to be "durative passive" case
    # only appears in v-base and v-theme
# \r-rv-n (x3)
    # not in live dictionary, possibly "reflexive-reciprocal verbal-noun"?
    # only appears in v-base
    # -iwsha, -iwish, -iwshit
# \r-r-adj (x3)
    # not in live dictionary, probably "reflexive reciprocal adjunctive"
    # only appears in v-base and v-theme

## Run Starters ##

WORDFORM_NAMES = {
    # paradigms are used by x-theme and v-base entries to label grammatical cases of L2 wordforms in a lexeme
    TOKEN_PARADIGM_UNDERLYING : 'Underlying',

    # v-base and v-theme paradigms (single attribute)
    TOKEN_PARADIGM_INDIRECTIVE : 'Indirective',
    TOKEN_PARADIGM_CAUSATIVE : 'Causative',
    TOKEN_PARADIGM_IMPERATIVE : 'Imperative',
    TOKEN_PARADIGM_DESIDERATIVE : 'Desiderative',
    TOKEN_PARADIGM_DUBITATIVE : 'Dubitative',
    TOKEN_PARADIGM_DURATIVE : 'Durative',
    TOKEN_PARADIGM_AORIST : 'Aorist',
    TOKEN_PARADIGM_FUTURE : 'Future',
    TOKEN_PARADIGM_REPETITIVE : 'Repetitive',
    TOKEN_PARADIGM_DISTRIBUTIVE : 'Distributive',
    TOKEN_PARADIGM_MEDIO_PASSIVE : 'Medio-Passive',
    TOKEN_PARADIGM_PASSIVE : 'Passive',
    TOKEN_PARADIGM_RETARDATIVE : 'Retardative',
    TOKEN_PARADIGM_ABSOLUTIVE : 'Absolutive',
    TOKEN_PARADIGM_ADJUNCTIVE : 'Adjunctive',
    TOKEN_PARADIGM_CONTINUATIVE : 'Continuative',

    # v-base and v-theme paradigms (multi attribute)
    TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL : 'Reflexive-Reciprocal',
    TOKEN_PARADIGM_DURATIVE_PRESENT : 'Durative Present',
    TOKEN_PARADIGM_DURATIVE_AORIST : 'Durative Aorist',
    TOKEN_PARADIGM_PASSIVE_AORIST : 'Passive Aorist',
    TOKEN_PARADIGM_CONSEQUENT_ADJUNCTIVE : 'Consequent Adjunctive',
    TOKEN_PARADIGM_CONSEQUENT_AGENTIVE : 'Consequent Agentive',
    TOKEN_PARADIGM_NEUTRAL_AGENTIVE : 'Neutral Agentive',
    TOKEN_PARADIGM_PASSIVE_FUTURE : 'Passive Future',
    TOKEN_PARADIGM_CAUSATIVE_INCHOACTIVE : 'Causative Inchoactive',
    TOKEN_PARADIGM_CAUSATIVE_REPETITIVE : 'Causative Repetitive',

    # v-base and v-theme paradigms (gerundial)
    TOKEN_PARADIGM_RESULTATIVE_GERUNDIAL : 'Resultative Gerundial',
    TOKEN_PARADIGM_NON_DIRECTIVE_GERUNDIAL : 'Non-Directive Gerundial',
    TOKEN_PARADIGM_PASSIVE_GERUNDIAL : 'Passive Gerundial',
    TOKEN_PARADIGM_PRECATIVE_GERUNDIAL : 'Precative Gerundial',
    TOKEN_PARADIGM_PREDICATED_GERUNDIAL : 'Predicated Gerundial',
    TOKEN_PARADIGM_MULTIPLICATIVE_GERUNDIAL : 'Multiplicative Gerundial',

    # v-base and v-theme paradigms (verbal nouns)
    TOKEN_PARADIGM_NEUTRAL_VERBAL_NOUN : 'Neutral Verbal Noun',
    TOKEN_PARADIGM_PASSIVE_VERBAL_NOUN : 'Passive Verbal Noun',

    # n-theme paradigms
    TOKEN_PARADIGM_NOMINATIVE : 'Nominative',
    TOKEN_PARADIGM_ACCUSATIVE : 'Accusative',
    TOKEN_PARADIGM_DATIVE : 'Dative',
    TOKEN_PARADIGM_ABLATIVE : 'Ablative',
    TOKEN_PARADIGM_LOCATIVE : 'Locative',
    TOKEN_PARADIGM_PLURAL : 'Plural',
    TOKEN_PARADIGM_INTENSIVE_POSSESSOR : 'Intensive Possessor',
    TOKEN_PARADIGM_ACQUISITIVE : 'Acquisitive',
    TOKEN_PARADIGM_INCHOACTIVE : 'Inchoactive',
    TOKEN_PARADIGM_GENITIVE : 'Genitive',
    TOKEN_PARADIGM_RESIDENT : 'Resident',
    TOKEN_PARADIGM_DECENDENT : 'Decendent',
    TOKEN_PARADIGM_DIMINUTIVE : 'Diminutive',

    # SPECULATIVE NAMES
    TOKEN_PARADIGM_DISTAL : 'Distal',
    TOKEN_PARADIGM_DURATIVE_PASSIVE : 'Durative Passive',
    TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL_VERBAL_NOUN : 'Reflexive-Reciprocal Verbal Noun',
    TOKEN_PARADIGM_REFLEXIVE_RECIPROCAL_ADJUNCTIVE : 'Reflexive-Reciprocal Adjunctive',
    TOKEN_PARADIGM_MULTIPLICATIVE_GERUNDIAL_ALT : 'Multiplicative Gerundial',

    # variants (TODO: temp measure, handle like L2 synonym eventually)
    TOKEN_VARIANT : 'Variant',
    TOKEN_ALTERNATION : 'A',
}
NOTE_NAMES = {
    TOKEN_NOTE : 'Note',
    TOKEN_NOTE_ANTHROPOLOGY : 'Anthropology Note',
    TOKEN_NOTE_DISCUSSION : 'Discussion',
    TOKEN_NOTE_GRAMMAR : 'Grammar Note',
    TOKEN_NOTE_PHONETIC : 'Phonetic Note',
    TOKEN_NOTE_SCIENTIFIC_CLASSIFICATION : 'Scientific Classification',
    TOKEN_NOTE_ENCYLOPEDIA_ENTRY : 'Encyclopedia Entry',
    TOKEN_NOTE_BORROWED_WORD : 'Borrowed Word',
    TOKEN_LITERAL_MEANING : 'Literal Meaning',
}

PARSE_RUN_STARTERS = {
    # entry headword
    TOKEN_NEW_ENTRY,
    # entry data
    TOKEN_LAST_EDIT, TOKEN_MORPHOLOGY,
    # examples
    TOKEN_EXAMPLE_L2,
    # links to other entries
    TOKEN_CROSS_REFERENCE, TOKEN_MAIN_ENTRY,
    # notes
    # TOKEN_NOTE, TOKEN_NOTE_ANTHROPOLOGY, TOKEN_NOTE_DISCUSSION,
    # TOKEN_NOTE_GRAMMAR, TOKEN_NOTE_PHONETIC, TOKEN_NOTE_SCIENTIFIC_CLASSIFICATION,
    # TOKEN_NOTE_ENCYLOPEDIA_ENTRY, TOKEN_NOTE_BORROWED_WORD, TOKEN_LITERAL_MEANING,
    # media
    TOKEN_MEDIA_IMAGE,
    # paradigms
    TOKEN_PARADIGM_LABEL,
} | set(NOTE_NAMES) | set(WORDFORM_NAMES) # append named paradigm run-starter tokens

PARSE_LEXEME_CATGS = { # \ps with one of these values indicates lexeme entry (instead of content entry)
	'n-theme',
	'prn-theme',
	'v-theme',
	'v-base',
}


###################
#### TOKENIZER ####
###################

## Pre-Parser (Data Cleanup) ##

def scrub(text_raw): # file string -> list of tokenstrings
    T0_SCRUB = 1000 * time.perf_counter() # in ms
    log(f'\n=== Scrubbing Toolbox data... ===\n')

    # pre-process text
    log(f'Scrubbing CRLF...')
    text_raw = re.sub(r'[\n\r]+', '\n', text_raw) # scrub CRLF
    log(f'Normalizing characters and whitespace...')
    text_raw = re.sub(r'[‘’ʼ]', '\'', text_raw) # single quotes [‘’] char codes 8216,8217 and apostrophe [ʼ] char code 700 normalize to ASCII ['] char code 39
    text_raw = text_raw.strip() # normalize whitespace

    # rejoin long datafields that were split across multiple lines
    log(f'Rejoining multiline datafields...')
    i = 0
    lines = text_raw.split('\n')
    num_multiline = 0
    while i < len(lines):
        # make sure badly-formatted file doesn't break scrubber
        if i == 0:
            i += 1
            continue
        # any line that doesn't begin with a field marker (\xyz ...) is a multiline datafield
        if i > 0 and lines[i][0] != '\\':
            if FLAG_VERBOSE: log(f'    Rejoining: "{lines[i-1]}" / "{lines[i]}"')
            num_multiline += 1
            lines[i - 1] = f'{lines[i - 1]} {lines[i]}' # cast as string
            lines.pop(i)
            i -= 1
        i += 1

    # scrub PID (convert absolute paths to relative paths)
    log(f'Scrubbing PID from filepaths...')
    num_pid_scrubbed = 0
    for i,line in enumerate(lines):
        match = RE_PID_FILEPATH.match(line)
        if not match: continue
        marker,filename = match.groups()
        filename = re.sub('.wav','.mp3',filename) # audio gets converted wav->mp3, so reflect that change here
        if FLAG_VERBOSE: log(f'    From "{line}"')
        if FLAG_VERBOSE: log(f'    => "{marker}media{filename}"')
        lines[i] = f'{marker}media{filename}'
        num_pid_scrubbed += 1
    
    T1_SCRUB = 1000 * time.perf_counter() # in ms

    # calculate stats
    field_counts = {
        'lx' : 0
    }
    num_invalid = 0
    num_blank = 0
    num_tokens = 0
    for line in lines:
        match = RE_TOKEN.match(line)
        if not match:
            num_invalid += 1
            log(f'WARN Ill-formed token "{line}"')
            continue
        marker,contents = match.groups()
        if not contents:
            num_blank += 1
        if marker not in field_counts: field_counts[marker] = 0
        field_counts[marker] += 1
        num_tokens += 1
    num_fields = 0
    ordered_fields = []
    for field in field_counts:
        num_fields += 1
        ordered_fields.append(field)
    ordered_fields.sort()

    # log feedback
    if FLAG_VERBOSE:
        log('\n=== DATABASE SAMPLE ===\n')
        for i,line in enumerate(lines):
            if i > 220: break
            log(f'Line {i}: {line}')
    log(f'\nDONE in {(T1_SCRUB-T0_SCRUB):.1f} ms\n')
    log(f'{num_fields} unique field markers encountered across {num_tokens} tokens.')
    if FLAG_VERBOSE:
        for field in ordered_fields:
            log(f'    {field} : {field_counts[field]} occurences')
    log(f'{num_invalid} tokens were ill-formed, and {num_blank} tokens were blank.')
    log(f'Rejoined {num_multiline} multiline tokens.')
    log(f'Scrubbed {num_pid_scrubbed} absolute filepaths of potential PID.')
    
    return lines

def tokenize(lines): # list of tokenstrings -> ...
    T0_TOKENIZE = 1000 * time.perf_counter() # in ms
    log(f'\n=== Tokenizing data... ===\n')

    tokencounts = {}
    tokenstream = []

    numIllFormed = 0
    numNoToken = 0

    for line in lines:
        # skip ill-formed tokens
        if len(line) == 0 or line[0] != '\\':
            numIllFormed += 1
            continue
        match = re.search(RE_TOKEN, line)
        if match == None:
            numIllFormed += 1
            continue
        field = match.group(1)
        contents = match.group(2)
        if not field or not contents:
            numNoToken += 1
            continue
        # add well-formed tokens to tokenstream
        if field not in tokencounts:
            tokencounts[field] = 0
        tokencounts[field] += 1
        tokenstream.append((field,contents))

    T1_TOKENIZE = 1000 * time.perf_counter() # in ms

    log(f'DONE in {(T1_TOKENIZE-T0_TOKENIZE):.1f} ms.\n')
    log(f'{numIllFormed} tokens were ill-formed, and {numNoToken} tokens were blank.')
    log(f'{len(tokencounts)} unique field markers encountered across all {len(tokenstream)} tokens in tokenstream.')

    return tokenstream, tokencounts



################
#### PARSER ####
################

def BlankEntry():
	return {
		'isLexeme' : False,
		'L1' : [], # array of strings : eng word/definition
		'catg' : '', # string : part of speech abbreviation
		'L2' : [], # array of objects {L2,form,(audio)}
		'examples' : [], # array of objects {L1,L2,(audio)}
	}
def entryToLexeme(entry):
	entry['isLexeme'] = True
	if len(entry['L2']) > 0: entry['L2'][0]['form'] = TOKEN_PARADIGM_UNDERLYING; # headword is underlying form by default
	if len(entry['examples']) > 0: log(f'WARN L2 example before \\ps in entry for "{SYNONYM_JOIN.join(entry['L1'])}"')
	return entry

def parse(tokenstream):
    T0_PARSE = 1000 * time.perf_counter() # in ms
    log(f'\n=== Parsing tokenstream... ===\n')

    # track handled vs unhandled data to notify user what isn't handled
    recorded_runs = {} # key = space-separated token types ex. "lx ge de", val = num occurences
    non_run_starters = {} # track tokens that don't start runs
    unparsed_tokens = {}
    mr_forms = {} # \mr tokens in standard entries are form names

    # break tokenstream into runs (seq where run-starting token has other tokens attached to it)
    log('Breaking tokenstream into runs...')
    runstreams = [] # list of entries
    runs = [] # runs in current entry
    run = None # tokens in current run
    for field,contents in tokenstream:
        # check if we're starting a new entry
        if field == TOKEN_NEW_ENTRY and len(runs) > 0:
            # wrap up final run of prev entry, then record prev entry
            if run != None: runs.append(' '.join(run))
            runstreams.append(runs)
            # start new entry
            runs = []
            run = []
        # check if we're starting a new run (aka we shouldn't attach to prev run)
        elif field in PARSE_RUN_STARTERS:
            # record prev run
            if run != None: runs.append(' '.join(run))
            # track non-run-starting tokens in prev run
            if run != None:
                for i,v in enumerate(run):
                    if i == 0: continue
                    if v not in non_run_starters: non_run_starters[v] = 0
                    non_run_starters[v] += 1
            # start new run
            run = []
        # add next token to current run
        run.append(field)
    # once tokenstream ends, wrap up final run/entry
    if run != None: runs.append(' '.join(run))
    runstreams.append(runs)

    # parse runs into meaningful entries
    log('Parsing runs into entries...')
    entries = []
    lexemes = []
    current_entry = None
    current_attach_point = None # pointer to last L2 wordform/example

    dbg_terminate = 200

    for field,contents in tokenstream:
        # basic fields
        if field == TOKEN_NEW_ENTRY: # L2 headword
            if current_entry != None:
                if current_entry['isLexeme']:
                    lexemes.append(current_entry)
                    if FLAG_VERBOSE_PARSED:
                        log(f'FINAL LEXEME ENTRY {len(lexemes) - 1}')
                        for k in lexemes[-1]:
                            log(f'    {k} : {lexemes[-1][k]}')
                else:
                    entries.append(current_entry)
                    if FLAG_VERBOSE_PARSED:
                        log(f'FINAL ENTRY {len(entries) - 1}')
                        for k in entries[-1]:
                            log(f'    {k} : {entries[-1][k]}')
            current_entry = BlankEntry()
            for L2 in re.split(RE_SYNONYM_SPLITTER,contents):
                current_entry['L2'].append({'L2':L2, 'form':None})
            if FLAG_VERBOSE_PARSED: log(f'NEXT ENTRY: L2 HEADWORD \\{field} {contents}')
            # current_attach_point = current_entry['L2'][len(current_entry['L2']) - 1]
            current_attach_point = current_entry['L2'][-1]
            # log(f'    Attach point is L2 headword {current_attach_point}')
        elif field == TOKEN_CATG: # convert entry to lexeme if part of speech is x-theme
            if current_entry['catg'] != '': log(f'    WARN Entry "{SYNONYM_JOIN.join(current_entry['L1'])}" has multiple \\ps. Replacing catg "{current_entry['catg']}" with "{contents}".')
            current_entry['catg'] = contents
            if contents in PARSE_LEXEME_CATGS:
                current_entry = entryToLexeme(current_entry)
                if FLAG_VERBOSE_PARSED: log(f'    LEXEME CATG \\{field} {contents}')
            else:
                if FLAG_VERBOSE_PARSED: log(f'    CATG \\{field} {contents}')
        elif field == TOKEN_GLOSS_L1 or field == TOKEN_DEFINITION_L1: # L1 translation
            for L1 in re.split(RE_SYNONYM_SPLITTER,contents):
                current_entry['L1'].append(L1)
            if FLAG_VERBOSE_PARSED: log(f'    L1 \\{field} {contents}')
        # examples, from sequences of \xv \ge (\sfx)
        elif field == TOKEN_EXAMPLE_L2:
            current_entry['examples'].append({'L1':None, 'L2':contents})
            current_attach_point = current_entry['examples'][-1]
            if FLAG_VERBOSE_PARSED: log(f'    NEW EXAMPLE, EXAMPLE L2 \\{field} {contents}')
            # log(f'    Attach point is L2 example {current_attach_point}')
        elif field == TOKEN_EXAMPLE_L1:
            if FLAG_VERBOSE_PARSED: log(f'    EXAMPLE L1 \\{field} {contents}')
            if current_attach_point:
                # check for preceding \xv; create headless example is none
                if 'L1' not in current_attach_point:
                    log(f'    WARN Headless \\xe "{contents}" has no \\xv to attach to in entry "{SYNONYM_JOIN.join(current_entry['L1'])}" of catg "{current_entry['catg']}"')
                    log(f'    Attach point was: {current_attach_point}')
                    current_entry['examples'].append({'L1':None, 'L2':None})
                    current_attach_point = current_entry['examples'][-1]
                # check if we would be overriding prev data
                if current_attach_point['L1'] is not None: log(f'    WARN Multiple \\xe after single \\xv. Replacing L1 "{current_attach_point['L1']}" with "{contents}"')
                current_attach_point['L1'] = contents
                # log(f'    Attach point: {current_attach_point}')
            else:
                log(f'    WARN L1 \\{field} "{contents}" has no attach point for entry "{SYNONYM_JOIN.join(current_entry['L1'])}"')
                log(f'    Attach point: {current_attach_point}')
                log(f'    Current entry: {current_entry}')
        # media (images and audio)
        elif field == TOKEN_MEDIA_AUDIO_HEADWORD or field == TOKEN_MEDIA_AUDIO: # audio attaches to last wordform/example (guaranteed at least L2 headword \lx)
            if FLAG_VERBOSE_PARSED: log(f'    AUDIO \\{field} {contents}')
            # log(f'    Current attach point is: {current_attach_point}')
            if current_attach_point:
                if 'audio' not in current_attach_point: current_attach_point['audio'] = []
                current_attach_point['audio'].append(contents)
            else:
                log(f'    WARN Audio token \\{field} "{contents}" has no attach point in entry "{SYNONYM_JOIN.join(current_entry['L1'])}" of catg "{current_entry['catg']}". Attaching to new headless example.')
                current_entry['examples'].append({'L1':None, 'L2':None, 'audio':[contents]})
                current_attach_point = current_entry['examples'][-1]
                log(f'    Audio stored in: {current_entry['examples'][-1]}')
            # log(f'    Attach point: {current_attach_point}')
        elif field == TOKEN_MEDIA_IMAGE: # images attach to entry rather than L2 wordform
            if FLAG_VERBOSE_PARSED: log(f'    IMAGE \\{field} {contents}')
            if 'images' not in current_entry: current_entry['images'] = []
            current_entry['images'].append(contents)
        # special case: morphology info
        elif field == TOKEN_MORPHOLOGY: # morphology info
            # in lexeme entries, \mr is morphology note
            if current_entry['isLexeme']:
                # no-op
                if FLAG_VERBOSE_PARSED: log(f'    MORPHOLOGY NOTE \\{field} {contents}')
                log(f'    WARN \\mr morphology note pruned. Some notes contain unmarked sensative info, so none can be used.')
                continue
            # in standard entries, \mr is headword form name
            else:
                # \mr is the only field besides \pdl that contains an explicit form label
                if FLAG_VERBOSE_PARSED: log(f'    L2 HEADWORD FORM LABEL \\{field} {contents}')
                if contents not in mr_forms: mr_forms[contents] = 0
                mr_forms[contents] += 1
                current_entry['L2'][0]['form'] = contents
        # n-theme,v-theme,v-base lexeme entries specify wordform catg with special token type
        elif field in WORDFORM_NAMES:
            if FLAG_VERBOSE_PARSED: log(f'    LEXEME ENTRY L2 \\{field} {contents}')
            if not current_entry['isLexeme'] and field != TOKEN_PARADIGM_UNDERLYING and field != TOKEN_VARIANT: log(f'    WARN Lexeme form label "\\{field}" appeared in standard entry "{SYNONYM_JOIN.join(current_entry['L1'])}" of catg "{current_entry['catg']}"')
            for L2 in re.split(RE_SYNONYM_SPLITTER,contents):
                current_entry['L2'].append({'L2':L2, 'form':field})
        # prn-theme lexeme entries specify wordform and catg with \pdl \pdv pairs
        elif field == TOKEN_PARADIGM_LABEL:
            # \pdl is the only field besides \mr that contains an explicit form label (labels next \pdv)
            if FLAG_VERBOSE_PARSED: log(f'    L2 FORM LABEL \\{field} {contents}')
            if current_entry['isLexeme'] == False: log(f'    WARN Lexeme paradigm label \\pdl "{contents}" appeared in standard entry "{SYNONYM_JOIN.join(current_entry['L1'])}" of catg "{current_entry['catg']}"')
            current_entry['L2'].append({'L2':None, 'form':contents}) # create new paradigm with this label
        elif field == TOKEN_PARADIGM_VERNACULAR:
            if FLAG_VERBOSE_PARSED: log(f'    LEXEME ENTRY L2 \\{field} {contents}')
            if current_entry['isLexeme'] == False: log(f'    WARN Lexeme paradigm vernacular \\pdv "{contents}" appeared in standard entry "{SYNONYM_JOIN.join(current_entry['L1'])}" of catg "{current_entry['catg']}"')
            if len(current_entry['L2']) <= 0:
                log(f'    WARN Lexeme paradigm vernacular \\pdv "{contents}" had no paradigm vernacular \\pdl to attach to (headless paradigm).')
                current_entry['L2'].append({'L2':contents, 'form':None}) # if we didn't encounter \pdl before this \pdv, we're a headless paradigm
            else:
                if current_entry['L2'][-1]['L2'] is not None: log(f'    WARN \\pdl "{current_entry['L2'][-1]['form']}" had \\pdv. Replacing paradigm L2 "{current_entry['L2'][-1]['L2']}" with "{contents}".')
                current_entry['L2'][-1]['L2'] = contents
        # default: log unhandled tokens to ensure no data is lost silently
        else:
            if FLAG_VERBOSE_UNPARSED: log(f'=== UNHANDLED \\{field} "{contents}"')
            if field not in unparsed_tokens: unparsed_tokens[field] = 0
            unparsed_tokens[field] += 1
        
        # dbg_terminate -= 1
        # if dbg_terminate <= 0: break

    T1_PARSE = 1000 * time.perf_counter() # in ms

    log(f'\nDONE in {(T1_PARSE-T0_PARSE):.1f} ms.\n')

    # index runs
    for runs in runstreams:
        for run in runs:
            if run not in recorded_runs: recorded_runs[run] = 0
            recorded_runs[run] += 1

    # log feedback on entries/runs
    log(f'Detected {len(entries)} standard entries and {len(lexemes)} lexeme entries.')
    log(f'Detected {len(non_run_starters)} non-run-starting tokens:')
    for field in non_run_starters:
        log(f'    "{field}" : {non_run_starters[field]} occurences')
    log(f'{len(unparsed_tokens)} token types were completely unhandled:')
    for field in unparsed_tokens:
        log(f'    "{field}" : {unparsed_tokens[field]} occurences{' (PRUNED NOTE)' if field in NOTE_NAMES else ''}')
    if FLAG_VERBOSE:
        log(f'{len(recorded_runs)} unique runs encountered:')
        for run in recorded_runs:
            log(f'    "{run}" : {recorded_runs[run]}')

    return entries,lexemes, recorded_runs,non_run_starters,unparsed_tokens,mr_forms



####################
#### INDEX/SORT ####
####################

def IndexCard(type,id,word='',catg='',hasAudio=False,hasImages=False):
    return {
        'isLexeme' : bool(type),
        'id' : int(id),
        'word' : str(word),
        'catg' : str(catg),
        'hasAudio' : bool(hasAudio),
        'hasImages' : bool(hasImages),
    }

def indexCardSorter(a,b):
    # given two index cards, case-insensative sort by (word,catg)
    keyA = f'{a['word']}{SYNONYM_JOIN}{a['catg']}'.lower()
    keyB = f'{b['word']}{SYNONYM_JOIN}{b['catg']}'.lower()
    if keyA < keyB: return -1
    if keyA > keyB: return 1
    return 0

def index(entries,lexemes):
    T0_INDEX = 1000 * time.perf_counter() # in ms
    log(f'\n=== Indexing entry data... ===\n')

    indexL1 = []
    indexL2 = []

    # index standard entries
    log(f'Indexing standard entries...')
    for i,entry in enumerate(entries):
        # scan images
        hasImages = False
        if 'images' in entry and len(entry['images']) > 0: hasImages = True
        # scan audio
        hasAudio = False
        for form in entry['L2']:
            if 'audio' in form and len(form['audio']) > 0:
                hasAudio = True
                break
        for example in entry['examples']:
            if 'audio' in example and len(example['audio']) > 0:
                hasAudio = True
                break
        # scan words
        for raw in entry['L1']:
            synonyms = re.split(RE_SYNONYM_SPLITTER, raw)
            if ';' in raw: log(f'    WARN Standard entry L1 "{raw}" still contained semicolon after parsing!')
            for L1 in synonyms:
                indexL1.append(IndexCard(CARD_TYPE_ENTRY,i,L1,entry['catg'],hasAudio,hasImages))
        for form in entry['L2']:
            synonyms = re.split(RE_SYNONYM_SPLITTER, form['L2'])
            if ';' in raw: log(f'    WARN Standard entry L2 "{raw}" still contained semicolon after parsing!')
            for L2 in synonyms:
                indexL2.append(IndexCard(CARD_TYPE_ENTRY,i,L2,entry['catg'],hasAudio,hasImages))
    # index lexeme entries
    log(f'Indexing lexeme entries...')
    for i,entry in enumerate(lexemes):
        # scan images
        hasImages = False
        if 'images' in entry and len(entry['images']) > 0: hasImages = True
        # scan audio
        hasAudio = False
        for form in entry['L2']:
            if 'audio' in form and len(form['audio']) > 0:
                hasAudio = True
                break
        for example in entry['examples']:
            if 'audio' in example and len(example['audio']) > 0:
                hasAudio = True
                break
        # scan words
        for raw in entry['L1']:
            synonyms = re.split(RE_SYNONYM_SPLITTER, raw)
            if ';' in raw: log(f'    WARN Lexeme entry L1 "{raw}" still contained semicolon after parsing!')
            for L1 in synonyms:
                indexL1.append(IndexCard(CARD_TYPE_LEXEME,i,L1,entry['catg'],hasAudio,hasImages))
        for form in entry['L2']:
            synonyms = re.split(RE_SYNONYM_SPLITTER, form['L2'])
            if ';' in raw: log(f'    WARN Lexeme entry L2 "{raw}" still contained semicolon after parsing!')
            for L2 in synonyms:
                indexL2.append(IndexCard(CARD_TYPE_LEXEME,i,L2,entry['catg'],hasAudio,hasImages))

    log(f'Sorting entries...')
    indexL1 = sorted(indexL1, key=cmp_to_key(indexCardSorter))
    indexL2 = sorted(indexL2, key=cmp_to_key(indexCardSorter))

    T1_INDEX = 1000 * time.perf_counter() # in ms

    log(f'\nDONE in {(T1_INDEX-T0_INDEX):.1f} ms.\n')
    
    log(f'Sorted {len(indexL1)} L1 words and {len(indexL2)} L2 words.')

    # log(f'Sample of indexL1:')
    # for i,card in enumerate(indexL1):
    #     log(f'    {card}')
    #     if i > 25: break
    # log(f'Sample of indexL2:')
    # for i,card in enumerate(indexL2):
    #     log(f'    {card}')
    #     if i > 25: break

    return indexL1,indexL2



###############################################################################

########################
#### GIT AUTOMATION ####
########################

RE_GIT_STATUS = re.compile(r'(.)(.) (.+)') # match git status --porcelain "XY folder/file.txt"

# manifest of generated files to be added/commited/pushed
GIT_MANIFEST_CONTENT = [
    # clean toolbox output
    f'{DIR_DATA}/{FILE_DATABASE_OUTPUT}', # no ext
    f'{DIR_DATA}/{FILE_DATABASE_OUTPUT}.json',
    # sitemaps
    f'{FILE_SITEMAP}.txt',
    f'{FILE_SITEMAP}.xml',
]
# manifest of log/status files that are modified during content commit
# (must be added in silent followup commit)
GIT_MANIFEST_LOGS = [
    f'{DIR_UPDATE}/{FILE_LOG}.txt',
]

# Automated Git Workflow:
    # git --version -> check if git installed
    # sync external changes
        # (optionally ensure we're on main branch)
        # git fetch
        # git reset --hard origin/main
            # fixes accidental modifications/deletions of local files
            # leaves untracked local files untouched (update/toolbox-output.txt should always remain untracked)
    # [execute script and generate files]
    # sync newly generated files
        # for file in content_manifest:
            # git add file
        # git status -> check what files have changed
        # git commit -m "automated update content"
        # git push
        # git status -> confirm push succeeded
    # add log/status files in un-logged followup commit
        # for file in logs_manifest:
            # git add file
        # git commit -m "automated update logs"
        # git push

# check that git is installed
def git_version():
    log(f'>> git --version\n')
    with subprocess.Popen(['git', '--version'], cwd='..', stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
        stdout_raw, stderr_raw = process.communicate()
        stdout, stderr = stdout_raw.decode(), stderr_raw.decode()
        if process.returncode == 0:
            log(stdout)
            if 'git version' not in stdout:
                log(f'Unable to detect git version. Aborting...')
                return { 'success': False, 'error': 'Unable to detect git version.' }
            else:
                return { 'success': True }
        else:
            log(f'ERROR\n{stderr}')
            return { 'success': False, 'error': stderr }
# check remote for new commits
def git_fetch():
    # log(f'STUB >> git fetch')
    # log(f'STUB >> git reset --hard origin/main\n')
    # return { 'success': True }

    # automated updates to data should generally be performed from main branch
    # however, the check enforcing this as a hard requirement has been disabled for flexibility
    # this check was not tested in development; do so before re-enabling it in the future

    # # make sure we're on the correct branch (main)
    # need_checkout_main_branch = False
    # log(f'>> git branch --show-current\n')
    # with subprocess.Popen(['git', 'branch', '--show-current'], cwd='..', stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
    #     stdout_raw, stderr_raw = process.communicate()
    #     stdout, stderr = stdout_raw.decode(), stderr_raw.decode()
    #     if process.returncode == 0:
    #         log(stdout)
    #         log(f'Current branch is "{stdout}"')
    #         if stdout != 'main': need_checkout_main_branch = True
    #     else:
    #         log(f'ERROR\n{stderr}')
    #         return { 'success': False, 'error': stderr }
    # if need_checkout_main_branch:
    #     # switch branches if needed
    #     log(f'>> git checkout main\n')
    #     with subprocess.Popen(['git', 'checkout', 'main'], cwd='..', stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
    #         stdout_raw, stderr_raw = process.communicate()
    #         stdout, stderr = stdout_raw.decode(), stderr_raw.decode()
    #         if process.returncode == 0:
    #             if stdout == '':
    #                 log(f'DONE')
    #             else:
    #                 log(stdout)
    #         else:
    #             log(f'ERROR\n{stderr}')
    #             return { 'success': False, 'error': stderr }
    #     # make sure switch succeeded
    #     log(f'>> git branch --show-current\n')
    #     with subprocess.Popen(['git', 'branch', '--show-current'], cwd='..', stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
    #         stdout_raw, stderr_raw = process.communicate()
    #         stdout, stderr = stdout_raw.decode(), stderr_raw.decode()
    #         if process.returncode == 0:
    #             log(stdout)
    #             log(f'Current branch is "{stdout}"')
    #             if stdout != 'main':
    #                 log(f'Failed to switch to main branch. Aborting...')
    #                 return { 'success': False, 'error': 'Failed to switch to main branch.' }
    #         else:
    #             log(f'ERROR\n{stderr}')
    #             return { 'success': False, 'error': stderr }

    # grab updates from remote
    log(f'>> git fetch\n')
    with subprocess.Popen(['git', 'fetch'], cwd='..', stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
        stdout_raw, stderr_raw = process.communicate()
        stdout, stderr = stdout_raw.decode(), stderr_raw.decode()
        if process.returncode == 0:
            if stdout == '':
                log(f'DONE')
            else:
                log(stdout)
        else:
            log(f'ERROR\n{stderr}')
            return { 'success': False, 'error': stderr }
    # reset any local modifications/deletions of tracked files to ensure clean working tree
    # (untracked local files will be left untouched)
    GIT_ORIGIN = 'origin/main'
    log(f'>> git reset --hard {GIT_ORIGIN}\n')
    with subprocess.Popen(['git', 'reset', '--hard', GIT_ORIGIN], cwd='..', stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
        stdout_raw, stderr_raw = process.communicate()
        stdout, stderr = stdout_raw.decode(), stderr_raw.decode()
        if process.returncode == 0:
            if stdout == '':
                log(f'DONE')
            else:
                log(stdout)
        else:
            log(f'ERROR\n{stderr}')
            return { 'success': False, 'error': stderr }
    return { 'success': True }
# add all files in manifest
def git_add_all(files=[]):
    log(f'Adding {len(files)} files from manifest...')
    for file in files:
        log(f'>> git add {file}')
        with subprocess.Popen(['git', 'add', file], cwd='..', stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
            stdout_raw, stderr_raw = process.communicate()
            stdout, stderr = stdout_raw.decode(), stderr_raw.decode()
            if process.returncode == 0:
                if stdout != '': log(stdout)
            else:
                log(f'ERROR\n{stderr}')
                return { 'success': False, 'error': stderr }
    log(f'All files added.')
    return { 'success': True }
# check whether there are changes to commit
def git_status():
    log(f'>> git status --porcelain=v1 -b\n')
    with subprocess.Popen(['git', 'status', '--porcelain=v1', '-b'], cwd='..', stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
        stdout_raw, stderr_raw = process.communicate()
        stdout, stderr = stdout_raw.decode(), stderr_raw.decode()
        if process.returncode == 0:
            log(stdout)
            num_files_updated = 0
            lines = re.split('\n', stdout)
            for line in lines:
                if line == '': continue
                match = re.fullmatch(RE_GIT_STATUS, line)
                if match == None:
                    log(f'Regex failed to match git status output line "{line}". Aborting...')
                    return { 'success': False, 'error': f'Regex failed to match git status output line "{line}".' }
                (x,y,file) = match.groups()
                # log(f'X=[{x}],Y=[{y}],FILE=[{file}]')
                if x == 'M' and file in GIT_MANIFEST_CONTENT:
                    num_files_updated += 1 # local modification that needs to be pushed
            log(f'{num_files_updated} files have been modified and are ready to be committed.')
            return { 'success': True, 'num_files_updated': num_files_updated }
        else:
            log(f'ERROR\n{stderr}')
            return { 'success': False, 'error': stderr }
# commit changes
def git_commit(message='automated update'):
    log(f'>> git commit -m "{message}"\n')
    with subprocess.Popen(['git', 'commit', '-m', message], cwd='..', stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
        stdout_raw, stderr_raw = process.communicate()
        stdout, stderr = stdout_raw.decode(), stderr_raw.decode()
        if process.returncode == 0:
            log('AUTO GIT COMMIT')
            log(stdout)
            # empty commit => print human-readable `git status`, then "no changes added to commit"
            if 'no changes added to commit' in stdout:
                log('No changes detected. Nothing added to commit.')
                return { 'success': False, 'error': 'No changes detected. Nothing added to commit.' }
            else:
                return { 'success': True }
        else:
            log(f'AUTO GIT COMMIT STDOUT\n{stderr}')
            log(f'ERROR\n{stderr}')
            return { 'success': False, 'error': stderr }
# push changes
def git_push():
    log(f'>> git push\n')
    with subprocess.Popen(['git', 'push'], cwd='..', stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
        stdout_raw, stderr_raw = process.communicate()
        stdout, stderr = stdout_raw.decode(), stderr_raw.decode()
        if process.returncode == 0:
            log(stdout)
            if stdout == 'Everything up-to-date':
                log('No changes committed. Nothing to push.')
                return { 'success': False, 'error': 'No changes committed. Nothing to push.' }
            else:
                log('DONE')
                return { 'success': True }
        else:
            log(f'ERROR\n{stderr}')
            return { 'success': False, 'error': stderr }
        
# add/commit/push log file(s)
    # this gets its own function because log has been terminated
    # must use normal print statements only
def git_sync_log():
    # add
    files = GIT_MANIFEST_LOGS
    print(f'Adding {len(files)} files from manifest...')
    for file in files:
        print(f'>> git add {file}')
        with subprocess.Popen(['git', 'add', file], cwd='..', stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
            stdout_raw, stderr_raw = process.communicate()
            stdout, stderr = stdout_raw.decode(), stderr_raw.decode()
            if process.returncode == 0:
                if stdout != '': print(stdout)
            else:
                print(f'ERROR\n{stderr}')
                return { 'success': False, 'error': stderr }
    print(f'All files added.')
    # commit
    message = 'automated database update (log file)'
    print(f'>> git commit -m "{message}"\n')
    with subprocess.Popen(['git', 'commit', '-m', message], cwd='..', stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
        stdout_raw, stderr_raw = process.communicate()
        stdout, stderr = stdout_raw.decode(), stderr_raw.decode()
        if process.returncode == 0:
            print(stdout)
            # empty commit => print human-readable `git status`, then "no changes added to commit"
            if 'no changes added to commit' in stdout:
                print('No changes detected. Nothing added to commit.')
                return { 'success': False, 'error': 'No changes detected. Nothing added to commit.' }
        else:
            print(f'ERROR\n{stderr}')
            return { 'success': False, 'error': stderr }
    # push
    print(f'>> git push\n')
    with subprocess.Popen(['git', 'push'], cwd='..', stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
        stdout_raw, stderr_raw = process.communicate()
        stdout, stderr = stdout_raw.decode(), stderr_raw.decode()
        if process.returncode == 0:
            print(stdout)
            if stdout == 'Everything up-to-date':
                print('No changes committed. Nothing to push.')
                return { 'success': False, 'error': 'No changes committed. Nothing to push.' }
            else:
                print('DONE')
                return { 'success': True }
        else:
            print(f'ERROR\n{stderr}')
            return { 'success': False, 'error': stderr }
    # ret
    return { 'success': True }



###############################################################################

today = datetime.datetime.now()

# log to buffer until repo has reset
USE_BUFFER_LOG = True

log(f'////////')
log(f'//// WIKCHAMNI AUTO-UPDATE SCRIPT')
log(f'//// Last run {today.strftime('%b %d %Y %H:%M')}')
log(f'//// For web domain {URL_BASE}')
log(f'////////')

def main(IN):
    T0_TOTAL = 1000 * time.perf_counter() # in ms

    # check that git is installed
    log('Checking git installation...')
    git_output = git_version()
    if not git_output['success']: return # exit on error
    # check the cloud for updates
    log('Checking for updates to code...')
    git_output = git_fetch()
    if not git_output['success']: return # exit on error

    # switch to main log file once repo reset complete
    global USE_BUFFER_LOG
    USE_BUFFER_LOG = False
    global logfile
    open_logfile()
    log(logbuff)

    # process data
    lines_clean = scrub(IN.read())
    tokenstream,tokencounts = tokenize(lines_clean)
    entries,lexemes, recorded_runs,non_run_starters,unparsed_tokens,mr_forms = parse(tokenstream)
    indexL1,indexL2 = index(entries,lexemes)

    log(f'\n=== Generating output files... ===\n')

    # write clean Toolbox SF output
    with open(f'..\\assets\\data\\{FILE_DATABASE_OUTPUT}', 'w', encoding='utf-8') as OUT:
        T0_WRITE = 1000 * time.perf_counter() # in ms
        log(f'Writing sterilized data back to Toolbox SF...')
        for i,line in enumerate(lines_clean):
            if i > 0 and line[:3] == '\\lx': OUT.write('\n') # re-separate entries for human-readability
            OUT.write(f'{line}\n')
        T1_WRITE = 1000 * time.perf_counter() # in ms
        log(f'DONE in {(T1_WRITE-T0_WRITE):.1f} ms')

    # write json output
    with open(f'..\\assets\\data\\{FILE_DATABASE_OUTPUT}.json', 'w', encoding='utf-8') as OUT:
        T0_WRITE = 1000 * time.perf_counter() # in ms
        log(f'Baking database into web-compatible JSON...')
        OUT.write(json.dumps({'entries' : entries, 'lexemes' : lexemes}))
        T1_WRITE = 1000 * time.perf_counter() # in ms
        log(f'DONE in {(T1_WRITE-T0_WRITE):.1f} ms')

    # build sitemap.txt
    log(f'Building sitemap for {len(STATIC_PAGES)} static pages, {len(indexL1)} English words, and {len(indexL2)} Wikchamni words...')
    T0_SITEMAP = 1000 * time.perf_counter() # in ms
    with open(f'..\\{FILE_SITEMAP}.txt', 'w', encoding='utf-8') as OUT:
        log(f'    Builing sitemap.txt...')
        for url in STATIC_PAGES:
            OUT.write(f'{url}')
            OUT.write(f'\n')
        # sitemap urls must escape ['&"<>]
        for i in range(len(indexL1)):
            OUT.write(f'{URL_BASE}/lexicon?lang={LANG_ENG}&amp;entry={i}')
            OUT.write(f'\n')
        for i in range(len(indexL2)):
            OUT.write(f'{URL_BASE}/lexicon?lang={LANG_WIK}&amp;entry={i}')
            if i < len(indexL2) - 1:
                OUT.write(f'\n')
    with open(f'..\\{FILE_SITEMAP}.xml', 'w', encoding='utf-8') as OUT:
        log(f'    Builing sitemap.xml...')
        OUT.write(f'<?xml version="1.0" encoding="UTF-8"?>\n')
        OUT.write(f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for url in STATIC_PAGES:
            OUT.write(f'\t<url>\n\t\t<loc>{url}</loc>\n\t</url>\n')
        for i in range(len(indexL1)):
            url = f'{URL_BASE}/lexicon?lang={LANG_ENG}&amp;entry={i}'
            OUT.write(f'\t<url>\n\t\t<loc>{url}</loc>\n\t</url>\n')
        for i in range(len(indexL2)):
            url = f'{URL_BASE}/lexicon?lang={LANG_WIK}&amp;entry={i}'
            OUT.write(f'\t<url>\n\t\t<loc>{url}</loc>\n\t</url>\n')
        OUT.write(f'</urlset>')
    T1_SITEMAP = 1000 * time.perf_counter() # in ms
    log(f'DONE in {(T1_SITEMAP-T0_SITEMAP):.1f} ms')

    # TODO: should we also add alphabetized indices to json? or even full index cards?

    # log(f'DBG Building diffable wordlists...')
    # with open(f'wordlist-L1-py.txt', 'w', encoding='utf-8') as OUT:
    #     for card in indexL1:
    #         OUT.write(f'{card['word']}\n')
    # with open(f'wordlist-L2-py.txt', 'w', encoding='utf-8') as OUT:
    #     for card in indexL2:
    #         OUT.write(f'{card['word']}\n')
    # log(f'DONE')

    log(f'\n=== Pushing changes to cloud... ===\n')

    # push newly-generated files to the cloud
    git_output = git_add_all(GIT_MANIFEST_CONTENT)
    if not git_output['success']: return # exit on error
    git_output = git_status()
    if git_output['num_files_updated'] == 0:
        log('\nNo changes detected. Nothing to commit or push.\n')
    else:
        git_output = git_commit('automated database update')
        if not git_output['success']: return # exit on error
        git_output = git_push()
        if not git_output['success']: return # exit on error
    
    T1_TOTAL = 1000 * time.perf_counter() # in ms

    log(f'\n=== SUMMARY OF TASKS ===\n')

    # TODO: print summary of work
        # pre-processing
            # multiline fields rejoined
            # PID scrubbed
            # (list of fields and occurences)
        # tokenizer
            # ill-formed
            # blank
            # (list of fields and occurences)
        # parser
            # (runs)
            # (unparsed tokens)
        # indexer/sorter
            # num standard vs lexeme entries
            # num entries with audio/image
            # num L1 vs L2 entries
        # [possibly read prev sitemap.txt to detect addition/removal of words/entries]
    log(f'\nAll tasks DONE in {(T1_TOTAL-T0_TOTAL):.1f} ms\n')

    # update succeeded, so terminate log file and push it in a second commit
    close_logfile()
    git_output = git_sync_log()
    if not git_output['success']: return # exit on error

    print('\nALL WORK DONE')
    print('PROGRAM TERMINATES SUCCESSFULLY')

    

# check for "toolbox-output" (extensionless)
log('')
try:
    log(f'Checking for "{FILE_DATABASE_INPUT}" (no file extension)...')
    with open(f'{FILE_DATABASE_INPUT}', 'r', encoding='utf-8') as IN:
        log(f'Found "{FILE_DATABASE_INPUT}" (no file extension)!')
        main(IN)
# else, check for "toolbox-output.txt"
except IOError:
    try:
        log(f'Checking for "{FILE_DATABASE_INPUT}.txt"...')
        with open(f'{FILE_DATABASE_INPUT}.txt', 'r', encoding='utf-8') as IN:
            log(f'Found "{FILE_DATABASE_INPUT}.txt"!')
            main(IN)
# else, no toolbox data was found
    except IOError:
        log('')
        log(f'ERROR Couldn\'t find "{FILE_DATABASE_INPUT}" (no extension) or "{FILE_DATABASE_INPUT}.txt".')
        log(f'Make sure to rename your toolbox output file appropriately.')
