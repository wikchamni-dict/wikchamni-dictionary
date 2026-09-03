# Wikchamni Dictionary
A half-century long effort to document the Wikchamni Yokuts language spoken in and around California's San Joaquin Valley. This dictionary is the product of Dr. Geoffrey Gamble's work with native speakers Cecile Silva and Mary Friedrichs to document the language, history, and culture of their people. Explore the rich catalogue of audio examples of words, sentences, and traditional stories provided by Cecile and Mary, now online for all to enjoy.

Visit the dictionary here: https://wikchamnidictionary.library.fresnostate.edu/

## Research Citation (MLA)
> Gamble, Geoffrey. *A Wikchamni Dictionary.* Fresno State Library, California State University, Fresno, 1 September 2019, wikchamnidictionary.library.csufresno.edu.

Note that the live dictionary uses MP3 audio optimized for the web browser environment. For linguistic research, you are encouraged to use the higher quality WAV files available in this repository's "[audio-wav](https://github.com/wikchamni-dict/wikchamni-dictionary/tree/main/audio-wav)" folder.

## Updating the Dictionary
The Wikchamni Dictionary is dynamically built from the output of [SIL Toolbox](http://www.fieldlinguiststoolbox.org), the lexicon software originally used by Dr. Gamble.

Jump to section:

[Exporting Data From SIL Toolbox]\
[Installing Python and Git]\
[Rebuilding the Dictionary with `update.py`]

[Adding New Images/Audio]\
[Manually Editing Data]\
[Switching Web Domains]\
[Adding Support For New Grammatical Cases]

### Exporting Data From SIL Toolbox
1. Open the project in SIL Toolbox.
2. Click File > Export.
3. Select "Standard Format" from the list and click Ok, then click Ok again and save the output.
4. (Optional) Toolbox's "Standard Format" doesn't have any file extension by default, but you can safely add a `.txt` extension and view it in your text editor of choice.

### Installing Python and Git
You must have both Python and Git installed to update the dictionary with `update.py`.

Installing Python is fairly straightforward. Simply grab the appropriate "Latest Python 3 Release" installer and follow its instructions for [Windows](https://www.python.org/downloads/windows/), [Mac](https://www.python.org/downloads/macos/), or [Linux](https://www.python.org/downloads/source/).

Git takes a bit more work to set up. You can follow the [Git installation guide](https://github.com/git-guides/install-git) to get the software itself, but in order to push updates you'll need a GitHub account with 2FA. If you don't have one yet, create one from [the GitHub website](https://github.com/) and follow the guide for [setting up 2-Factor Authentication](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication). Once that's all done, you'll need to "log in" to Git with your GitHub username and noreply email, which you can locate via [this guide](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address).

To log in with the Git GUI, you must clone this repository to your machine and open it. Next go to `Edit > Options`, enter your username and noreply email at the top of the "Global (All Repositories)" section, then click "Save".

Alternatively, you can log in from Git Bash (or another terminal) by running these commands:
```
git config --global user.name "Your Username"
git config --global user.email "12345678+Username@users.noreply.github.com"
```

Once that's all done, you're ready to push updates to the dictionary.

### Rebuilding the Dictionary with `update.py`
1. Export data from Toolbox in "Standard Format" and rename the file to `toolbox-output` or `toolbox-output.txt` (the update script checks for both).
2. Place the `toolbox-output` file in the "update" folder, next to `update.py`. (Replacing the previous version of `toolbox-output` if necessary.)
3. Open a terminal inside the "update" folder and run `python update.py`. It may take a minute or two to push your changes to the cloud, depending on your internet speeds.

Once `update.py` is done, it will print "ALL WORK DONE / PROGRAM TERMINATES SUCCESSFULLY" and exit.

If anything goes wrong during the update process, `update.py` will print an error instead and exit early. Check `log.txt` in the update folder and either try to fix the error, or send the log file to someone who can.

## Advanced Updates
This section contains instructions for updating things that aren't handled automatically by `update.py`.

#### Adding New Images/Audio
Unfortunately, Toolbox doesn't actually attach images or audio to a project. Instead, "adding" media to an entry saves a link to the file on your hard drive. In addition to presenting a security risk, this means the project leaves behind all media when moved between computers or exported into Standard Format.

`update.py` changes all links into relative paths that look for media files in the "media" folder of this repository (as well as modifying audio links to MP3 instead of WAV). To make media available to the live dictionary, you must copy it into the "media" folder and manually push it to the cloud with Git.

1. Add all new audio and images into the "media" folder. Most image formats are accepted, but audio MUST be in MP3 format due to limitations during development.
2. (Optional) If working with high-quality WAV audio, place the WAV version in the "audio-wav" folder for archival purposes, and create an MP3 version to place in the "media" folder for use in the live dictionary.
3. Open a terminal and run the following commands one by one to push the new files to the cloud with Git:
```
git pull
git add media
git commit -m "add new media"
git push
```

#### Manually Editing Data
If you are unable to use Toolbox for any reason, or if you don't have access to the original project, Toolbox's "Standard Format" is human-readable. You can make a copy of `assets/data/toolbox-output-clean` and edit it directly in your text editor of choice. Then, treat your edited copy as the new Toolbox output file when rebuilding the dictionary.

#### Switching Hosts / Web Domains
1. Set the contents of the `CNAME`/`A`/etc DNS records as required by your new host setup.
2. Edit the sitemap URL in `robots.txt` to point to where the new sitemap will be. This requires an absolute path with a protocol, ie `Sitemap: https://example.com/sitemap.xml`.
3. Open `update/update.py` in a code editor, and set the string variable `URL_BASE` to the root URL of the new domain. This requires an absolute path with a protocol and NO TRAILING SLASH, ie `URL_BASE = 'https://example.com'`.
4. Run `update.py` as if rebuilding the dictionary. This will re-generate `sitemap.xml` and `sitemap.txt` with the new URL.

#### Adding Support For New Grammatical Cases

SIL Toolbox allows users to define custom datafields to structure their linguistic data as they see fit. Although this makes Toolbox very powerful, the lack of standardization also makes it difficult for other programs to work with the data.

Dr. Gamble has created several custom datafields to represent grammatical cases, and occasionally adds new ones. If he does, you can find them by searching `update/log.txt` for a section that looks like "X token types were completely unhandled:". This will list the number of occurences of each datafield that isn't used by the live dictionary.

The process of adding new wordforms (aka paradigms or grammatical cases) has been somewhat streamlined, but you will need to edit code files. Suppose a new datafield \dmst is added to represent the "Demonstration" grammatical case. You can declare the token type by adding a new constant `TOKEN_PARADIGM_DEMONSTRATION = 'dmst'` to the token inventory section of `update/update.py`. Then, you can mark the new token as a wordform and define its on-screen label by adding it to the `WORDFORM_NAMES` dictionary:
```
WORDFORM_NAMES = {
    ...
    TOKEN_PARADIGM_DEMONSTRATION : 'Demonstration',
    ...
}
```
These changes must then be mirrored in `assets/js/parse-toolbox-output.js` by adding `const TOKEN_PARADIGM_DEMONSTRATION = 'dmst';` to its token inventory section and appending to its version of WORDFORM_NAMES:
```
let WORDFORM_NAMES = Object.freeze({
    ...
    [TOKEN_PARADIGM_DEMONSTRATION] : 'Demonstration',
    ...
});
```

New types of notes can be similarly added, except that they would be registered in the `NOTE_NAMES` dictionary instead of `WORDFORM_NAMES`. However, notes are not currently shown in the live dictionary. Dr. Gamble was inconsistent in his use of note types, for example using generic \nt notes to record both anthorpological observations and linguistic similarities to other Yokuts languages, instead of the intended \na Anthropology Note. Dr. Golston has instructed that since some of the anthropology is sensative and must be kept semi-private, *no* notes can be shown until someone has combed through every note in the database and applied the correct typing.

If you need to add support for a datafield that isn't a wordform or note, you will unfortunately have to edit the tokenizer-parser itself in both `update/update.py` and `assets/js/parse-toolbox-output.js`, as well as adding any relevant UI in `lexicon.html` and `lexicon.js`. You can read about how Toolbox's Standard Format functions in the "Toolbox Reference Manual" and "MDF Documentation" sections of [Toolbox's website](http://www.fieldlinguiststoolbox.org). The structure of the tokenizer-parser is described in the Technical Details section below.

## Technical Details (aka "What `update.py` Does")

### Preprocess Toolbox Output
...

### Parse Data to Check Validity
...

### Build Sitemap
...