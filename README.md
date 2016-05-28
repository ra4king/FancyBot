FancyBot
========

My fancy IRC bot written in Javascript for NodeJS.

Features so far:
- **!help [command]**
  - prints list of commands or help about particular optionally specified command
- **!ping**
  - responds with pong
- **!notify/tell nick message**
  - notifies the user with message upon activity
- **!calc/eval expression**
  - executes the expression and prints the result
- **!exec code**
  - *op-only feature:* executes javascript code and prints the output
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
- **!slapmsg message**
  - *op-only feature:* adds message as a predefined message for slap command
