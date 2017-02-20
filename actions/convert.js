module.exports = {
    init: init
};

function init(action, utils, config) {
    var options = {
        name: 'convert',
        help: 'Usage: !convert 45 feet to meters. Converts between different units.',
        help_on_empty: true,
    };

    action(options, convert);
}

var units;
var units_regex;
init_units();

function convert(bot, from, to, text, message, utils, config) {
    var result = new RegExp(units_regex).exec(text.toLowerCase());

    if(!result) {
        bot.sayDirect(from, to, 'Incorrect conversion request');
        return;
    }

    var value = Number(result[1]);
    var convertFrom = result[2];
    var convertTo = result[3];

    var foundFrom = null;
    var foundFromBase = null;
    var foundToBase = null;
    var foundTo = null;

    function toString(rgx) {
        if(!rgx) return null;
        var s = rgx.toString();
        return '^(?:' + s.substring(1, s.length - 1) + ')$';
    }

    function foundAll() {
        return foundFrom && foundFromBase && foundToBase && foundTo;
    }

    for(var t in units) {
        var r = new RegExp(toString(t));

        if(r.test(convertFrom)) {
            foundFrom = t;
            foundFromBase = t;
        }
        if(r.test(convertTo)) {
            foundTo = t;
            foundToBase = t;
        }

        for(var t2 in units[t]) {
            r = new RegExp(toString(t2));

            if(!foundFrom && r.test(convertFrom)) {
                foundFrom = t2;
                foundFromBase = t;
            }
            if(!foundTo && r.test(convertTo)) {
                foundTo = t2;
                foundToBase = t;
            }
        }
    }

    function unsupported() {
        bot.sayDirect(from, to, 'Unsupported conversion');
    }

    if(!foundAll()) {
        unsupported();
        return;
    }

    function apply(value, factor, reversed) {
        if(typeof factor === 'function') {
            return factor(value, reversed);
        } else if(reversed) {
            return value / factor;
        } else {
            return value * factor;
        }
    }

    var converted = value;
    if(foundFrom !== foundFromBase) {
        var factor = units[foundFromBase][foundFrom];
        converted = apply(converted, factor, true);
    }

    if(foundFromBase !== foundToBase) {
        var factor = units[foundFromBase][foundToBase];
        if(!factor) {
            unsupported();
            return;
        }
        converted = apply(converted, factor, false);
    }

    if(foundToBase !== foundTo) {
        var factor = units[foundToBase][foundTo];
        converted = apply(converted, factor, false);
    }

    if(utils.globals.exec_context) {
        utils.globals.exec_context['_'] = converted;
    }
    
    bot.sayDirect(from, to, value + ' ' + convertFrom + ' = ' + converted + ' ' + convertTo);
}

function init_units() {
    var inch = /inch(?:es)?/;
    var yard = /yards?/;
    var foot = /f(?:ee|oo)t/;
    var mile = /miles?|mi/;

    var millimeter = /millimet(?:er|re)s?|mm/;
    var centimeter = /centimet(?:er|re)s?|cm/;
    var meter = /met(?:er|re)s?|m/;
    var kilometer = /kilomet(?:er|re)s?|km/;
    var lightyear = /light ?years?|ly/;
    var astronomical = /astronomical units?|au/;
    var parsec = /parsecs?|pc/;

    var teaspoon = /teaspoons?|tsp/;
    var tablespoon = /tablespoons?|tbsp/;
    var flounce = /fluid ounces?|fl ?oz/;
    var cup = /cups?/;
    var pint = /pints?|pt/;
    var quart = /quarts?|qt/;
    var gallon = /gallons?|gal/;

    var cubic_millimeter = /cubic (?:millimet(?:er|re)s?|mm)/;
    var cubic_centimeter = /cubic (?:centimet(?:er|re)s?|cm)/;
    var cubic_meter = /cubic (?:met(?:er|re)s?|m)/;
    var cubic_kilometer = /cubic (?:kilomet(?:er|re)s?|km)/;
    var cubic_lightyear = /cubic (?:light ?years?|ly)/;

    var milliliter = /millilit(?:er|re)s?|ml/;
    var liter = /lit(?:er|re)s?|l/;
    var kiloliter = /kilolit(?:er|re)s?|kl/;

    var ounce = /ounces?|oz/;
    var pound = /pounds?|lbs?/;
    var ton = /tons?/;

    var milligram = /milligrams?|mg/;
    var gram = /grams?|g/;
    var kilogram = /kilograms?|kg/;

    var celsius = /celsius|c/;
    var fahrenheit = /fahrenheit|f/;
    var kelvin = /kelvin|k/;

    var regex = /(-?\d+(?:\.\d+)?) ?/;

    function toString(rgx) {
        var s = rgx.toString();
        return s.substring(1, s.length - 1);
    }

    var unitsRegex = '(' + toString(inch);
    [yard, foot, mile, millimeter, centimeter, meter, kilometer, teaspoon, tablespoon, flounce, cup, pint, quart, gallon, milliliter, liter, kiloliter,
     cubic_millimeter, cubic_centimeter, cubic_meter, cubic_kilometer, cubic_lightyear, ounce, pound, ton, milligram, gram, kilogram, lightyear, astronomical, parsec,
     celsius, fahrenheit, kelvin].forEach(function(t) {
        unitsRegex += '|' + toString(t);
    });
    unitsRegex += ')';

    units_regex = new RegExp('^' + toString(regex) + unitsRegex + ' to ' + unitsRegex + '$');

    units = {};

    units[foot] = {};
    {
        units[foot][inch] = 12.0;
        units[foot][yard] = 3.0;
        units[foot][mile] = 1.0/5280.0;
        units[foot][meter] = 0.3048;
    }

    units[meter] = {};
    {
        units[meter][millimeter] = 1000.0;
        units[meter][centimeter] = 100.0;
        units[meter][kilometer] = 0.001;
        units[meter][foot] = 3.28084;
        units[meter][lightyear] = Number('1.0570008340246154637094605244851E-16');
        units[meter][astronomical] = Number('6.68459e-12');
        units[meter][parsec] = Number('3.24078e-17');
    }

    units[cubic_meter] = {};
    {
        units[cubic_meter][cubic_millimeter] = 1000000000;
        units[cubic_meter][cubic_centimeter] = 1000000;
        units[cubic_meter][cubic_kilometer] = 0.000000001;
        units[cubic_meter][lightyear] = Number('1.18093e-48');
        units[cubic_meter][gallon] = 264.172;
        units[cubic_meter][liter] = 1000.0;
    }

    units[gallon] = {};
    {
        units[gallon][teaspoon] = 768.0;
        units[gallon][tablespoon] = 256.0;
        units[gallon][flounce] = 128.0;
        units[gallon][cup] = 16.0;
        units[gallon][pint] = 8.0;
        units[gallon][quart] = 4.0;
        units[gallon][liter] = 3.78541;
        units[gallon][cubic_meter] = 0.00378541;
    }

    units[liter] = {};
    {
        units[liter][milliliter] = 1000.0;
        units[liter][kiloliter] = 0.001;
        units[liter][gallon] = 0.264172;
        units[liter][cubic_meter] = 0.001;
    }

    units[pound] = {};
    {
        units[pound][ounce] = 16.0;
        units[pound][ton] = 1.0/2000.0;
        units[pound][gram] = 453.592;
    }

    units[gram] = {};
    {
        units[gram][milligram] = 1000.0;
        units[gram][kilogram] = 0.001;
        units[gram][pound] = 0.00220462;
    }

    units[celsius] = {};
    {
        units[celsius][fahrenheit] = function(val, reverse) {
            if(reverse) {
                return (val - 32.0) * 5.0 / 9.0;
            } else {
                return (val * 9.0 / 5.0) + 32.0;
            }
        };
        units[celsius][kelvin] = function(val, reverse) {
            if(reverse) {
                return val - 273.15;
            } else {
                return val + 273.15;
            }
        };
    }
}
