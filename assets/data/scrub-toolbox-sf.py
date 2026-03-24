import re
import time

FLAG_VERBOSE = True

INPUT = 'Wikchamni Dictionary update 8-09-26'
# INPUT = 'toolbox-output-clean.txt' # re-run script on output to verify that it is a projection (no further mutation on subsequent runs)
OUTPUT = 'toolbox-output-clean.txt'
DIR_MEDIA = 'assets\\media'

RE_PID_FILEPATH = re.compile(r'^(.*)[A-Za-z]:[^\n]*(\\[^\\\n]+)$') # good enough for now, since no datafield contains more than one filepath and all files are stored in the same directory
RE_TOKEN = re.compile(r'^\\([^\s]+)(?: ([^\n]*))?$')



"""
SIL Toolbox exports projects in human-readable "SF" format.
    From Toolbox click File > Export, select "Standard Format" from the list and click Ok, then click Ok again and save the output.
    Exported SF files do not have any file extension.
SF exports require pre-processing before they are cleared for use.
    Toolbox uses CRLF format, but LF is simpler to parse and has more consistent cross-browser handling.
    Depending how long ago datafields were entered, they may contain a mix of single quotes, angled apostrophes, or vertical apostrophes. These must be normalized for searches to work correctly.
    Fields longer than 90 characters are split across multiple lines and must be rejoined.
    Toolbox stores absolute paths to attached media files, which can reveal PID.
"""



with open(INPUT, 'r', encoding='utf-8') as file_in:
    T0_SCRUB = 1000 * time.perf_counter() # in ms
    print(f'Scrubbing file "{INPUT}"')

    # pre-process text
    text_raw = re.sub(r'[\n\r]+', '\n', file_in.read()) # scrub CRLF
    text_raw = re.sub(r'[‘’ʼ]', '\'', text_raw) # single quotes [‘’] char codes 8216,8217 and apostrophe [ʼ] char code 700 normalize to ASCII ['] char code 39
    text_raw = text_raw.strip() # normalize whitespace

    # rejoin long datafields that were split across multiple lines
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
            if FLAG_VERBOSE: print(f'Rejoining multiline datafield: "{lines[i-1]}" / "{lines[i]}"')
            num_multiline += 1
            lines[i - 1] = f'{lines[i - 1]} {lines[i]}' # cast as string
            lines.pop(i)
            i -= 1
        i += 1

    # scrub PID (convert absolute paths to relative paths)
    num_pid_scrubbed = 0
    for i,line in enumerate(lines):
        match = RE_PID_FILEPATH.match(line)
        if not match: continue
        marker,filename = match.groups()
        if FLAG_VERBOSE: print(f'From "{line}"')
        if FLAG_VERBOSE: print(f'To "{marker}{DIR_MEDIA}{filename}"')
        lines[i] = f'{marker}{DIR_MEDIA}{filename}'
        num_pid_scrubbed += 1

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
            print(f'ERR Ill-formed token "{line}"')
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

    T1_SCRUB = 1000 * time.perf_counter() # in ms

    # print feedback
    if FLAG_VERBOSE:
        for i,line in enumerate(lines):
            if i > 220: break
            print(f'Line {i}: {line}')
    print(f'{num_fields} field markers encountered across {num_tokens} tokens:')
    for field in ordered_fields:
        print(f'    {field}: {field_counts[field]}')
    print(f'{num_invalid} tokens were ill-formed, and {num_blank} tokens had blank contents')
    print(f'Processed {len(lines)} tokens in {(T1_SCRUB-T0_SCRUB):.1f} ms')
    print(f'Rejoined {num_multiline} multiline tokens')
    print(f'Scrubbed {num_pid_scrubbed} absolute filepaths of potential PID')

    # write scrubbed results to disk
    with open(OUTPUT, 'w', encoding='utf-8') as file_out:
        for i,line in enumerate(lines):
            if i > 0 and line[:3] == '\\lx':
                file_out.write('\n') # re-separate entries for human-readability
            file_out.write(f'{line}\n')
    print(f'Output saved to "{OUTPUT}"')