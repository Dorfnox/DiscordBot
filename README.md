# WaffleBot

A Discord Bot that scrapes stats.gats.io for stats, plays music, and does other cool things!

## Features

### Gats Stats!

> Scrapes https://stats.gats.io/ and can return most of it's data! Examples of queries look like:
> `waffle playerstats dorfnox`,
> `w ps MEADOWVOID`,
> `🧇 clanstats KCSS`,
> `w best snipers`,
> `w top kills`,
> `w best clan kills per member`,
> `w top5` (Daily Leaderboard on Gats.io!).

### Music!

> Plays and queues up to 12 songs (currently - more server-configs available in future!)

### WaffleMail

> DM WaffleBot to open a channel directly to staff of a server. Better than receiving individual pings from members!

### WaffleBomber

> Tired of finessing your admin rights for bots to not show up in a channel? Activate the WaffleBomber using `w screwbots` to hire the wafflebomber to destroy all other bot messsages clogging up a channel

### ... And Plenty More Features

> Try `w help` for a list of other features. For example, `w help music` will give you a list of music commands!

## Getting Started

### Downloading

```
git clone https://github.com/Dorfnox/DiscordBot.git
```

### Installing

Steps taken to achieve clean install:

1. Remove nvm file `rm -rf ~/.nvm` and `brew uninstall nvm` (if using brew)
2. Install nvm `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.36.0/install.sh | bash`
3. Add to ~/.zshrc (or to your appropriate profile file)
   ```
   export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
   ```
4. Install latest npm `npm install -g npm@latest`

#### configWaffleBot.json

Rename `configWaffleBotExample.json` to `configWaffleBot.json`, and add your bot's token to the `init.token` field.

If you want to enable features that require saving user data, create a MongoDB account and add the details to the config file under `mongoDB`. The following features require a database to access:

### Running

Simply run `node .`. If running asynchronously, or on server, you can use `./start.sh async`.

## Author

- **Brendan Pierce** - _WaffleBot Creator_ - [Brendan Pierce](https://github.com/Dorfnox/)

## License

MIT License.

## Acknowledgments

None as of yet!
