
// Create a trigram lookup index for Cities to get best matches
// for a search query string to use in input autocomplete.

const index = {};

const CityIndex = {

    init: function() {
        Cities.forEach((city) => {
            var trigrams = this.getTrigrams(city.toLowerCase().trim());
            trigrams.forEach(function(trigram) {
                if (!index[trigram]) {
                    index[trigram] = [];
                }
                index[trigram].push(city);
            });
        });
    },

    getTrigrams: function(str) {
        var trigrams = [];
        for (var i = 0; i < str.length - 2; i++) {
            trigrams.push(str.substr(i, 3));
        }
        return trigrams;
    },

    // Find the top 10 matches for the query,
    // sorted by the match score so that the
    // top match is the first entry in the 
    // returned result array.
    lookup: function(query) {
        query = query.toLowerCase().trim();
        // matches is a map cityName -> score
        var matches = new Map();
        var trigrams = this.getTrigrams(query);
        trigrams.forEach((trigram) => {
            if (index[trigram]) {
                index[trigram].forEach((match) => {
                    if (!matches.has(match)) {
                        matches.set(match, 0);
                    }
                    const matchPrefix = match.toLowerCase();
                    let extraScore = 1;
                    if (matchPrefix.startsWith(query)) { extraScore = 100; }
                    else if (matchPrefix.indexOf(query) > -1) { extraScore = 50; }
                    // Extra score from matching overlap.
                    let scoreAddition = 5;
                    for (let i = 0; i < query.length; i++) {
                        if (query.charAt(i) === matchPrefix.charAt(i)) {
                            extraScore += scoreAddition;
                        } else {
                            scoreAddition = 1;
                        }
                    }
                    extraScore /= matchPrefix.length;
                    matches.set(match, matches.get(match) + extraScore);
                });
            }
        });
        // Convert matches to an array, sort by score.
        const sortedMatches = Array.from(matches.entries()).sort((a,b) => b[1] - a[1]);
        // Return the top 10 matches.
        return sortedMatches.slice(0, 10).map(m => m[0]);
    }    
};
CityIndex.init();

const SuggestionList = document.createElement('div');
SuggestionList.id = 'suggestions';

function autocomplete(input) {
    let currentSelectionIndex = -1;
    let originalValue = input.value;
    input.addEventListener('input', function () {
        closeList();
        if (!this.value) return;

        const matches = CityIndex.lookup(this.value);
        for (let i=0; i<matches.length; i++) {
            const suggestion = document.createElement('div');
            suggestion.textContent = matches[i];
            
            suggestion.addEventListener('mousedown', function (ev) {
                ev.preventDefault();
                input.value = this.textContent;
                closeList();
                input.blur();
            });
            suggestion.style.cursor = 'pointer';

            SuggestionList.appendChild(suggestion);
        }
        this.parentNode.insertBefore(SuggestionList, this.nextSibling);
    });
    input.addEventListener('focus', function() {
        originalValue = input.value;
        closeList();
    });
    input.addEventListener('blur', function() {
        closeList();
    });
    input.addEventListener('change', function() {
        closeList();
    });
    input.addEventListener('keydown', function(ev) {
        // Use up and down arrow keys to pick the suggestion.
        if (ev.keyCode === 38) {
            ev.preventDefault();
            // Up arrow key.
            if (currentSelectionIndex >= 0) {
                SuggestionList.childNodes[currentSelectionIndex].classList.remove('selected');
                currentSelectionIndex--;
                if (currentSelectionIndex >= 0) {
                    SuggestionList.childNodes[currentSelectionIndex].classList.add('selected');
                    input.value = SuggestionList.childNodes[currentSelectionIndex].textContent;
                }
            }
        } else if (ev.keyCode === 40) {
            ev.preventDefault();
            // Down arrow key.
            if (currentSelectionIndex < SuggestionList.childNodes.length - 1) {
                if (currentSelectionIndex >= 0) {
                    SuggestionList.childNodes[currentSelectionIndex].classList.remove('selected');
                }
                currentSelectionIndex++;
                SuggestionList.childNodes[currentSelectionIndex].classList.add('selected');
                input.value = SuggestionList.childNodes[currentSelectionIndex].textContent;
            }
        } else if (ev.keyCode === 13) {
            // Enter key.
            input.blur();
            closeList();
        } else if(ev.keyCode === 27) {
            // Escape key.
            input.value = originalValue;
            input.blur();
            closeList();
        }
    });

    function closeList() {
        currentSelectionIndex = -1;
        SuggestionList.remove();
        SuggestionList.innerHTML = '';
    }
}
autocomplete(document.getElementById('new-location-name'));
autocomplete(document.getElementById('location'));