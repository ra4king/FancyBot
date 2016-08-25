FancyBot
========

My fancy IRC bot written in Javascript for NodeJS.

Features so far:
- **!help [command]**
  - prints list of commands or help about particular optionally specified command
- **!reload**
  - *op-only feature:* reloads all action scripts ending in '.js' under 'actions/' folder
- **!ping**
  - responds with pong
- **!notify/tell nick message**
  - notifies the user with message upon activity
- **!calc/eval expression**
  - executes the expression and prints the result
- **!exec code**
  - *op-only feature:* executes javascript code
- **!cal/eval expression**
  - *op-only feature:* executes javascript expression and prints the result
- **!blacklist list|add URL [URL...] |remove URL [URL...]**
  - *op-only feature:* manages blacklist of title grabber
- **!lastseen nick**
  - prints how long ago the user was seen and their last message
- **!convert value fromUnit to toUnit**
  - converts between units
- **!money amount fromCurr to toCurr**
  - converts between currencies
- **!eightball/8ball question**
  - returns a magic response to a yes/no question
- **!slap nick [message]**
  - slaps the specified nick with a predefined message or optionally specified message
- **!Usage: !slapmsg list|add|remove message**
  - Adds a slap message to be used next time someone is slapped.
- **!joke [add joke|remove joke]**
  - With no arguments, prints random stored joke. With add/remove, manage stored joke list.
- **!makemeasandwich**
  - Will randomly provide a delicious sandwich
- **!quote nick [new quote]**
  - If quote ommitted, prints random saved quote for nick. Otherwise stores new quote for nick.
- **!unquote nick quote**
  - Removes closest matching quote for nick.

All action functions are provided a bot object. More information on the object can be found here: http://node-irc.readthedocs.io/  
Additional functions available:
- bot.sayDirect(from, to, text): If the 'to' is the channel, the 'from' nick is prepended to the message text. Otherwise, it is pm-ed to the user.
  - from: the command issuer
  - to: the target of the command, which is provided to action function
  - text: the text to output

An example of how to write an action script is provided in actions/example.js-off. All scripts ending with '.js' are automatically loaded upon startup or !reload.
